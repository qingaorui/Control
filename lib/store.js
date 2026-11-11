'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR } = require('./config');
const { nowIso, shortId } = require('./util');
const { DEFAULT_AGENT, builtinSkills, builtinTools } = require('./builtins');

const STORE_FILE = path.join(DATA_DIR, 'store.json');

let state = null;
let writeChain = Promise.resolve();

function defaultManagement() {
  return {
    messages: [],
    staged: [],
    batch: null,
    updatedAt: null,
    appliedAt: null,
  };
}

function emptyState() {
  return {
    version: 2,
    projects: [],
    tasks: [],
    memories: [],
    skills: [],
    tools: [],
    toolRuns: [],
    agent: { ...DEFAULT_AGENT },
    management: defaultManagement(),
    meta: { seedVersion: 1 },
  };
}

function seedBuiltins(target) {
  const now = nowIso();
  const skillIds = new Set((target.skills || []).map((s) => s.id));
  for (const skill of builtinSkills()) {
    if (!skillIds.has(skill.id)) target.skills.push(skill);
  }
  const toolIds = new Set((target.tools || []).map((t) => t.id));
  for (const tool of builtinTools()) {
    if (!toolIds.has(tool.id)) target.tools.push(tool);
  }
  target.meta = target.meta || {};
  target.meta.seedVersion = 1;
  target.agent = target.agent || { ...DEFAULT_AGENT, updatedAt: now };
}

function load() {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch {
    raw = {};
  }
  state = {
    ...emptyState(),
    ...raw,
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    memories: Array.isArray(raw.memories) ? raw.memories : [],
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    tools: Array.isArray(raw.tools) ? raw.tools : [],
    toolRuns: Array.isArray(raw.toolRuns) ? raw.toolRuns : [],
    management: raw.management && Array.isArray(raw.management.messages)
      ? { ...defaultManagement(), ...raw.management }
      : defaultManagement(),
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : { seedVersion: 0 },
  };
  if (!state.agent || typeof state.agent !== 'object') state.agent = { ...DEFAULT_AGENT };

  let migrated = false;
  const ids = new Set(state.projects.map((project) => project.id));
  for (const project of state.projects) {
    if (project.parentId === undefined) {
      project.parentId = null;
      migrated = true;
    }
    if (project.folderId === undefined) {
      project.folderId = null;
      migrated = true;
    }
    if (project.kind !== 'folder' && project.kind !== 'project') {
      project.kind = 'project';
      migrated = true;
    }
  }
  const byId = new Map(state.projects.map((project) => [project.id, project]));
  for (const project of state.projects) {
    if (project.kind === 'folder') {
      const parent = project.parentId ? byId.get(project.parentId) : null;
      if (project.parentId && (!parent || parent.kind !== 'folder')) {
        project.parentId = null;
        migrated = true;
      }
      if (project.folderId) {
        project.folderId = null;
        migrated = true;
      }
    } else {
      const oldParent = project.parentId ? byId.get(project.parentId) : null;
      let folderId = project.folderId || null;
      if (oldParent) {
        folderId = oldParent.kind === 'folder' ? oldParent.id : oldParent.folderId || null;
      }
      const folder = folderId ? byId.get(folderId) : null;
      if (!folder || folder.kind !== 'folder') folderId = null;
      if (project.folderId !== folderId) {
        project.folderId = folderId;
        migrated = true;
      }
      if (project.parentId !== null) {
        project.parentId = null;
        migrated = true;
      }
    }
  }
  const projectIds = new Set(state.projects.map((project) => project.id));
  for (const task of state.tasks) {
    if (task.projectId === undefined) {
      task.projectId = null;
      migrated = true;
    }
    if (task.projectId && !projectIds.has(task.projectId)) {
      task.projectId = null;
      migrated = true;
    }
  }

  if ((state.meta.seedVersion || 0) < 1) {
    seedBuiltins(state);
    persist();
  } else if (migrated) {
    persist();
  }
  return state;
}

