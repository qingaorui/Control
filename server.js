'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { URL } = require('node:url');

const { APP_ROOT, DATA_DIR, getConfig, updateConfig, publicConfig } = require('./lib/config');
const store = require('./lib/store');
const filesLib = require('./lib/files');
const prompts = require('./lib/prompts');
const { chatStream, isDemo, testConnection } = require('./lib/provider');
const { demoReply } = require('./lib/demo');
const memoryLib = require('./lib/memory');
const toolsLib = require('./lib/tools');
const agentLib = require('./lib/agent');
const management = require('./lib/management');
const extensions = require('./lib/extensions');
const dshWeb = require('./lib/dsh-web');
const { nowIso, slugify, shortId } = require('./lib/util');

const HOST = '127.0.0.1';
const PORT = Number(process.env.DSH_CONSOLE_PORT) || 4180;
const PUBLIC_DIR = path.join(APP_ROOT, 'public');
const VERSION = '1.0.0';

const locks = new Set();
const activeStreams = new Set();
const memoryCooldowns = new Map();

function maybeExtractMemories(options, force = false) {
  const cfg = getConfig();
  if (cfg.autoMemory === false && !force) return;
  const key = options.project?.id || options.task?.id || 'management';
  const now = Date.now();
  const last = memoryCooldowns.get(key) || 0;
  if (!force && now - last < 45_000) return;
  memoryCooldowns.set(key, now);
  memoryLib
    .extractMemories({ ...options, force })
    .catch((err) => console.warn('[memory]', err.message));
}

function composeSystem(base, ctx) {
  return agentLib.composeSystem(base, ctx);
}

function parseToolCalls(raw) {
  try {
    return toolsLib.parseToolBlocks(raw);
  } catch {
    return [];
  }
}

function safeToolContext({ projectId, taskId, scope }) {
  if (scope === 'self' || projectId === 'self') {
    return { root: APP_ROOT, scope: 'self' };
  }
  if (projectId) {
    const project = store.projectById(projectId);
    if (!project) throw new Error('项目不存在');
    return { root: project.dir, scope: 'project', project };
  }
  if (taskId) {
    const task = store.taskById(taskId);
    if (!task) throw new Error('任务不存在');
    return { root: task.dir, scope: 'task', task };
  }
  return { root: APP_ROOT, scope: 'self' };
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

async function readJson(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('请求体不是合法 JSON');
  }
}

function acquire(key) {
  if (locks.has(key)) return false;
  locks.add(key);
  return true;
}

function release(key) {
  locks.delete(key);
}

function sseSend(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`);
  } catch {
    /* client gone */
  }
}

function sseStart(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
}

function resolveProjectsDir(root) {
  const correct = path.join(root, 'xiangmu');
  const literal = path.join(root, 'xaingmu');
  // Reuse an existing project folder before creating a new spelling.
  if (fs.existsSync(correct)) return correct;
  if (fs.existsSync(literal)) return literal;
  return literal;
}

async function rootInfo() {
  const cfg = getConfig();
  const preferred = path.resolve(cfg.projectRoot);
  const candidates = [
    preferred,
    path.join(os.homedir(), 'dscontrol'),
    path.join(DATA_DIR, 'dscontrol'),
    path.join(APP_ROOT, 'dscontrol'),
  ];
  const seen = new Set();
  let preferredError = '';

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    const key = resolved.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await fs.promises.mkdir(resolved, { recursive: true });
      // access(W_OK) can report success while a sandbox/ACL blocks actual writes.
      // Probe with a real file before declaring the directory writable.
      const probe = path.join(resolved, `.dsh-write-test-${process.pid}-${Date.now()}`);
      await fs.promises.writeFile(probe, 'ok', 'utf8');
      await fs.promises.unlink(probe);
      const projectsDir = resolveProjectsDir(resolved);
      const tasksDir = path.join(resolved, 'renwu');
      await fs.promises.mkdir(projectsDir, { recursive: true });
      await fs.promises.mkdir(tasksDir, { recursive: true });
      if (resolved === preferred) {
        return {
          path: resolved,
          preferred,
          projectsDir,
          tasksDir,
          writable: true,
          fallback: false,
          error: '',
        };
      }
      return {
        path: resolved,
        preferred,
        projectsDir,
        tasksDir,
        writable: true,
        fallback: true,
        error: `原目录不可写：${preferred}${preferredError ? `（${preferredError}）` : ''}`,
      };
    } catch (err) {
      if (resolved === preferred) {
        preferredError =
          err.code === 'EACCES' || err.code === 'EPERM'
            ? '当前进程没有写入权限'
            : err.message;
      }
    }
  }

  return {
    path: preferred,
    preferred,
    projectsDir: resolveProjectsDir(preferred),
    tasksDir: path.join(preferred, 'renwu'),
    writable: false,
    fallback: false,
    error: preferredError || '没有找到可写的项目目录',
  };
}

async function ensureProjectRoot() {
  const info = await rootInfo();
  if (!info.writable) {
    throw new Error(`项目根目录不可写：${info.path}。${info.error}`);
  }
  return info;
}

function projectStatus(project, fileCount) {
  if (project.build?.startedAt) {
    return fileCount > 0 ? { key: 'built', label: '已产出' } : { key: 'building', label: '制作中' };
  }
  if (project.doc) return { key: 'doc', label: '文档就绪' };
  if (project.requirements?.messages?.length) return { key: 'discovery', label: '需求访谈中' };
  return { key: 'new', label: '待开始' };
}

function lastActivity(project) {
  const times = [project.updatedAt, project.createdAt];
  if (project.requirements?.updatedAt) times.push(project.requirements.updatedAt);
  for (const m of [...(project.requirements?.messages || []), ...(project.build?.messages || [])]) {
    if (m.ts) times.push(m.ts);
  }
  return times.filter(Boolean).sort().pop() || project.createdAt;
}

async function projectSummary(project) {
  let fileCount = 0;
  if (project.kind === 'folder') {
    const state = store.getState();
    const childCount =
      state.projects.filter((p) => p.kind === 'folder' && p.parentId === project.id).length +
      state.projects.filter((p) => p.kind === 'project' && p.folderId === project.id).length;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      slug: project.slug,
      dir: null,
      parentId: project.parentId || null,
      folderId: null,
      kind: 'folder',
      childCount,
      createdAt: project.createdAt,
      updatedAt: lastActivity(project),
      status: 'folder',
      statusLabel: '文件夹',
      hasDoc: false,
      docVersion: 0,
      docUpdatedAt: null,
      buildStarted: false,
      buildMessages: 0,
      requirementMessages: 0,
      fileCount: 0,
    };
  }
  try {
    const entries = await filesLib.listTree(project.dir);
    fileCount = entries.filter((entry) => entry.type === 'file' && entry.path !== 'REQUIREMENTS.md').length;
  } catch {
    fileCount = project.build?.files?.length || 0;
  }
  const status = projectStatus(project, fileCount);
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    slug: project.slug,
    dir: project.dir,
    parentId: null,
    folderId: project.folderId || null,
    kind: 'project',
    childCount: 0,
    createdAt: project.createdAt,
    updatedAt: lastActivity(project),
    status: status.key,
    statusLabel: status.label,
    hasDoc: Boolean(project.doc),
    docVersion: project.doc?.version || 0,
    docUpdatedAt: project.doc?.createdAt || null,
    buildStarted: Boolean(project.build?.startedAt),
    buildMessages: project.build?.messages?.length || 0,
    requirementMessages: project.requirements?.messages?.length || 0,
    fileCount,
  };
}

function taskSummary(task) {
  const fileCount = task.files?.length || 0;
  let status = { key: 'new', label: '待开始' };
  if (fileCount > 0) status = { key: 'built', label: '已产出' };
  else if (task.messages?.length) status = { key: 'active', label: '进行中' };
  const project = task.projectId ? store.projectById(task.projectId) : null;
  return {
    id: task.id,
    title: task.title,
    slug: task.slug,
    dir: task.dir,
    projectId: task.projectId || null,
    projectName: project?.name || '',
    createdAt: task.createdAt,
    updatedAt: lastActivity({ ...task, requirements: { messages: [] }, build: { messages: [] } }),
    status: status.key,
    statusLabel: status.label,
    messageCount: task.messages?.length || 0,
    fileCount,
  };
}

function cleanDoc(text) {
  let out = String(text || '').trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```(?:markdown|md)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
  }
  return out.trim();
}

