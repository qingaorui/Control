'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { APP_ROOT, DATA_DIR } = require('./config');
const store = require('./store');
const filesLib = require('./files');
const { extensionSkills, extensionTools } = require('./extensions');
const { nowIso } = require('./util');

const UPDATES_DIR = path.join(DATA_DIR, 'self-updates');
const CURRENT_DIR = path.join(UPDATES_DIR, 'current');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const ALLOWED_EXACT = new Set([
  'server.js',
  'package.json',
  'README.md',
  '.gitignore',
]);
const ALLOWED_ROOTS = ['public/', 'lib/', 'docs/', 'desktop/', 'assets/', 'scripts/'];

function isAllowedPath(relPath) {
  const normalized = String(relPath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) return false;
  if (ALLOWED_EXACT.has(normalized)) return true;
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}

function systemPrompt() {
  return `你是 DeepSeek Harness 控制台的「维护工程师」。用户会和你讨论如何改进这个控制台本身。

## 你的职责
- 理解需求，定位到具体文件，给出最小、可维护的改动。
- 只修改控制台自身的源码；不要修改用户数据（data/）、构建产物（release/）或 node_modules。
- 保持现有接口、数据结构和 UI 路由兼容；新增能力优先通过扩展接口实现。

## 当前架构
- server.js：零依赖 HTTP 服务、API、SSE 流、文件落盘、静态资源。
- lib/config.js：配置与数据目录；lib/store.js：JSON 持久化。
- lib/prompts.js：需求分析师 / 执行工程师 / 任务模式提示词。
- lib/agent.js：记忆、技能、工具注入；lib/memory.js：长期记忆提取。
- lib/tools.js：工具执行；lib/extensions.js：data/extensions 下的扩展加载器。
- lib/management.js：软件管理暂存与应用。
- public/：原生 HTML/CSS/JS 界面；desktop/：WinForms + WebView2 外壳。
- docs/EXTENDING.md：扩展接口说明。

## 输出规则
1. 先用 3–6 条要点说明改动方案、影响范围和风险。
2. 修改文件使用完整文件块：
<<<FILE path="相对路径">>>
完整文件内容
<<<END FILE>>>
3. 只允许修改：public/、lib/、docs/、desktop/、scripts/、vendor/、server.js、electron-main.js、package.json、README.md。
4. 改动不会立即生效：会先写入暂存区，由用户确认「应用更新」后覆盖源码，重启应用生效。
5. 不要输出破坏兼容性的重写；不确定时先读代码再改。
6. 最后用「## 验证方式」说明如何验证，并注明是否需要重启。

## 可以使用的工具
需要查看源码时，请求 self_list_files 或 self_read_file；用户会批准执行并把结果发回。
调用格式：
<<<TOOL name="self_read_file">>>
{"path":"server.js"}
<<<END TOOL>>>
不要编造没有读到的代码。`;
}

function clearCurrent() {
  fs.rmSync(CURRENT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CURRENT_DIR, { recursive: true });
}

async function stageFiles(files) {
  clearCurrent();
  const staged = [];
  const errors = [];
  for (const file of files.slice(0, 40)) {
    const rel = file.path.replace(/\\/g, '/');
    if (!isAllowedPath(rel)) {
      errors.push({ path: rel, message: '该路径不允许由软件管理修改' });
      continue;
    }
    try {
      const result = await filesLib.writeProjectFile(CURRENT_DIR, rel, file.content);
      staged.push({ ...result, updatedAt: nowIso() });
    } catch (err) {
      errors.push({ path: rel, message: err.message });
    }
  }
  const state = store.getState();
  const batch = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  state.management.batch = batch;
  state.management.staged = staged;
  state.management.updatedAt = nowIso();
  store.persist();
  return { staged, errors, batch };
}

function discardStaged() {
  clearCurrent();
  const state = store.getState();
  state.management.staged = [];
  state.management.batch = null;
  store.persist();
  return { ok: true };
}

function applyStaged() {
  const state = store.getState();
  const staged = state.management.staged || [];
  if (!staged.length) throw new Error('暂存区为空');
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const backupDir = path.join(BACKUPS_DIR, stamp);
  const applied = [];
  const errors = [];

  for (const file of staged) {
    const rel = String(file.path || '').replace(/\\/g, '/');
    if (!isAllowedPath(rel)) {
      errors.push({ path: rel, message: '路径不在允许范围内' });
      continue;
    }
    try {
      const source = path.join(CURRENT_DIR, ...rel.split('/'));
      const target = path.resolve(APP_ROOT, ...rel.split('/'));
      if (!target.startsWith(path.resolve(APP_ROOT) + path.sep)) throw new Error('目标路径越界');
      if (!fs.existsSync(source)) throw new Error('暂存文件不存在');
      if (fs.existsSync(target)) {
        const backup = path.join(backupDir, ...rel.split('/'));
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        fs.copyFileSync(target, backup);
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      applied.push({ path: rel, bytes: fs.statSync(target).size });
    } catch (err) {
      errors.push({ path: rel, message: err.message });
    }
  }

  if (applied.length) {
    state.management.staged = [];
    state.management.batch = null;
    state.management.appliedAt = nowIso();
    state.management.applied = applied;
    store.persist();
    clearCurrent();
  }
  return {
    applied,
    errors,
    backupDir: fs.existsSync(backupDir) ? backupDir : null,
    restartRequired: applied.length > 0,
  };
}

function stagedInfo() {
  const state = store.getState();
  return {
    batch: state.management.batch,
    staged: state.management.staged || [],
    appliedAt: state.management.appliedAt || null,
    applied: state.management.applied || [],
    dir: CURRENT_DIR,
  };
}

function systemInfo() {
  const state = store.getState();
  const counts = {
    projects: state.projects.length,
    tasks: state.tasks.length,
    memories: state.memories.length,
    skills:
      state.skills.filter((s) => s.enabled !== false).length +
      extensionSkills().filter((s) => s.enabled !== false).length,
    tools:
      state.tools.filter((t) => t.enabled !== false).length +
      extensionTools().filter((t) => t.enabled !== false).length,
    messages: state.management.messages.length,
  };
  return {
    version: '1.0.0',
    appRoot: APP_ROOT,
    dataDir: DATA_DIR,
    extensionsDir: path.join(DATA_DIR, 'extensions'),
    updatesDir: UPDATES_DIR,
    allowedPaths: [...ALLOWED_EXACT, ...ALLOWED_ROOTS],
    endpoints: [
      'GET/POST /api/memory',
      'PATCH/DELETE /api/memory/:id',
      'GET/POST /api/agent',
      'GET/POST /api/skills',
      'GET/POST /api/tools',
      'POST /api/tools/run',
      'GET/POST /api/management',
      'POST /api/management/apply',
      'POST /api/management/discard',
      'POST /api/workspace/open',
      'GET /api/extensions',
    ],
    counts,
    staged: stagedInfo(),
  };
}

module.exports = {
  UPDATES_DIR,
  CURRENT_DIR,
  isAllowedPath,
  systemPrompt,
  stageFiles,
  discardStaged,
  applyStaged,
  stagedInfo,
  systemInfo,
};
