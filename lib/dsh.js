'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

let cachedBin;
let cachedAt = 0;

function findDsh() {
  const now = Date.now();
  if (cachedBin !== undefined && now - cachedAt < 5000) return cachedBin;
  cachedAt = now;

  const candidates = [];
  const fromEnv = String(process.env.DSH_CLI || '').trim();
  if (fromEnv) {
    candidates.push(fromEnv);
    if (fs.existsSync(fromEnv) && fs.statSync(fromEnv).isDirectory()) {
      candidates.push(path.join(fromEnv, 'lib', 'bin.js'));
      candidates.push(path.join(fromEnv, 'bin.js'));
    }
  }

  const appData = process.env.APPDATA;
  if (appData) {
    candidates.push(
      path.join(appData, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    );
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    candidates.push(
      path.join(localAppData, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    );
  }
  const programFiles = process.env.ProgramFiles;
  if (programFiles) {
    candidates.push(
      path.join(programFiles, 'nodejs', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    );
  }
  const pathDirs = String(process.env.PATH || '').split(path.delimiter);
  for (const dir of pathDirs) {
    if (!dir) continue;
    candidates.push(
      path.join(dir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    );
  }

  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        cachedBin = candidate;
        return cachedBin;
      }
    } catch {
      /* ignore */
    }
  }
  cachedBin = null;
  return cachedBin;
}

function available() {
  return Boolean(findDsh());
}

function credentialsPath() {
  const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || '', '.dsh');
  return path.join(home, '.credentials.yaml');
}

function hasCredentials() {
  try {
    return fs.existsSync(credentialsPath());
  } catch {
    return false;
  }
}

function describe() {
  const bin = findDsh();
  if (!bin) return { available: false, bin: null, credentials: false };
  return { available: true, bin, credentials: hasCredentials() };
}

function buildTask(messages) {
  const system = (messages || [])
    .filter((message) => message.role === 'system')
    .map((message) => String(message.content || ''))
    .filter(Boolean)
    .join('\n\n');
  const transcript = (messages || [])
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role || 'user'}: ${String(message.content || '')}`)
    .join('\n\n');

  return [
    '你正在通过本机已安装的 DeepSeek Harness 作为应用内对话后端。',
    '只输出下一条助手回复的正文。不要调用工具，不要修改文件，不要执行命令。',
    '如果系统要求输出文件块或工具块，请按原格式放在正文中。',
    '',
    '=== 系统要求 ===',
    system || '(无)',
    '',
    '=== 对话记录 ===',
    transcript || '(无)',
    '',
    '=== 下一条助手回复 ===',
  ].join('\n');
}

function cleanError(value) {
  return String(value || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/^dsh:\s*/gm, '')
    .trim();
}

async function* streamChat({ messages, signal, cwd }) {
  const bin = findDsh();
  if (!bin) {
    throw new Error(
      '未检测到已安装的 DeepSeek Harness（dsh）。请先安装 dsh，或在设置中切换为 DeepSeek API。'
    );
  }
  if (signal?.aborted) throw abortError();

  const prompt = buildTask(messages);
  const workdir = cwd && fs.existsSync(cwd) ? cwd : process.cwd();
  let child;
  try {
    child = spawn(process.execPath, [bin, '--profile', 'headless', '--json', '-'], {
      cwd: workdir,
      env: { ...process.env },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(
      `无法启动已安装的 DeepSeek Harness（${bin}）：${err.message}。` +
        '如果应用是从受限环境启动的，请从桌面快捷方式正常启动后再试。'
    );
  }

  let stderr = '';
  let emitted = false;
  let finalText = '';
  let errorText = '';
  const textParts = [];
  let spawnError = null;

  const closed = new Promise((resolve) => {
    child.on('close', (code, reason) => resolve({ code, reason }));
    child.on('error', (err) => {
      spawnError = err;
      resolve({ code: -1, reason: 'error' });
    });
  });

  const abort = () => {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
  };
  if (signal) signal.addEventListener('abort', abort, { once: true });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
    if (stderr.length > 12000) stderr = stderr.slice(-12000);
  });
  child.stdin.on('error', () => {});
  try {
    child.stdin.end(prompt);
  } catch {
    /* ignore */
  }

  try {
    const lines = readline.createInterface({ input: child.stdout });
    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (event.type === 'text' && event.text) {
        // `text` events are committed messages but individual fields are
        // capped at 8 KiB. Keep them only as a fallback; the uncapped `final`
        // event carries the complete answer.
        textParts.push(String(event.text));
      } else if (event.type === 'thinking' && event.text) {
        yield { type: 'reasoning', text: String(event.text) };
      } else if (event.type === 'final' && typeof event.text === 'string') {
        finalText = event.text;
      } else if (event.type === 'error') {
        errorText = String(event.message || event.error || '本机 DeepSeek Harness 返回错误');
      }
    }

    const result = await closed;
    if (signal?.aborted) throw abortError();
    if (spawnError) throw new Error(`无法启动已安装的 DeepSeek Harness：${spawnError.message}`);
    if (finalText) {
      emitted = true;
      yield { type: 'content', text: finalText };
    } else if (textParts.length) {
      emitted = true;
      yield { type: 'content', text: textParts.join('') };
    }
    if (!emitted) {
      const detail = cleanError(errorText) || cleanError(stderr);
      throw new Error(detail || `本机 DeepSeek Harness 没有返回内容（退出码 ${result.code}）`);
    }
  } finally {
    if (signal) signal.removeEventListener('abort', abort);
    if (!child.killed && child.exitCode === null) {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    }
    try {
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
    } catch {
      /* ignore */
    }
  }
}

function abortError() {
  const err = new Error('生成已中断');
  err.name = 'AbortError';
  return err;
}

function status() {
  const info = describe();
  if (!info.available) {
    return { ok: false, dsh: false, message: '未检测到已安装的 dsh' };
  }
  if (!info.credentials) {
    return {
      ok: false,
      dsh: true,
      message: `已检测到 dsh，但还没有找到 DSH 凭据（${credentialsPath()}）。请先在 DeepSeek Harness 中登录或配置模型。`,
    };
  }
  return {
    ok: true,
    dsh: true,
    message: '已检测到本机 DeepSeek Harness（dsh headless），对话将使用它的模型与登录状态',
  };
}

module.exports = {
  available,
  describe,
  status,
  findDsh,
  credentialsPath,
  hasCredentials,
  buildTask,
  streamChat,
};