function conversationHistory(messages, limit = 30) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-limit)
    .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 24_000) }))
    .filter((m) => m.content.trim());
}

async function applyFiles(dir, parsedFiles) {
  const written = [];
  const errors = [];
  const seen = new Set();
  for (const file of parsedFiles.slice(0, 80)) {
    const rel = file.path.replace(/\\/g, '/');
    if (seen.has(rel)) continue;
    seen.add(rel);
    try {
      const result = await filesLib.writeProjectFile(dir, rel, file.content);
      written.push({ ...result, updatedAt: nowIso() });
    } catch (err) {
      errors.push({ path: file.path, message: err.message });
    }
  }
  return { written, errors };
}

function mergeFileRecords(existing, incoming) {
  const map = new Map();
  for (const f of existing || []) map.set(f.path, f);
  for (const f of incoming || []) {
    map.set(f.path, { ...(map.get(f.path) || {}), ...f });
  }
  return [...map.values()].slice(-200);
}

/**
 * Streams assistant output over SSE, applies file blocks and persists the
 * final message through `finalize`.
 */
async function streamReply(req, res, options) {
  const { key, messages, demo, filterFiles, finalize, preLocked, cwd } = options;
  if (!preLocked && !acquire(key)) {
    fail(res, 409, '该对话正在生成中，请稍候');
    return;
  }

  const controller = new AbortController();
  let settled = false;
  let raw = '';
  let display = '';
  const filter = filterFiles ? new filesLib.FileBlockFilter() : null;

  const onClose = () => {
    if (!settled) controller.abort();
  };

  try {
    sseStart(res);
    activeStreams.add(key);
    res.on('close', onClose);

    const cfg = getConfig();
    const source = demo
      ? demoReply({ ...demo })
      : chatStream({
          config: cfg,
          messages,
          signal: controller.signal,
          cwd,
        });

    sseSend(res, 'start', { at: nowIso(), demo: Boolean(demo) });

    for await (const ev of source) {
      if (ev.type === 'reasoning') {
        sseSend(res, 'reasoning', { text: ev.text });
        continue;
      }
      const text = ev.text || '';
      raw += text;
      if (!text) continue;
      if (filter) {
        const visible = filter.push(text);
        if (visible) {
          display += visible;
          sseSend(res, 'delta', { text: visible });
        }
      } else {
        display += text;
        sseSend(res, 'delta', { text });
      }
    }

    if (filter) {
      const tail = filter.finish();
      if (tail) {
        display += tail;
        sseSend(res, 'delta', { text: tail });
      }
    }

    settled = true;
    const payload = await finalize({ raw, display, aborted: false, demo: Boolean(demo) });
    sseSend(res, 'done', payload || {});
  } catch (err) {
    const aborted = err?.name === 'AbortError' || res.destroyed;
    if (aborted) {
      settled = true;
      try {
        await finalize({ raw, display: display || filesLib.stripFileBlocks(raw), aborted: true, demo: Boolean(demo) });
      } catch {
        /* ignore */
      }
    } else {
      console.error('[chat] 生成失败:', err.message);
      sseSend(res, 'error', { message: err.message });
      settled = true;
      try {
        await finalize({ raw, display, aborted: true, error: err, demo: Boolean(demo) });
      } catch {
        /* ignore */
      }
    }
  } finally {
    settled = true;
    activeStreams.delete(key);
    release(key);
    try {
      res.end();
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* API handlers                                                        */
/* ------------------------------------------------------------------ */

async function apiState(req, res) {
  const s = store.getState();
  const projects = await Promise.all(s.projects.map(projectSummary));
  const tasks = s.tasks.map(taskSummary);
  const root = await rootInfo();
  const ext = extensions.getExtensions();
  json(res, 200, {
    version: VERSION,
    projects,
    tasks,
    settings: publicConfig(),
    root,
    counts: {
      memories: (s.memories || []).filter((memory) => !memory.archived).length,
      skills: agentLib.enabledSkills(s).length,
      tools: toolsLib.listAllTools({ enabledOnly: true }).length,
      managementMessages: (s.management?.messages || []).length,
      extensions: ext.modules.length,
      extensionErrors: ext.errors.length,
    },
  });
}

async function apiProjectDetail(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  let files = [];
  if (project.kind !== 'folder') {
    try {
      files = await filesLib.listTree(project.dir);
    } catch {
      files = [];
    }
  }
  const summary = await projectSummary(project);
  json(res, 200, {
    project: {
      ...project,
      messages: undefined,
      requirements: { ...project.requirements },
      build: { ...project.build },
      files,
      summary,
      children: await Promise.all(
        (project.kind === 'folder'
          ? store.getState().projects.filter(
              (item) =>
                (item.kind === 'folder' && item.parentId === project.id) ||
                (item.kind === 'project' && item.folderId === project.id)
            )
          : []
        ).map((item) => projectSummary(item))
      ),
      ancestors: store.projectAncestors(project.id).map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
      })),
    },
  });
}

async function apiCreateProject(req, res) {
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim().slice(0, 500);
  const kind = body.kind === 'folder' ? 'folder' : 'project';
  const parentId = body.parentId ? String(body.parentId) : null;
  const folderId = body.folderId ? String(body.folderId) : null;
  if (!name) return fail(res, 400, '请填写项目名称');
  if (name.length > 60) return fail(res, 400, '项目名称不能超过 60 个字符');
  if (parentId) {
    const parent = store.projectById(parentId);
    if (!parent || parent.kind !== 'folder') return fail(res, 400, '上级必须是文件夹');
  }
  if (kind === 'project' && folderId) {
    const folder = store.projectById(folderId);
    if (!folder || folder.kind !== 'folder') return fail(res, 400, '所属位置必须是文件夹');
  }

  if (kind === 'folder') {
    const project = store.createProject({
      name,
      description,
      slug: `folder-${shortId(4)}`,
      dir: null,
      parentId,
      kind: 'folder',
    });
    await store.persist();
    return json(res, 201, { project: await projectSummary(project), root: await rootInfo() });
  }

  let rootInfoValue;
  try {
    rootInfoValue = await ensureProjectRoot();
  } catch (err) {
    return fail(res, 500, err.message);
  }

  let slug = slugify(name);
  const projectsRoot = rootInfoValue.projectsDir;
  try {
    await fs.promises.mkdir(projectsRoot, { recursive: true });
  } catch (err) {
    return fail(res, 500, `无法创建项目目录：${projectsRoot}（${err.message}）`);
  }
  const existingDirs = new Set(store.getState().projects.map((p) => p.slug));
  if (existingDirs.has(slug) || fs.existsSync(path.join(projectsRoot, slug))) {
    slug = `${slug}-${shortId(2)}`;
  }
  const dir = path.join(projectsRoot, slug);

  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (err) {
    return fail(res, 500, `无法创建项目目录：${dir}（${err.message}）`);
  }

  const project = store.createProject({
    name,
    description,
    slug,
    dir,
    folderId,
    kind: 'project',
  });
  try {
    await filesLib.writeMeta(dir, {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      tool: 'DeepSeek Harness Console',
    });
  } catch {
    /* metadata is optional */
  }
  await store.persist();
  json(res, 201, { project: await projectSummary(project), root: await rootInfo() });
}