function getState() {
  if (!state) load();
  return state;
}

function persist() {
  if (!state) return Promise.resolve();
  const snapshot = JSON.stringify(state, null, 2);
  writeChain = writeChain
    .then(async () => {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${STORE_FILE}.tmp`;
      await fs.promises.writeFile(tmp, snapshot, 'utf8');
      await fs.promises.rename(tmp, STORE_FILE);
    })
    .catch((err) => {
      console.error('[store] 保存失败:', err);
    });
  return writeChain;
}

function projectById(id) {
  return getState().projects.find((p) => p.id === id) || null;
}

function projectDescendants(id, includeSelf = true) {
  const entries = getState().projects;
  const self = entries.find((item) => item.id === id);
  if (!self) return [];
  if (self.kind === 'project') return includeSelf ? [self] : [];
  const folderIds = new Set([id]);
  const result = includeSelf ? [self] : [];
  const queue = [id];
  while (queue.length) {
    const parent = queue.shift();
    for (const entry of entries) {
      if (entry.kind !== 'folder' || entry.parentId !== parent || folderIds.has(entry.id)) continue;
      folderIds.add(entry.id);
      result.push(entry);
      queue.push(entry.id);
    }
    for (const entry of entries) {
      if (entry.kind !== 'project' || entry.folderId !== parent) continue;
      if (!result.some((item) => item.id === entry.id)) result.push(entry);
    }
  }
  return result;
}

function projectAncestors(id) {
  const projects = getState().projects;
  const self = projects.find((item) => item.id === id);
  if (!self) return [];
  const result = [];
  const seen = new Set();
  let parentId = self.kind === 'folder' ? self.parentId : self.folderId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = projects.find((item) => item.id === parentId);
    if (!parent) break;
    result.unshift(parent);
    parentId = parent.kind === 'folder' ? parent.parentId : parent.folderId;
  }
  return result;
}

function taskById(id) {
  return getState().tasks.find((t) => t.id === id) || null;
}

function createProject({ name, description, slug, dir, parentId, folderId, kind }) {
  const ts = nowIso();
  const project = {
    id: shortId(6),
    name,
    description: description || '',
    slug,
    dir,
    parentId: kind === 'folder' ? parentId || null : null,
    folderId: kind === 'folder' ? null : folderId || null,
    kind: kind === 'folder' ? 'folder' : 'project',
    createdAt: ts,
    updatedAt: ts,
    doc: null,
    requirements: {
      messages: [],
      updatedAt: null,
    },
    build: {
      messages: [],
      status: 'idle',
      startedAt: null,
      finishedAt: null,
      files: [],
    },
  };
  getState().projects.unshift(project);
  return project;
}

function removeProject(id) {
  const s = getState();
  const idx = s.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = s.projects.splice(idx, 1);
  return removed;
}

function createTask({ title, slug, dir, projectId }) {
  const ts = nowIso();
  const task = {
    id: shortId(6),
    title,
    slug,
    dir,
    projectId: projectId || null,
    createdAt: ts,
    updatedAt: ts,
    messages: [],
    files: [],
    status: 'idle',
  };
  getState().tasks.unshift(task);
  return task;
}

function removeTask(id) {
  const s = getState();
  const idx = s.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const [removed] = s.tasks.splice(idx, 1);
  return removed;
}

function mutateProject(id, fn) {
  const project = projectById(id);
  if (!project) return null;
  fn(project);
  project.updatedAt = nowIso();
  return project;
}

function mutateTask(id, fn) {
  const task = taskById(id);
  if (!task) return null;
  fn(task);
  task.updatedAt = nowIso();
  return task;
}

module.exports = {
  STORE_FILE,
  load,
  getState,
  persist,
  projectById,
  projectDescendants,
  projectAncestors,
  taskById,
  createProject,
  removeProject,
  createTask,
  removeTask,
  mutateProject,
  mutateTask,
  emptyState,
  defaultManagement,
};
