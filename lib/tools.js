'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { APP_ROOT } = require('./config');
const store = require('./store');
const filesLib = require('./files');
const { extensionTools } = require('./extensions');
const { nowIso, shortId, safeResolve, truncate } = require('./util');

const MAX_OUTPUT = 20000;

function listAllTools({ enabledOnly = false } = {}) {
  const state = store.getState();
  const local = (state.tools || []).filter((tool) => !enabledOnly || tool.enabled !== false);
  const extension = extensionTools().filter((tool) => !enabledOnly || tool.enabled !== false);
  const seen = new Set();
  const result = [];
  for (const tool of [...local, ...extension]) {
    if (seen.has(tool.name)) continue;
    seen.add(tool.name);
    result.push(tool);
  }
  return result;
}

function findTool(nameOrId) {
  return listAllTools().find((tool) => tool.id === nameOrId || tool.name === nameOrId) || null;
}

function fillTemplate(template, args, encode) {
  return String(template || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    const value = args[key] == null ? '' : String(args[key]);
    return encode ? encodeURIComponent(value) : value;
  });
}

function parseArgs(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function withinAppSource(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/');
  if (normalized.startsWith('data/') || normalized.startsWith('.runtime/') || normalized.startsWith('release/')) {
    return false;
  }
  if (normalized.startsWith('node_modules/')) return false;
  const allowedRoots = ['public/', 'lib/', 'docs/', 'desktop/', 'assets/', 'scripts/'];
  if (allowedRoots.some((root) => normalized.startsWith(root))) return true;
  return ['server.js', 'package.json', 'README.md', '.gitignore'].includes(normalized);
}

function clip(text) {
  const value = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  return truncate(value == null ? '' : value, MAX_OUTPUT);
}

async function runBuiltin(tool, args, ctx) {
  const handler = tool.handler;
  const root = ctx.root;
  if (handler === 'list_files') {
    if (!root) throw new Error('当前没有可操作的工作目录');
    const entries = await filesLib.listTree(root, { maxEntries: 600 });
    const filtered = args.subdir
      ? entries.filter((entry) => entry.path === args.subdir || entry.path.startsWith(`${args.subdir}/`))
      : entries;
    return filtered.map((entry) => `${entry.type === 'dir' ? '[D]' : '[F]'} ${entry.path} (${entry.size} B)`).join('\n');
  }
  if (handler === 'read_file') {
    if (!root) throw new Error('当前没有可操作的工作目录');
    if (!args.path) throw new Error('缺少参数 path');
    const file = await filesLib.readTextFile(root, args.path);
    if (file.binary) return `[二进制文件] ${file.path}，${file.size} 字节`;
    return `文件：${file.path}\n大小：${file.size} B${file.truncated ? '（已截断）' : ''}\n\n${file.content}`;
  }
  if (handler === 'write_file') {
    if (!root) throw new Error('当前没有可操作的工作目录');
    if (!args.path) throw new Error('缺少参数 path');
    if (typeof args.content !== 'string') throw new Error('缺少参数 content');
    const written = await filesLib.writeProjectFile(root, args.path, args.content);
    return `已写入 ${written.path}（${written.bytes} 字节）`;
  }
  if (handler === 'fetch_url') {
    const url = String(args.url || '');
    if (!/^https?:\/\//i.test(url)) throw new Error('只支持 http/https 地址');
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DeepSeek-Harness-Console/1.0', Accept: 'text/html,application/json,text/plain,*/*' },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    return `HTTP ${res.status} ${res.statusText}\n${clip(text)}`;
  }
  if (handler === 'current_time') {
    return JSON.stringify(
      {
        iso: nowIso(),
        local: new Date().toLocaleString('zh-CN'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      null,
      2
    );
  }
  if (handler === 'self_list_files' || handler === 'self_read_file') {
    if (handler === 'self_list_files') {
      const entries = await filesLib.listTree(APP_ROOT, { maxEntries: 900 });
      return entries
        .filter((entry) => withinAppSource(entry.path))
        .map((entry) => `${entry.type === 'dir' ? '[D]' : '[F]'} ${entry.path} (${entry.size} B)`)
        .join('\n');
    }
    const rel = String(args.path || '');
    if (!withinAppSource(rel)) throw new Error('只允许读取控制台自身的源码文件');
    const file = await filesLib.readTextFile(APP_ROOT, rel);
    if (file.binary) return `[二进制文件] ${file.path}`;
    return `文件：${file.path}\n\n${file.content}`;
  }
  throw new Error(`未知的内置工具处理器：${handler}`);
}

async function runHttp(tool, args) {
  const config = tool.config || {};
  if (!config.url) throw new Error('HTTP 工具缺少 URL');
  const url = fillTemplate(config.url, args, false);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL 无效');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('只支持 http/https');
  const method = String(config.method || 'GET').toUpperCase();
  const headers = {};
  let headerInput = config.headers || {};
  if (typeof headerInput === 'string') {
    try {
      headerInput = JSON.parse(headerInput);
    } catch {
      headerInput = {};
    }
  }
  for (const [key, value] of Object.entries(headerInput || {})) {
    headers[key] = fillTemplate(value, args, false);
  }
  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    body = config.body ? fillTemplate(config.body, args, false) : JSON.stringify(args);
    if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json';
  }
  const timeout = Math.min(60_000, Math.max(1000, Number(config.timeout) || 20_000));
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  return `HTTP ${res.status} ${res.statusText}\n${clip(text)}`;
}

function runCommand(tool, args, ctx) {
  const config = tool.config || {};
  const command = fillTemplate(config.command || '', args, false).trim();
  if (!command) throw new Error('命令工具缺少 command');
  const cwd = ctx.root && fs.existsSync(ctx.root) ? ctx.root : APP_ROOT;
  const timeout = Math.min(120_000, Math.max(2000, Number(config.timeout) || 30_000));
  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', ['/d', '/s', '/c', command], {
      cwd,
      windowsHide: true,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    }, timeout);
    child.stdout.on('data', (chunk) => {
      if (stdout.length < 200_000) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 200_000) stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const output = `退出码：${code}${killed ? '（超时已终止）' : ''}\n\n${stdout}${stderr ? `\n[stderr]\n${stderr}` : ''}`;
      resolve(clip(output));
    });
  });
}

async function runExtension(tool, args, ctx) {
  if (typeof tool.execute !== 'function') throw new Error('扩展工具缺少 execute');
  const result = await tool.execute(args, { ...ctx, state: store.getState() });
  return clip(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
}

async function executeTool({ tool, args, ctx }) {
  const startedAt = Date.now();
  const parsedArgs = parseArgs(args);
  let ok = true;
  let output = '';
  let error = '';
  try {
    if (tool.type === 'builtin') output = await runBuiltin(tool, parsedArgs, ctx);
    else if (tool.type === 'http') output = await runHttp(tool, parsedArgs);
    else if (tool.type === 'command') output = await runCommand(tool, parsedArgs, ctx);
    else if (tool.type === 'extension') output = await runExtension(tool, parsedArgs, ctx);
    else throw new Error(`不支持的工具类型：${tool.type}`);
  } catch (err) {
    ok = false;
    error = err.message || String(err);
    output = `执行失败：${error}`;
  }
  const durationMs = Date.now() - startedAt;
  const state = store.getState();
  const record = {
    id: shortId(4),
    toolId: tool.id,
    name: tool.name,
    label: tool.label || tool.name,
    ok,
    error,
    args: parsedArgs,
    output: truncate(output, 8000),
    durationMs,
    projectId: ctx.project?.id || null,
    taskId: ctx.task?.id || null,
    scope: ctx.scope || 'workspace',
    createdAt: nowIso(),
  };
  state.toolRuns.unshift(record);
  state.toolRuns = state.toolRuns.slice(0, 150);
  await store.persist();
  return { ...record, output: truncate(output, MAX_OUTPUT) };
}

function parseToolBlocks(raw) {
  const text = String(raw || '');
  const re = /<<<TOOL\s+name\s*=\s*["']([^"']+)["']\s*>>>\r?\n?([\s\S]*?)<<<END\s*TOOL\s*>>>/g;
  const calls = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const name = match[1].trim();
    const rawArgs = match[2].trim();
    let args = {};
    try {
      args = JSON.parse(rawArgs);
    } catch {
      args = { input: rawArgs };
    }
    calls.push({ id: shortId(4), name, args, rawArgs });
  }
  return calls;
}

function stripToolBlocks(text) {
  return String(text || '')
    .replace(/<<<TOOL\s+name\s*=\s*["'][^"']+["']\s*>>>\r?\n?[\s\S]*?<<<END\s*TOOL\s*>>>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatToolResult(call, run) {
  return `工具 ${call.name} 执行结果（${run.ok ? '成功' : '失败'}）：\n\n${run.output}`;
}

module.exports = {
  listAllTools,
  findTool,
  executeTool,
  parseToolBlocks,
  stripToolBlocks,
  formatToolResult,
  parseArgs,
};