async function apiDeleteProject(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  let movedChildren = 0;
  if (project.kind === 'folder') {
    const targetParent = project.parentId || null;
    for (const item of store.getState().projects) {
      if (item.id === id) continue;
      if (item.kind === 'folder' && item.parentId === id) {
        item.parentId = targetParent;
        movedChildren += 1;
      } else if (item.kind === 'project' && item.folderId === id) {
        item.folderId = targetParent;
        movedChildren += 1;
      }
    }
  }
  store.removeProject(id);
  await store.persist();
  json(res, 200, {
    ok: true,
    dir: project.dir,
    keepFiles: true,
    movedChildren,
  });
}

async function apiMoveProject(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  const body = await readJson(req);
  const targetId = body.folderId || body.parentId ? String(body.folderId || body.parentId) : null;
  if (targetId === id) return fail(res, 400, '不能移动到自身');
  if (targetId) {
    const target = store.projectById(targetId);
    if (!target) return fail(res, 404, '目标文件夹不存在');
    if (target.kind !== 'folder') return fail(res, 400, '项目只能放进文件夹');
    if (project.kind === 'folder') {
      const descendants = store.projectDescendants(id).map((item) => item.id);
      if (descendants.includes(targetId)) return fail(res, 400, '不能移动到自己的子文件夹');
    }
  }
  if (project.kind === 'folder') project.parentId = targetId;
  else project.folderId = targetId;
  await store.persist();
  json(res, 200, { ok: true, project: await projectSummary(project) });
}

async function apiRenameProject(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  if (!name) return fail(res, 400, '名称不能为空');
  if (name.length > 60) return fail(res, 400, '名称不能超过 60 个字符');
  project.name = name;
  project.updatedAt = nowIso();
  await store.persist();
  json(res, 200, { ok: true, project: await projectSummary(project) });
}

async function apiDshWeb(req, res) {
  const body = await readJson(req);
  const projectId = body.projectId ? String(body.projectId) : null;
  const taskId = body.taskId ? String(body.taskId) : null;
  let cwd = APP_ROOT;
  let key = 'app';
  let rootId = null;
  let rootName = '';
  try {
    if (taskId) {
      const task = store.taskById(taskId);
      if (!task) return fail(res, 404, '任务不存在');
      const project = task.projectId ? store.projectById(task.projectId) : null;
      if (project) {
        const ancestors = store.projectAncestors(project.id);
        const rootProject = ancestors[0] || project;
        cwd =
          rootProject.dir ||
          store.projectDescendants(rootProject.id).find((item) => item.dir)?.dir ||
          (await rootInfo()).path;
        key = `root:${rootProject.id}`;
        rootId = rootProject.id;
        rootName = rootProject.name;
      } else {
        cwd = task.dir;
        key = `task:${task.id}`;
        rootId = `task-${task.id}`;
        rootName = task.title;
      }
    } else if (projectId) {
      const project = store.projectById(projectId);
      if (!project) return fail(res, 404, '项目不存在');
      const ancestors = store.projectAncestors(project.id);
      const rootProject = ancestors[0] || project;
      cwd =
        rootProject.dir ||
        store.projectDescendants(rootProject.id).find((item) => item.dir)?.dir ||
        (await rootInfo()).path;
      key = `root:${rootProject.id}`;
      rootId = rootProject.id;
      rootName = rootProject.name;
    }
    const result = await dshWeb.ensure({ cwd, key, rootId, rootName });
    json(res, 200, { ok: true, ...result });
  } catch (err) {
    fail(res, 500, err.message);
  }
}

async function apiPortfolio(req, res) {  const parsed = new URL(req.url, 'http://127.0.0.1');
  const projectId = String(parsed.searchParams.get('projectId') || '').trim();
  const all = store.getState().projects;
  const root = projectId ? store.projectById(projectId) : null;
  if (projectId && !root) return fail(res, 404, '项目不存在');
  const scope = root ? store.projectDescendants(root.id) : all;
  const scopeIds = new Set(scope.map((project) => project.id));
  const projects = [];
  const outcomes = [];
  for (const project of scope) {
    const summary = await projectSummary(project);
    projects.push(summary);
    if (project.kind === 'folder') continue;
    let files = [];
    try {
      files = await filesLib.listTree(project.dir);
    } catch {
      files = project.build?.files || [];
    }
    outcomes.push({
      projectId: project.id,
      projectName: project.name,
      dir: project.dir,
      files,
      hasDoc: Boolean(project.doc),
      docVersion: project.doc?.version || 0,
      docUpdatedAt: project.doc?.createdAt || null,
      buildStarted: Boolean(project.build?.startedAt),
      buildMessages: project.build?.messages?.length || 0,
      requirementMessages: project.requirements?.messages?.length || 0,
    });
  }
  const tasks = store.getState().tasks
    .filter((task) => task.projectId && scopeIds.has(task.projectId))
    .map(taskSummary);
  const memories = (store.getState().memories || [])
    .filter((memory) => !memory.archived && memory.projectId && scopeIds.has(memory.projectId))
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  json(res, 200, {
    root: root ? await projectSummary(root) : null,
    projects,
    outcomes,
    tasks,
    memories,
    totals: {
      projects: projects.filter((project) => project.kind !== 'folder').length,
      folders: projects.filter((project) => project.kind === 'folder').length,
      files: outcomes.reduce((sum, item) => sum + item.files.filter((file) => file.type === 'file').length, 0),
      tasks: tasks.length,
      memories: memories.length,
    },
  });
}

async function apiRequirementsChat(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  const body = await readJson(req);
  const text = String(body.text || '').trim();
  if (!text) return fail(res, 400, '消息不能为空');
  if (text.length > 8000) return fail(res, 400, '消息过长（最多 8000 字）');

  const key = `project:${id}:requirements`;
  if (!acquire(key)) return fail(res, 409, '该对话正在生成中，请稍候');

  const userMessage = { id: shortId(4), role: 'user', content: text, ts: nowIso() };
  project.requirements.messages.push(userMessage);
  project.requirements.updatedAt = userMessage.ts;
  store.mutateProject(id, () => {});
  await store.persist();

  const cfg = getConfig();
  const demo = isDemo(cfg);
  const messages = [
    {
      role: 'system',
      content: composeSystem(prompts.requirementsSystem(project), {
        projectId: project.id,
        allowTools: false,
      }),
    },
    ...conversationHistory(project.requirements.messages),
  ];
  const userTurn = project.requirements.messages.filter((m) => m.role === 'user').length;

  await streamReply(req, res, {
    key,
    preLocked: true,
    messages,
    cwd: project.dir,
    demo: demo ? { mode: 'requirements', project, turn: userTurn, userText: text } : null,
    filterFiles: false,
    finalize: async ({ display, aborted, demo: isDemo }) => {
      if (aborted && !display.trim()) return {};
      const content = toolsLib.stripToolBlocks(display).trim() || '（无内容）';
      const assistant = {
        id: shortId(4),
        role: 'assistant',
        content,
        ts: nowIso(),
        demo: Boolean(isDemo),
        interrupted: aborted || undefined,
      };
      project.requirements.messages.push(assistant);
      project.requirements.updatedAt = assistant.ts;
      store.mutateProject(id, () => {});
      await store.persist();
      if (!aborted) maybeExtractMemories({ project });
      return {
        message: assistant,
        project: await projectSummary(project),
        userMessage,
      };
    },
  });
}

