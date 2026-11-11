'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const dsh = require('./dsh');

const DATA_DIR = process.env.DSH_DATA_DIR
  ? path.resolve(process.env.DSH_DATA_DIR)
  : path.join(__dirname, '..', 'data');
const GLOBAL_DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const HOME_ROOT = path.join(DATA_DIR, 'dsh-web');

const instances = new Map();
const pending = new Map();

function freePort(start = 43300) {
  return new Promise((resolve, reject) => {
    let port = start;
    const tryPort = () => {
      if (port > start + 80) {
        reject(new Error('没有找到可用的本地端口'));
        return;
      }
      const server = net.createServer();
      server.unref();
      server.on('error', () => {
        port += 1;
        tryPort();
      });
      server.listen(port, '127.0.0.1', () => {
        const chosen = port;
        server.close(() => resolve(chosen));
      });
    };
    tryPort();
  });
}

function stripAnsi(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function copyIfExists(source, target) {
  try {
    if (!fs.existsSync(source)) return;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  } catch {
    /* ignore */
  }
}

function linkModules(target, linkPath) {
  try {
    if (!fs.existsSync(target) || fs.existsSync(linkPath)) return;
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    fs.symlinkSync(target, linkPath, 'junction');
  } catch {
    /* ignore */
  }
}

function minimalPatch() {
  return `# Isolated DSH Web home created by DeepSeek Harness Console.
- id: agent-default-model
  name: "@deepseek-ai/dsh-agent-default-model"
  config:
    provider: deepseek-official
    model: deepseek-flash
    reasoningEffort: high
`;
}

function writeWorkspace(home, { rootId, rootName, rootDir }) {
  const file = path.join(home, 'storages', 'workspace.json');
  let id = '';
  try {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ids = existing?.global?.workspaceIds || [];
    const first = ids[0] || Object.keys(existing?.tables?.workspaces || {})[0];
    if (first) id = String(first);
  } catch {
    /* create new */
  }
  if (!id) id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record = {
    path: rootDir,
    title: rootName || path.basename(rootDir),
    sessionIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const payload = {
    unit: { name: 'workspace', version: 2 },
    global: {
      initialized: true,
      workspaceIds: [id],
      archivedSessionIds: [],
      pinnedSessionIds: [],
    },
    tables: { workspaces: { [id]: record } },
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
}

function ensureHome({ rootId, rootName, rootDir }) {
  const id = String(rootId || path.basename(rootDir) || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const home = path.join(HOME_ROOT, id);
  fs.mkdirSync(path.join(home, 'profiles', 'web'), { recursive: true });
  fs.mkdirSync(path.join(home, 'storages'), { recursive: true });

  copyIfExists(
    path.join(GLOBAL_DSH_HOME, '.credentials.yaml'),
    path.join(home, '.credentials.yaml')
  );

  const sourceProfile = path.join(GLOBAL_DSH_HOME, 'profiles', 'web');
  for (const name of ['cordis.yml', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    copyIfExists(path.join(sourceProfile, name), path.join(home, 'profiles', 'web', name));
  }
  fs.writeFileSync(
    path.join(home, 'profiles', 'web', 'cordis.patch.yml'),
    minimalPatch(),
    'utf8'
  );

  linkModules(
    path.join(GLOBAL_DSH_HOME, 'profiles', 'node_modules'),
    path.join(home, 'profiles', 'node_modules')
  );
  linkModules(
    path.join(sourceProfile, 'node_modules'),
    path.join(home, 'profiles', 'web', 'node_modules')
  );

  writeWorkspace(home, { rootId: id, rootName, rootDir });
  return home;
}

function start({ cwd, key, home }) {
  const bin = dsh.findDsh();
  if (!bin) {
    throw new Error(
      '未检测到已安装的 DeepSeek Harness（dsh）。请先安装 DSH，或在设置中改用控制台对话页。'
    );
  }
  const workdir = cwd && fs.existsSync(cwd) ? cwd : process.cwd();
  return freePort().then(
    (port) =>
      new Promise((resolve, reject) => {
        let child;
        try {
          const env = { ...process.env };
          if (home) env.DSH_HOME = home;
          child = spawn(
            process.execPath,
            [bin, '--profile', 'web', '--no-open', '--port', String(port)],
            {
              cwd: workdir,
              env,
              windowsHide: true,
              stdio: ['ignore', 'pipe', 'pipe'],
            }
          );
        } catch (err) {
          reject(new Error(`无法启动本地 DSH 浏览器：${err.message}`));
          return;
        }

        let output = '';
        let settled = false;
        const finish = (err, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (err) reject(err);
          else resolve(value);
        };
        const timer = setTimeout(() => {
          try {
            child.kill();
          } catch {
            /* ignore */
          }
          finish(
            new Error(
              `本地 DSH Web 启动超时。\r\n${stripAnsi(output).slice(-1600)}`
            )
          );
        }, 45000);

        const inspect = (chunk) => {
          output += chunk.toString('utf8');
          const match = stripAnsi(output).match(/dsh web:\s*(https?:\/\/[^\s]+)/i);
          if (!match) return;
          const url = match[1].replace(/[\r\n]+$/, '');
          const instance = { child, url, port, key, cwd: workdir, home: home || '' };
          instances.set(key, instance);
          finish(null, instance);
        };
        child.stdout.on('data', inspect);
        child.stderr.on('data', inspect);
        child.on('error', (err) => {
          finish(new Error(`无法启动本地 DSH 浏览器：${err.message}`));
        });
        child.on('exit', (code) => {
          if (!settled) {
            finish(
              new Error(
                `本地 DSH Web 提前退出（代码 ${code}）。\r\n${stripAnsi(output).slice(-1600)}`
              )
            );
          }
          const current = instances.get(key);
          if (current && current.child === child) instances.delete(key);
        });
      })
  );
}

async function ensure({ cwd, key, rootId, rootName }) {
  const resolved = cwd && fs.existsSync(cwd) ? path.resolve(cwd) : process.cwd();
  const id = key || resolved;
  const existing = instances.get(id);
  if (existing && existing.child.exitCode === null) {
    return {
      url: existing.url,
      port: existing.port,
      cwd: existing.cwd,
      reused: true,
      isolated: Boolean(existing.home),
    };
  }
  if (pending.has(id)) return pending.get(id);
  const home = rootId ? ensureHome({ rootId, rootName, rootDir: resolved }) : null;
  const promise = start({ cwd: resolved, key: id, home })
    .then((instance) => ({
      url: instance.url,
      port: instance.port,
      cwd: instance.cwd,
      reused: false,
      isolated: Boolean(home),
    }))
    .finally(() => pending.delete(id));
  pending.set(id, promise);
  return promise;
}

function stopAll() {
  for (const instance of instances.values()) {
    try {
      instance.child.kill();
    } catch {
      /* ignore */
    }
  }
  instances.clear();
  pending.clear();
}

module.exports = { ensure, ensureHome, stopAll, freePort };