async function apiRequirementsDoc(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  if (!project.requirements.messages.some((m) => m.role === 'user')) {
    return fail(res, 400, '请先完成至少一轮需求对话');
  }
  const key = `project:${id}:doc`;
  if (!acquire(key)) return fail(res, 409, '需求文档正在生成中');

  const cfg = getConfig();
  const demo = isDemo(cfg);
  const history = conversationHistory(project.requirements.messages, 40);
  const messages = [
    {
      role: 'system',
      content: composeSystem(prompts.requirementsSystem(project), {
        projectId: project.id,
        allowTools: false,
      }),
    },
    ...history,
    { role: 'user', content: prompts.docInstruction(project) },
  ];

  await streamReply(req, res, {
    key,
    preLocked: true,
    messages,
    cwd: project.dir,
    demo: demo ? { mode: 'doc', project } : null,
    filterFiles: false,
    finalize: async ({ raw, aborted, demo: isDemo }) => {
      if (aborted) return {};
      const markdown = cleanDoc(raw);
      if (!markdown) throw new Error('模型没有返回文档内容');
      const version = (project.doc?.version || 0) + 1;
      const doc = {
        markdown,
        version,
        createdAt: nowIso(),
        model: cfg.model,
        demo: Boolean(isDemo),
      };
      project.doc = doc;
      try {
        await filesLib.writeRequirementsDoc(project.dir, markdown);
      } catch (err) {
        console.warn('[doc] 写入 REQUIREMENTS.md 失败:', err.message);
      }
      store.mutateProject(id, () => {});
      await store.persist();
      memoryLib.rememberEvent({
        type: 'decision',
        title: `需求文档 v${version} · ${project.name}`,
        content: `已生成需求文档 v${version}，包含功能需求与验收标准。摘要：${markdown.replace(/\s+/g, ' ').slice(0, 380)}`,
        tags: ['需求文档', project.name],
        project,
      });
      return { doc, project: await projectSummary(project) };
    },
  });
}

async function apiBuildStart(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  if (!project.doc?.markdown) return fail(res, 400, '请先生成需求文档');
  if (project.build.startedAt) return fail(res, 409, '项目制作已经开始');

  const key = `project:${id}:build`;
  if (!acquire(key)) return fail(res, 409, '项目正在制作中');

  const userMessage = {
    id: shortId(4),
    role: 'user',
    content: project.doc.markdown,
    ts: nowIso(),
    kind: 'doc',
    docVersion: project.doc.version,
  };
  project.build.messages.push(userMessage);
  project.build.startedAt = userMessage.ts;
  project.build.status = 'running';
  store.mutateProject(id, () => {});
  await store.persist();

  const cfg = getConfig();
  const demo = isDemo(cfg);
  const messages = [
    {
      role: 'system',
      content: composeSystem(prompts.buildSystem(project), {
        projectId: project.id,
        allowTools: true,
      }),
    },
    { role: 'user', content: prompts.buildStartInstruction(project, project.doc.markdown) },
  ];

  await streamReply(req, res, {
    key,
    preLocked: true,
    messages,
    cwd: project.dir,
    demo: demo ? { mode: 'build', project, turn: 1 } : null,
    filterFiles: true,
    finalize: async ({ raw, display, aborted, demo: isDemo }) => {
      if (aborted) {
        if (!display.trim()) return {};
        const assistant = {
          id: shortId(4),
          role: 'assistant',
          content: display.trim() || '（生成已中断）',
          ts: nowIso(),
          interrupted: true,
        };
        project.build.messages.push(assistant);
        project.build.status = 'done';
        store.mutateProject(id, () => {});
        await store.persist();
        return {};
      }

      const parsed = filesLib.parseFileBlocks(raw);
      const toolCalls = toolsLib.parseToolBlocks(raw);
      const { written, errors } = await applyFiles(project.dir, parsed.files);
      project.build.files = mergeFileRecords(project.build.files, written);
      const assistant = {
        id: shortId(4),
        role: 'assistant',
        content:
          toolsLib.stripToolBlocks(parsed.display).trim() ||
          (written.length ? `已生成 ${written.length} 个文件。` : '（无内容）'),
        ts: nowIso(),
        files: written,
        toolCalls,
        demo: Boolean(isDemo),
      };
      project.build.messages.push(assistant);
      project.build.status = 'done';
      project.build.finishedAt = nowIso();
      store.mutateProject(id, () => {});
      await store.persist();
      if (written.length) {
        memoryLib.rememberEvent({
          type: 'project',
          title: `项目产出 · ${project.name}`,
          content: `已写入 ${written.length} 个文件：${written.map((f) => f.path).slice(0, 12).join('、')}`,
          tags: ['产出', project.name],
          project,
        });
      }
      maybeExtractMemories({ project });

      sseSend(res, 'files', { files: written, errors });
      return {
        message: assistant,
        files: written,
        writeErrors: errors,
        project: await projectSummary(project),
      };
    },
  });
}

async function apiBuildChat(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  if (!project.build.startedAt) return fail(res, 400, '请先开始制作');
  const body = await readJson(req);
  const text = String(body.text || '').trim();
  if (!text) return fail(res, 400, '消息不能为空');
  if (text.length > 8000) return fail(res, 400, '消息过长（最多 8000 字）');

  const key = `project:${id}:build`;
  if (!acquire(key)) return fail(res, 409, '项目正在制作中，请稍候');

  const userMessage = { id: shortId(4), role: 'user', content: text, ts: nowIso() };
  project.build.messages.push(userMessage);
  store.mutateProject(id, () => {});
  await store.persist();

  const cfg = getConfig();
  const demo = isDemo(cfg);
  let snapshot = '';
  try {
    snapshot = await filesLib.buildSnapshot(project.dir);
  } catch {
    snapshot = '';
  }
  const messages = [
    {
      role: 'system',
      content: composeSystem(prompts.buildContinuationSystem(project, project.doc?.markdown || '', snapshot), {
        projectId: project.id,
        allowTools: true,
      }),
    },
    ...conversationHistory(project.build.messages),
  ];
  const userTurn = project.build.messages.filter((m) => m.role === 'user').length;

  await streamReply(req, res, {
    key,
    preLocked: true,
    messages,
    cwd: project.dir,
    demo: demo ? { mode: 'build', project, turn: userTurn } : null,
    filterFiles: true,
    finalize: async ({ raw, display, aborted, demo: isDemo }) => {
      if (aborted) {
        if (!display.trim()) return {};
        const assistant = {
          id: shortId(4),
          role: 'assistant',
          content: display.trim() || '（生成已中断）',
          ts: nowIso(),
          interrupted: true,
        };
        project.build.messages.push(assistant);
        store.mutateProject(id, () => {});
        await store.persist();
        return {};
      }
      const parsed = filesLib.parseFileBlocks(raw);
      const toolCalls = toolsLib.parseToolBlocks(raw);
      const { written, errors } = await applyFiles(project.dir, parsed.files);
      project.build.files = mergeFileRecords(project.build.files, written);
      const assistant = {
        id: shortId(4),
        role: 'assistant',
        content:
          toolsLib.stripToolBlocks(parsed.display).trim() ||
          (written.length ? `已更新 ${written.length} 个文件。` : '（无内容）'),
        ts: nowIso(),
        files: written,
        toolCalls,
        demo: Boolean(isDemo),
      };
      project.build.messages.push(assistant);
      project.build.status = 'done';
      store.mutateProject(id, () => {});
      await store.persist();
      maybeExtractMemories({ project });
      sseSend(res, 'files', { files: written, errors });
      return {
        message: assistant,
        files: written,
        writeErrors: errors,
        project: await projectSummary(project),
      };
    },
  });
}

async function apiProjectFiles(req, res, id) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  const files = await filesLib.listTree(project.dir);
  json(res, 200, { files, root: project.dir });
}

async function apiProjectFile(req, res, id, url) {
  const project = store.projectById(id);
  if (!project) return fail(res, 404, '项目不存在');
  const rel = url.searchParams.get('path');
  if (!rel) return fail(res, 400, '缺少 path 参数');
  try {
    const file = await filesLib.readTextFile(project.dir, rel);
    json(res, 200, file);
  } catch (err) {
    fail(res, 404, err.message);
  }
}

async function apiTaskDetail(req, res, id) {
  const task = store.taskById(id);
  if (!task) return fail(res, 404, '任务不存在');
  let fileList = [];
  try {
    fileList = await filesLib.listTree(task.dir);
  } catch {
    fileList = [];
  }
  json(res, 200, { task: { ...task, files: fileList, summary: taskSummary(task) } });
}

async function apiCreateTask(req, res) {
  const body = await readJson(req);
  const title = String(body.title || '').trim();
  const projectId = body.projectId ? String(body.projectId) : null;
  if (!title) return fail(res, 400, '请填写任务名称');
  if (title.length > 80) return fail(res, 400, '任务名称不能超过 80 个字符');
  if (projectId) {
    const project = store.projectById(projectId);
    if (!project) return fail(res, 404, '所属项目不存在');
    if (project.kind === 'folder') return fail(res, 400, '任务不能直接挂在文件夹下');
  }

  let rootInfoValue;
  try {
    rootInfoValue = await ensureProjectRoot();
  } catch (err) {
    return fail(res, 500, err.message);
  }

  const taskRoot = rootInfoValue.tasksDir;
  try {
    await fs.promises.mkdir(taskRoot, { recursive: true });
  } catch (err) {
    return fail(res, 500, `无法创建任务目录：${err.message}`);
  }

  let slug = slugify(title);
  if (fs.existsSync(path.join(taskRoot, slug))) slug = `${slug}-${shortId(2)}`;
  const dir = path.join(taskRoot, slug);
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (err) {
    return fail(res, 500, `无法创建任务目录：${err.message}`);
  }

  const task = store.createTask({ title, slug, dir, projectId });
  await filesLib.writeMeta(dir, {
    id: task.id,
    title,
    createdAt: task.createdAt,
    tool: 'DeepSeek Harness Console',
    mode: 'task',
  }).catch(() => {});
  await store.persist();
  json(res, 201, { task: taskSummary(task), root: await rootInfo() });
}

async function apiDeleteTask(req, res, id) {
  const task = store.taskById(id);
  if (!task) return fail(res, 404, '任务不存在');
  store.removeTask(id);
  await store.persist();
  json(res, 200, { ok: true, dir: task.dir, keepFiles: true });
}

async function apiTaskChat(req, res, id) {
  const task = store.taskById(id);
  if (!task) return fail(res, 404, '任务不存在');
  const body = await readJson(req);
  const text = String(body.text || '').trim();
  if (!text) return fail(res, 400, '消息不能为空');
  if (text.length > 8000) return fail(res, 400, '消息过长（最多 8000 字）');

  const key = `task:${id}`;
  if (!acquire(key)) return fail(res, 409, '任务正在执行中，请稍候');

  const userMessage = { id: shortId(4), role: 'user', content: text, ts: nowIso() };
  task.messages.push(userMessage);
  store.mutateTask(id, () => {});
  await store.persist();

  const cfg = getConfig();
  const demo = isDemo(cfg);
  let snapshot = '';
  try {
    snapshot = await filesLib.buildSnapshot(task.dir);
  } catch {
    snapshot = '';
  }
  const messages = [
    {
      role: 'system',
      content: composeSystem(prompts.taskContinuationSystem(task, snapshot), {
        taskId: task.id,
        allowTools: true,
      }),
    },
    ...conversationHistory(task.messages),
  ];
  const userTurn = task.messages.filter((m) => m.role === 'user').length;

  await streamReply(req, res, {
    key,
    preLocked: true,
    messages,
    cwd: task.dir,
    demo: demo ? { mode: 'task', task, turn: userTurn, userText: text } : null,
    filterFiles: true,
    finalize: async ({ raw, display, aborted, demo: isDemo }) => {
      if (aborted) {
        if (!display.trim()) return {};
        const assistant = {
          id: shortId(4),
          role: 'assistant',
          content: display.trim() || '（生成已中断）',
          ts: nowIso(),
          interrupted: true,
        };
        task.messages.push(assistant);
        store.mutateTask(id, () => {});
        await store.persist();
        return {};
      }
      const parsed = filesLib.parseFileBlocks(raw);
      const toolCalls = toolsLib.parseToolBlocks(raw);
      const { written, errors } = await applyFiles(task.dir, parsed.files);
      task.files = mergeFileRecords(task.files, written);
      const assistant = {
        id: shortId(4),
        role: 'assistant',
        content:
          toolsLib.stripToolBlocks(parsed.display).trim() ||
          (written.length ? `已生成 ${written.length} 个文件。` : '（无内容）'),
        ts: nowIso(),
        files: written,
        toolCalls,
        demo: Boolean(isDemo),
      };
      task.messages.push(assistant);
      task.status = written.length ? 'done' : 'active';
      store.mutateTask(id, () => {});
      await store.persist();
      if (written.length) {
        memoryLib.rememberEvent({
          type: 'task',
          title: `任务产出 · ${task.title}`,
          content: `任务产出了 ${written.length} 个文件：${written.map((f) => f.path).slice(0, 12).join('、')}`,
          tags: ['任务', task.title],
          task,
        });
      }
      maybeExtractMemories({ task });
      sseSend(res, 'files', { files: written, errors });
      return {
        message: assistant,
        files: written,
        writeErrors: errors,
        task: taskSummary(task),
      };
    },
  });
}

async function apiTaskFiles(req, res, id) {
  const task = store.taskById(id);
  if (!task) return fail(res, 404, '任务不存在');
  const fileList = await filesLib.listTree(task.dir);
  json(res, 200, { files: fileList, root: task.dir });
}

async function apiTaskFile(req, res, id, url) {
  const task = store.taskById(id);
  if (!task) return fail(res, 404, '任务不存在');
  const rel = url.searchParams.get('path');
  if (!rel) return fail(res, 400, '缺少 path 参数');
  try {
    const file = await filesLib.readTextFile(task.dir, rel);
    json(res, 200, file);
  } catch (err) {
    fail(res, 404, err.message);
  }
}

async function apiOpenFolder(req, res, dir) {
  if (!dir || !fs.existsSync(dir)) return fail(res, 404, '目录不存在');
  try {
    if (process.platform === 'win32') {
      spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [dir], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref();
    }
    json(res, 200, { ok: true });
  } catch (err) {
    fail(res, 500, `无法打开目录：${err.message}`);
  }
}

async function apiSettings(req, res, url) {
  if (req.method === 'GET') {
    return json(res, 200, { settings: publicConfig(), root: await rootInfo() });
  }
  const body = await readJson(req);
  try {
    updateConfig({
      apiKey: body.apiKey,
      clearKey: body.clearKey,
      model: body.model,
      baseUrl: body.baseUrl,
      projectRoot: body.projectRoot,
      autoMemory: body.autoMemory,
      chatProvider: body.chatProvider,
      dialogWindow: body.dialogWindow,
    });
  } catch (err) {
    return fail(res, 400, err.message);
  }
  json(res, 200, { settings: publicConfig(), root: await rootInfo() });
}

async function apiTestConnection(req, res) {
  const body = await readJson(req);
  const cfg = getConfig();
  const key = String(body.apiKey || '').trim() || cfg.apiKey;
  const result = await testConnection({
    apiKey: key,
    baseUrl: body.baseUrl || cfg.baseUrl,
    model: body.model || cfg.model,
    chatProvider: body.chatProvider,
  });
  json(res, 200, result);
}

/* ------------------------------------------------------------------ */
/* memory / agent                                                      */
/* ------------------------------------------------------------------ */

function memoryPayload() {
  const state = store.getState();
  return {
    memories: state.memories || [],
    agent: state.agent,
    conversations: memoryLib.listConversations(),
    stats: memoryLib.memoryStats(),
    types: memoryLib.MEMORY_LABELS,
  };
}

async function apiMemoryList(req, res, url) {
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
  const type = String(url.searchParams.get('type') || '').trim();
  const pinned = url.searchParams.get('pinned');
  let memories = (store.getState().memories || []).filter((memory) => !memory.archived);
  if (type) memories = memories.filter((memory) => memory.type === type);
  if (pinned === '1') memories = memories.filter((memory) => memory.pinned);
  if (q) {
    memories = memories.filter((memory) =>
      `${memory.title} ${memory.content} ${(memory.tags || []).join(' ')}`.toLowerCase().includes(q)
    );
  }
  memories = [...memories].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
  });
  json(res, 200, { ...memoryPayload(), memories });
}

async function apiMemoryCreate(req, res) {
  const body = await readJson(req);
  const memory = memoryLib.createMemory({
    type: body.type,
    title: body.title,
    content: body.content,
    tags: body.tags,
    pinned: body.pinned,
    source: 'manual',
    sourceType: body.projectId ? 'project' : body.taskId ? 'task' : 'manual',
    projectId: body.projectId || null,
    taskId: body.taskId || null,
    projectName: body.projectName || '',
  });
  json(res, 201, { memory, ...memoryPayload() });
}

async function apiMemoryUpdate(req, res, id) {
  const body = await readJson(req);
  const memory = memoryLib.updateMemory(id, body);
  if (!memory) return fail(res, 404, '记忆不存在');
  json(res, 200, { memory, ...memoryPayload() });
}

async function apiMemoryDelete(req, res, id) {
  if (!memoryLib.deleteMemory(id)) return fail(res, 404, '记忆不存在');
  json(res, 200, { ok: true, ...memoryPayload() });
}

async function apiMemoryExtract(req, res) {
  const body = await readJson(req);
  const project = body.projectId ? store.projectById(body.projectId) : null;
  const task = body.taskId ? store.taskById(body.taskId) : null;
  if (body.projectId && !project) return fail(res, 404, '项目不存在');
  if (body.taskId && !task) return fail(res, 404, '任务不存在');
  const added = await memoryLib.extractMemories({ project, task, force: true });
  json(res, 200, { added, ...memoryPayload() });
}

async function apiAgent(req, res) {
  const state = store.getState();
  if (req.method === 'GET') return json(res, 200, { agent: state.agent });
  const body = await readJson(req);
  const next = { ...state.agent };
  for (const field of ['name', 'role', 'tone', 'principles', 'preferences']) {
    if (body[field] !== undefined) next[field] = String(body[field]).trim().slice(0, 1200);
  }
  next.updatedAt = nowIso();
  state.agent = next;
  store.persist();
  json(res, 200, { agent: next });
}

/* ------------------------------------------------------------------ */
/* skills / tools / extensions                                         */
/* ------------------------------------------------------------------ */

function publicSkill(skill) {
  return { ...skill };
}

function publicTool(tool) {
  const { execute, ...rest } = tool;
  return rest;
}

function allSkills() {
  return [...(store.getState().skills || []), ...extensions.extensionSkills()];
}

function skillsPayload() {
  const ext = extensions.getExtensions();
  return {
    skills: allSkills().map(publicSkill),
    modules: ext.modules.map((mod) => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      description: mod.description,
      file: mod.file,
      skills: mod.skills.length,
      tools: mod.tools.length,
    })),
    errors: ext.errors,
    extensionsDir: ext.dir,
  };
}

async function apiSkills(req, res, method) {
  if (method === 'GET') return json(res, 200, skillsPayload());
  const body = await readJson(req);
  const state = store.getState();
  const id = body.id ? String(body.id) : '';
  const existing = id ? state.skills.find((skill) => skill.id === id) : null;
  if (id && !existing && id.startsWith('ext:')) return fail(res, 403, '扩展技能请在扩展文件中修改');
  if (!body.name && !existing) return fail(res, 400, '请填写技能名称');
  const name = String(body.name || existing?.name || '').trim();
  if (!name) return fail(res, 400, '请填写技能名称');

  if (existing) {
    existing.name = name.slice(0, 60);
    if (body.description !== undefined) existing.description = String(body.description).trim().slice(0, 400);
    if (body.instructions !== undefined) existing.instructions = String(body.instructions).trim().slice(0, 6000);
    if (body.enabled !== undefined) existing.enabled = Boolean(body.enabled);
    if (body.tags !== undefined) {
      existing.tags = Array.isArray(body.tags)
        ? body.tags.map(String).slice(0, 8)
        : String(body.tags).split(/[,，、\s]+/).filter(Boolean).slice(0, 8);
    }
    existing.updatedAt = nowIso();
    store.persist();
    return json(res, 200, { skill: existing, ...skillsPayload() });
  }

  const skill = {
    id: `skill:${shortId(4)}`,
    name: name.slice(0, 60),
    description: String(body.description || '').trim().slice(0, 400),
    instructions: String(body.instructions || '').trim().slice(0, 6000),
    enabled: body.enabled !== false,
    builtin: false,
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 8) : [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.skills.push(skill);
  store.persist();
  json(res, 201, { skill, ...skillsPayload() });
}

async function apiSkillDelete(req, res, id) {
  const state = store.getState();
  const index = state.skills.findIndex((skill) => skill.id === id);
  if (index < 0) return fail(res, 404, '技能不存在');
  state.skills.splice(index, 1);
  store.persist();
  json(res, 200, { ok: true, ...skillsPayload() });
}

function toolsPayload() {
  const state = store.getState();
  const all = toolsLib.listAllTools();
  return {
    tools: all.map(publicTool),
    runs: (state.toolRuns || []).slice(0, 40),
    modules: skillsPayload().modules,
    errors: extensions.getExtensions().errors,
    extensionsDir: extensions.EXTENSIONS_DIR,
  };
}

async function apiTools(req, res, method) {
  if (method === 'GET') return json(res, 200, toolsPayload());
  const body = await readJson(req);
  const state = store.getState();
  const id = body.id ? String(body.id) : '';
  const existing = id ? state.tools.find((tool) => tool.id === id) : null;
  if (id && !existing && id.startsWith('ext:')) return fail(res, 403, '扩展工具请在扩展文件中修改');

  if (existing) {
    if (body.label !== undefined) existing.label = String(body.label).trim().slice(0, 60);
    if (body.description !== undefined) existing.description = String(body.description).trim().slice(0, 600);
    if (body.enabled !== undefined) existing.enabled = Boolean(body.enabled);
    if (body.schema !== undefined && !existing.builtin) existing.schema = String(body.schema).slice(0, 4000);
    if (!existing.builtin && body.config && typeof body.config === 'object') {
      existing.config = {
        url: String(body.config.url || '').slice(0, 2000),
        method: String(body.config.method || 'GET').slice(0, 10),
        headers: body.config.headers || {},
        body: String(body.config.body || '').slice(0, 4000),
        command: String(body.config.command || '').slice(0, 4000),
        timeout: Number(body.config.timeout) || 20000,
      };
    }
    if (!existing.builtin && body.name) {
      const name = String(body.name).trim();
      if (!/^[a-zA-Z][a-zA-Z0-9_]{1,40}$/.test(name)) return fail(res, 400, '工具名需以字母开头，只含字母、数字、下划线');
      if (toolsLib.listAllTools().some((tool) => tool.id !== id && tool.name === name)) {
        return fail(res, 400, '工具名已存在');
      }      existing.name = name;
    }
    existing.updatedAt = nowIso();
    store.persist();
    return json(res, 200, { tool: publicTool(existing), ...toolsPayload() });
  }

  const name = String(body.name || '').trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,40}$/.test(name)) {
    return fail(res, 400, '工具名需以字母开头，只含字母、数字、下划线（2–41 字符）');
  }
  if (toolsLib.listAllTools().some((tool) => tool.name === name)) return fail(res, 400, '工具名已存在');
  const type = String(body.type || 'http');
  if (!['http', 'command'].includes(type)) return fail(res, 400, '只支持 http 或 command 类型');
  const config = body.config || {};
  if (type === 'http' && !String(config.url || '').trim()) return fail(res, 400, 'HTTP 工具需要 URL');
  if (type === 'command' && !String(config.command || '').trim()) return fail(res, 400, '命令工具需要 command');

  const tool = {
    id: `tool:${shortId(4)}`,
    name,
    label: String(body.label || name).trim().slice(0, 60),
    description: String(body.description || '').trim().slice(0, 600),
    type,
    handler: null,
    config: {
      url: String(config.url || '').slice(0, 2000),
      method: String(config.method || 'GET').toUpperCase().slice(0, 10),
      headers: config.headers || {},
      body: String(config.body || '').slice(0, 4000),
      command: String(config.command || '').slice(0, 4000),
      timeout: Number(config.timeout) || 20000,
    },
    schema: String(body.schema || '{"type":"object","properties":{}}').slice(0, 4000),
    enabled: body.enabled !== false,
    builtin: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.tools.push(tool);
  store.persist();
  json(res, 201, { tool: publicTool(tool), ...toolsPayload() });
}

async function apiToolDelete(req, res, id) {
  const state = store.getState();
  const index = state.tools.findIndex((tool) => tool.id === id);
  if (index < 0) return fail(res, 404, '工具不存在');
  state.tools.splice(index, 1);
  store.persist();
  json(res, 200, { ok: true, ...toolsPayload() });
}

async function apiToolRun(req, res) {
  const body = await readJson(req);
  const name = String(body.name || body.toolId || '').trim();
  const tool = toolsLib.findTool(name);
  if (!tool) return fail(res, 404, '工具不存在');
  if (tool.enabled === false) return fail(res, 400, '工具已停用');

  let ctx;
  try {
    ctx = safeToolContext({
      projectId: body.projectId || null,
      taskId: body.taskId || null,
      scope: body.scope || null,
    });
  } catch (err) {
    return fail(res, 400, err.message);
  }
  const run = await toolsLib.executeTool({
    tool,
    args: body.args || {},
    ctx: { ...ctx, scope: ctx.scope },
  });
  json(res, 200, { run, tool: publicTool(tool) });
}

async function apiExtensions(req, res, method) {
  if (method === 'POST') {
    extensions.loadExtensions();
    return json(res, 200, {
      ...skillsPayload(),
      modules: extensions.getExtensions().modules.map((mod) => ({
        id: mod.id,
        name: mod.name,
        version: mod.version,
        description: mod.description,
        file: mod.file,
        skills: mod.skills.length,
        tools: mod.tools.length,
      })),
    });
  }
  const ext = extensions.getExtensions();
  json(res, 200, {
    modules: ext.modules.map((mod) => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      description: mod.description,
      file: mod.file,
      skills: mod.skills.map(publicSkill),
      tools: mod.tools.map(publicTool),
    })),
    errors: ext.errors,
    dir: ext.dir,
    loadedAt: ext.loadedAt,
    example: 'data/extensions/example.js',
  });
}

async function apiExtensionsOpenFolder(req, res) {
  extensions.loadExtensions();
  return apiOpenFolder(req, res, extensions.EXTENSIONS_DIR);
}

async function apiOpenWorkspace(req, res) {
  const info = await rootInfo();
  if (!info.writable) return fail(res, 400, `工作区不可写：${info.error || info.path}`);
  return apiOpenFolder(req, res, info.path);
}

async function apiDocsExtending(req, res) {
  try {
    const markdown = await fs.promises.readFile(path.join(APP_ROOT, 'docs', 'EXTENDING.md'), 'utf8');
    json(res, 200, { markdown });
  } catch (err) {
    fail(res, 404, `接口文档不存在：${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* management                                                          */
/* ------------------------------------------------------------------ */

function managementPayload() {
  const state = store.getState();
  return {
    management: {
      messages: state.management.messages || [],
      staged: state.management.staged || [],
      batch: state.management.batch || null,
      updatedAt: state.management.updatedAt || null,
      appliedAt: state.management.appliedAt || null,
      applied: state.management.applied || [],
    },
    system: management.systemInfo(),
    context: agentLib.contextStats({ allowTools: true }),
    demo: isDemo(getConfig()),
  };
}

async function apiManagementGet(req, res) {
  json(res, 200, managementPayload());
}

async function apiManagementChat(req, res) {
  const body = await readJson(req);
  const text = String(body.text || '').trim();
  if (!text) return fail(res, 400, '消息不能为空');
  if (text.length > 8000) return fail(res, 400, '消息过长（最多 8000 字）');

  const key = 'management';
  if (!acquire(key)) return fail(res, 409, '软件管理对话正在生成中，请稍候');

  const state = store.getState();
  const userMessage = { id: shortId(4), role: 'user', content: text, ts: nowIso() };
  state.management.messages.push(userMessage);
  state.management.updatedAt = userMessage.ts;
  await store.persist();

  const cfg = getConfig();
  const demo = isDemo(cfg);
  const messages = [
    {
      role: 'system',
      content: composeSystem(management.systemPrompt(), { allowTools: true }),
    },
    ...conversationHistory(state.management.messages, 24),
  ];

  await streamReply(req, res, {
    key,
    preLocked: true,
    messages,
    cwd: APP_ROOT,
    demo: demo ? { mode: 'management', userText: text } : null,
    filterFiles: true,
    finalize: async ({ raw, display, aborted, demo: isDemo }) => {
      if (aborted && !display.trim()) return {};
      const parsed = filesLib.parseFileBlocks(raw);
      const toolCalls = toolsLib.parseToolBlocks(raw);
      let staged = { staged: [], errors: [], batch: null };
      if (!aborted && parsed.files.length) {
        try {
          staged = await management.stageFiles(parsed.files);
        } catch (err) {
          staged = { staged: [], errors: [{ path: '*', message: err.message }], batch: null };
        }
      }
      const content =
        toolsLib.stripToolBlocks(parsed.display).trim() ||
        (staged.staged.length ? `已暂存 ${staged.staged.length} 个文件的改动，确认后可应用。` : '（无内容）');
      const assistant = {
        id: shortId(4),
        role: 'assistant',
        content,
        ts: nowIso(),
        files: staged.staged,
        toolCalls,
        demo: Boolean(isDemo),
        interrupted: aborted || undefined,
      };
      state.management.messages.push(assistant);
      state.management.updatedAt = assistant.ts;
      await store.persist();
      sseSend(res, 'staged', { staged: staged.staged, errors: staged.errors, batch: staged.batch });
      return {
        message: assistant,
        staged: staged.staged,
        stageErrors: staged.errors,
        management: managementPayload().management,
        system: managementPayload().system,
      };
    },
  });
}

async function apiManagementApply(req, res) {
  try {
    const result = management.applyStaged();
    json(res, 200, { ...result, system: management.systemInfo(), management: managementPayload().management });
  } catch (err) {
    fail(res, 400, err.message);
  }
}

async function apiManagementDiscard(req, res) {
  management.discardStaged();
  json(res, 200, { ok: true, management: managementPayload().management });
}

async function apiManagementFile(req, res, url) {
  const rel = url.searchParams.get('path');
  if (!rel) return fail(res, 400, '缺少 path 参数');
  try {
    const file = await filesLib.readTextFile(management.CURRENT_DIR, rel);
    json(res, 200, file);
  } catch (err) {
    fail(res, 404, err.message);
  }
}


/* ------------------------------------------------------------------ */
/* static files                                                         */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.resolve(PUBLIC_DIR, `.${rel}`);
  if (!abs.startsWith(PUBLIC_DIR + path.sep) && abs !== PUBLIC_DIR) {
    return fail(res, 403, '禁止访问');
  }
  fs.stat(abs, (err, stat) => {
    if (err || !stat.isFile()) {
      return fail(res, 404, 'Not found');
    }
    const ext = path.extname(abs).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=60',
    });
    fs.createReadStream(abs).pipe(res);
  });
}

/* ------------------------------------------------------------------ */
/* router                                                               */
/* ------------------------------------------------------------------ */

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  if (pathname.startsWith('/api/')) {
    if (method === 'GET' && pathname === '/api/health') {
      return json(res, 200, { ok: true, name: 'DeepSeek Harness Console', version: VERSION });
    }
    if (pathname === '/api/state' && method === 'GET') return apiState(req, res);
    if (pathname === '/api/portfolio' && method === 'GET') return apiPortfolio(req, res);
    if (pathname === '/api/settings' && (method === 'GET' || method === 'POST')) {
      return apiSettings(req, res, url);
    }
    if (pathname === '/api/settings/test' && method === 'POST') return apiTestConnection(req, res);
    if (pathname === '/api/dsh/web' && method === 'POST') return apiDshWeb(req, res);

    if (pathname === '/api/memory' && method === 'GET') return apiMemoryList(req, res, url);
    if (pathname === '/api/memory' && method === 'POST') return apiMemoryCreate(req, res);
    if (pathname === '/api/memory/extract' && method === 'POST') return apiMemoryExtract(req, res);
    if (pathname === '/api/agent' && (method === 'GET' || method === 'POST')) return apiAgent(req, res);

    if (pathname === '/api/skills' && (method === 'GET' || method === 'POST')) return apiSkills(req, res, method);
    if (pathname === '/api/tools' && (method === 'GET' || method === 'POST')) return apiTools(req, res, method);
    if (pathname === '/api/tools/run' && method === 'POST') return apiToolRun(req, res);
    if (pathname === '/api/extensions' && (method === 'GET' || method === 'POST')) {
      return apiExtensions(req, res, method);
    }
    if (pathname === '/api/extensions/open-folder' && method === 'POST') {
      return apiExtensionsOpenFolder(req, res);
    }
    if (pathname === '/api/workspace/open' && method === 'POST') return apiOpenWorkspace(req, res);
    if (pathname === '/api/docs/extending' && method === 'GET') return apiDocsExtending(req, res);

    if (pathname === '/api/management' && method === 'GET') return apiManagementGet(req, res);
    if (pathname === '/api/management/chat' && method === 'POST') return apiManagementChat(req, res);
    if (pathname === '/api/management/apply' && method === 'POST') return apiManagementApply(req, res);
    if (pathname === '/api/management/discard' && method === 'POST') return apiManagementDiscard(req, res);
    if (pathname === '/api/management/file' && method === 'GET') return apiManagementFile(req, res, url);

    let memMatch = pathname.match(/^\/api\/memory\/([a-z0-9]+)$/);
    if (memMatch && method === 'PATCH') return apiMemoryUpdate(req, res, memMatch[1]);
    if (memMatch && method === 'DELETE') return apiMemoryDelete(req, res, memMatch[1]);

    let skillMatch = pathname.match(/^\/api\/skills\/([a-zA-Z0-9:_-]+)$/);
    if (skillMatch && method === 'DELETE') return apiSkillDelete(req, res, skillMatch[1]);

    let toolMatch = pathname.match(/^\/api\/tools\/([a-zA-Z0-9:_-]+)$/);
    if (toolMatch && method === 'DELETE') return apiToolDelete(req, res, toolMatch[1]);

    if (pathname === '/api/projects' && method === 'POST') return apiCreateProject(req, res);

    let m = pathname.match(/^\/api\/projects\/([a-z0-9]+)$/);
    if (m && method === 'GET') return apiProjectDetail(req, res, m[1]);
    if (m && method === 'DELETE') return apiDeleteProject(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/move$/);
    if (m && method === 'POST') return apiMoveProject(req, res, m[1]);
    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/rename$/);
    if (m && method === 'POST') return apiRenameProject(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/requirements\/chat$/);
    if (m && method === 'POST') return apiRequirementsChat(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/requirements\/doc$/);
    if (m && method === 'POST') return apiRequirementsDoc(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/doc\/export$/);
    if (m && method === 'GET') {
      const project = store.projectById(m[1]);
      if (!project?.doc) return fail(res, 404, '需求文档不存在');
      res.writeHead(200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="REQUIREMENTS.md"',
        'Cache-Control': 'no-store',
      });
      return res.end(project.doc.markdown);
    }

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/build\/start$/);
    if (m && method === 'POST') return apiBuildStart(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/build\/chat$/);
    if (m && method === 'POST') return apiBuildChat(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/files$/);
    if (m && method === 'GET') return apiProjectFiles(req, res, m[1]);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/file$/);
    if (m && method === 'GET') return apiProjectFile(req, res, m[1], url);

    m = pathname.match(/^\/api\/projects\/([a-z0-9]+)\/open-folder$/);
    if (m && method === 'POST') {
      const project = store.projectById(m[1]);
      if (!project) return fail(res, 404, '项目不存在');
      return apiOpenFolder(req, res, project.dir);
    }

    if (pathname === '/api/tasks' && method === 'POST') return apiCreateTask(req, res);

    m = pathname.match(/^\/api\/tasks\/([a-z0-9]+)$/);
    if (m && method === 'GET') return apiTaskDetail(req, res, m[1]);
    if (m && method === 'DELETE') return apiDeleteTask(req, res, m[1]);

    m = pathname.match(/^\/api\/tasks\/([a-z0-9]+)\/chat$/);
    if (m && method === 'POST') return apiTaskChat(req, res, m[1]);

    m = pathname.match(/^\/api\/tasks\/([a-z0-9]+)\/files$/);
    if (m && method === 'GET') return apiTaskFiles(req, res, m[1]);

    m = pathname.match(/^\/api\/tasks\/([a-z0-9]+)\/file$/);
    if (m && method === 'GET') return apiTaskFile(req, res, m[1], url);

    m = pathname.match(/^\/api\/tasks\/([a-z0-9]+)\/open-folder$/);
    if (m && method === 'POST') {
      const task = store.taskById(m[1]);
      if (!task) return fail(res, 404, '任务不存在');
      return apiOpenFolder(req, res, task.dir);
    }

    return fail(res, 404, `未知接口：${method} ${pathname}`);
  }

  if (method !== 'GET' && method !== 'HEAD') return fail(res, 405, 'Method not allowed');
  serveStatic(req, res, pathname);
}

/* ------------------------------------------------------------------ */
/* boot                                                                 */
/* ------------------------------------------------------------------ */

store.load();
const extensionRegistry = extensions.loadExtensions();
if (extensionRegistry.errors.length) {
  for (const error of extensionRegistry.errors) {
    console.warn(`[extensions] ${error.file}: ${error.message}`);
  }
}

let activeServer = null;

function createHttpServer() {
  return http.createServer((req, res) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      if (!req.url?.includes('/chat') && !req.url?.includes('/doc') && !req.url?.includes('/start')) {
        console.log(`[dsh] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - startedAt}ms`);
      }
    });
    route(req, res).catch((err) => {
      console.error('[server]', err);
      if (!res.headersSent) fail(res, 500, err.message || '服务器内部错误');
      else {
        try {
          res.end();
        } catch {
          /* ignore */
        }
      }
    });
  });
}

function openInBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

/**
 * Starts the console HTTP service. Used by the CLI and by the desktop shell
 * (Electron), which passes port 0 to obtain an ephemeral port.
 */
function startServer(options = {}) {
  const host = options.host || HOST;
  const port = options.port === undefined ? PORT : Number(options.port);
  const silent = options.silent === true;

  return new Promise((resolve, reject) => {
    const server = createHttpServer();
    activeServer = server;
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = async () => {
      server.off('error', onError);
      const actualPort = server.address().port;
      const url = `http://${host}:${actualPort}`;
      try {
        await rootInfo();
      } catch {
        /* the settings UI will surface the error */
      }
      if (!silent) {
        const cfg = getConfig();
        const root = await rootInfo();
        console.log('');
        console.log('  DeepSeek Harness 控制台');
        console.log(`  → ${url}`);
        console.log(`  模型：${cfg.model}   ${cfg.apiKey ? 'API 已连接' : '未配置 Key · 演示模式'}`);
        console.log(`  项目目录：${root.path}${root.writable ? '' : '（不可写）'}`);
        console.log('');
      }
      if (options.open || process.argv.includes('--open')) openInBrowser(url);
      resolve({ server, port: actualPort, url });
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function shutdown() {
  dshWeb.stopAll();
  if (!activeServer) {
    process.exit(0);
    return;
  }
  activeServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

if (require.main === module) {
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  startServer().catch((err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n端口 ${PORT} 已被占用。可以设置环境变量 DSH_CONSOLE_PORT 换一个端口，例如：`);
      console.error(`  $env:DSH_CONSOLE_PORT=4181; node server.js\n`);
    } else {
      console.error(`\n启动失败：${err.message}\n`);
    }
    process.exit(1);
  });
}

module.exports = { startServer, PORT, HOST };

