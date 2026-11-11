'use strict';

const store = require('./store');
const { chatOnce, backendFor } = require('./provider');
const { getConfig } = require('./config');
const { nowIso, shortId, truncate } = require('./util');
const { MEMORY_LABELS, selectMemories, enabledSkills, allTools } = require('./agent');

const VALID_TYPES = new Set(['profile', 'preference', 'decision', 'fact', 'project', 'conversation', 'task', 'insight']);

function normalizeType(type) {
  const value = String(type || 'fact').trim();
  return VALID_TYPES.has(value) ? value : 'fact';
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8);
  if (typeof tags === 'string') {
    return tags
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function normalizedKey(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .slice(0, 120)
    .toLowerCase();
}

function createMemory(input, { persist = true } = {}) {
  const state = store.getState();
  const content = String(input.content || '').trim();
  if (!content) throw new Error('记忆内容不能为空');
  const title = String(input.title || '').trim() || truncate(content, 24);
  const type = normalizeType(input.type);
  const key = normalizedKey(`${title}|${content}`);
  const duplicate = (state.memories || []).find((memory) => {
    if (memory.archived) return false;
    return normalizedKey(`${memory.title}|${memory.content}`) === key;
  });
  if (duplicate) {
    duplicate.updatedAt = nowIso();
    if (input.pinned !== undefined) duplicate.pinned = Boolean(input.pinned);
    if (persist) store.persist();
    return duplicate;
  }

  const memory = {
    id: shortId(5),
    type,
    title: truncate(title, 80),
    content: truncate(content, 4000),
    tags: normalizeTags(input.tags),
    pinned: Boolean(input.pinned),
    source: input.source || 'manual',
    sourceType: input.sourceType || null,
    sourceId: input.sourceId || null,
    projectId: input.projectId || null,
    taskId: input.taskId || null,
    projectName: input.projectName || '',
    confidence: input.confidence == null ? 1 : Number(input.confidence),
    archived: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  state.memories.unshift(memory);
  state.memories = state.memories.slice(0, 500);
  if (persist) store.persist();
  return memory;
}

function updateMemory(id, patch) {
  const state = store.getState();
  const memory = (state.memories || []).find((item) => item.id === id);
  if (!memory) return null;
  if (patch.title !== undefined) memory.title = truncate(String(patch.title).trim(), 80);
  if (patch.content !== undefined) memory.content = truncate(String(patch.content).trim(), 4000);
  if (patch.type !== undefined) memory.type = normalizeType(patch.type);
  if (patch.tags !== undefined) memory.tags = normalizeTags(patch.tags);
  if (patch.pinned !== undefined) memory.pinned = Boolean(patch.pinned);
  if (patch.archived !== undefined) memory.archived = Boolean(patch.archived);
  memory.updatedAt = nowIso();
  store.persist();
  return memory;
}

function deleteMemory(id) {
  const state = store.getState();
  const index = (state.memories || []).findIndex((item) => item.id === id);
  if (index < 0) return false;
  state.memories.splice(index, 1);
  store.persist();
  return true;
}

function rememberEvent({ type, title, content, tags, project, task, source = 'auto' }) {
  if (!content) return null;
  return createMemory({
    type,
    title,
    content,
    tags,
    source,
    sourceType: project ? 'project' : task ? 'task' : 'system',
    sourceId: project?.id || task?.id || null,
    projectId: project?.id || null,
    taskId: task?.id || null,
    projectName: project?.name || task?.title || '',
  });
}

function conversationText(messages, limit = 12) {
  return (messages || [])
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .filter((message) => message.kind !== 'doc')
    .slice(-limit)
    .map((message) => `${message.role === 'user' ? '用户' : 'DeepSeek'}：${truncate(message.content, 1600)}`)
    .join('\n\n');
}

function memorySourceMessages({ project, task, management }) {
  if (project) {
    return [...(project.requirements?.messages || []), ...(project.build?.messages || [])];
  }
  if (task) return task.messages || [];
  if (management) return management.messages || [];
  return [];
}

async function extractWithModel({ project, task, management }) {
  const cfg = getConfig();
  if (backendFor(cfg) === 'demo') return [];
  const state = store.getState();
  const messages = memorySourceMessages({ project, task, management });
  const transcript = conversationText(messages, 14);
  if (transcript.length < 20) return [];
  const existing = (state.memories || [])
    .filter((memory) => !memory.archived)
    .slice(0, 40)
    .map((memory) => `- ${memory.title}`)
    .join('\n');
  const contextName = project?.name || task?.title || '控制台软件管理';

  const system = `你是一个记忆整理器，负责从用户与 AI 的协作对话中，提取值得长期保留的信息。
只提取稳定、可复用、对以后有帮助的内容：用户偏好、关键决定、项目事实、约束、洞察。
不要提取寒暄、临时步骤、重复内容或模型自己的猜测。
输出严格 JSON，不要 Markdown 代码围栏，格式：
{"memories":[{"type":"profile|preference|decision|fact|project|insight","title":"不超过 30 字","content":"不超过 200 字","tags":["标签"]}]}
最多 3 条；如果没有任何值得记住的内容，返回 {"memories":[]}。`;

  const user = `当前上下文：${contextName}

已有记忆标题（避免重复）：
${existing || '（无）'}

最近对话：
${transcript}

请提取新的长期记忆。`;

  let raw;
  try {
    raw = await chatOnce({
      config: cfg,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      maxTokens: 700,
    });
  } catch (err) {
    console.warn('[memory] 自动提取失败:', err.message);
    return [];
  }

  let parsed;
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const items = Array.isArray(parsed?.memories) ? parsed.memories.slice(0, 3) : [];
  const added = [];
  for (const item of items) {
    if (!item || !item.content) continue;
    const memory = createMemory(
      {
        type: item.type,
        title: item.title,
        content: item.content,
        tags: item.tags,
        source: 'auto',
        sourceType: project ? 'project' : task ? 'task' : 'management',
        sourceId: project?.id || task?.id || null,
        projectId: project?.id || null,
        taskId: task?.id || null,
        projectName: project?.name || task?.title || '',
        confidence: 0.8,
      },
      { persist: false }
    );
    added.push(memory);
  }
  if (added.length) store.persist();
  return added;
}

function heuristicExtract({ project, task, management, force }) {
  if (!force) return [];
  const messages = memorySourceMessages({ project, task, management }).filter((m) => m.role === 'user');
  const last = messages[messages.length - 1];
  if (!last) return [];
  const name = project?.name || task?.title || '软件管理';
  const memory = createMemory({
    type: project ? 'project' : task ? 'task' : 'conversation',
    title: `对话要点 · ${name}`,
    content: truncate(last.content, 600),
    tags: ['对话', name],
    source: 'manual',
    sourceType: project ? 'project' : task ? 'task' : 'management',
    sourceId: project?.id || task?.id || null,
    projectId: project?.id || null,
    taskId: task?.id || null,
    projectName: name,
  });
  return [memory];
}

async function extractMemories({ project, task, management, force = false }) {
  const cfg = getConfig();
  if (cfg.autoMemory === false && !force) return [];
  if (!cfg.apiKey) return heuristicExtract({ project, task, management, force });
  return extractWithModel({ project, task, management });
}

function listConversations() {
  const state = store.getState();
  const projects = (state.projects || []).map((project) => {
    const messages = [...(project.requirements?.messages || []), ...(project.build?.messages || [])];
    const last = [...messages].reverse().find((m) => m.content);
    return {
      id: project.id,
      kind: 'project',
      name: project.name,
      title: project.name,
      dir: project.dir,
      messageCount: messages.length,
      userMessages: messages.filter((m) => m.role === 'user').length,
      docVersion: project.doc?.version || 0,
      fileCount: project.build?.files?.length || 0,
      updatedAt: project.updatedAt,
      preview: last ? truncate(last.content, 140) : '还没有对话',
      statusLabel: project.build?.startedAt ? '制作中' : project.doc ? '文档就绪' : messages.length ? '需求访谈中' : '待开始',
    };
  });
  const tasks = (state.tasks || []).map((task) => {
    const messages = task.messages || [];
    const last = [...messages].reverse().find((m) => m.content);
    return {
      id: task.id,
      kind: 'task',
      name: task.title,
      title: task.title,
      dir: task.dir,
      messageCount: messages.length,
      userMessages: messages.filter((m) => m.role === 'user').length,
      docVersion: 0,
      fileCount: task.files?.length || 0,
      updatedAt: task.updatedAt,
      preview: last ? truncate(last.content, 140) : '还没有对话',
      statusLabel: task.files?.length ? '已产出' : messages.length ? '进行中' : '待开始',
    };
  });
  return [...projects, ...tasks].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function memoryStats() {
  const state = store.getState();
  const active = (state.memories || []).filter((memory) => !memory.archived);
  const byType = {};
  for (const memory of active) byType[memory.type] = (byType[memory.type] || 0) + 1;
  return {
    total: active.length,
    pinned: active.filter((memory) => memory.pinned).length,
    byType,
    projects: state.projects.length,
    tasks: state.tasks.length,
    conversations: listConversations().length,
    skills: enabledSkills(state).length,
    tools: allTools(state).length,
  };
}

module.exports = {
  VALID_TYPES,
  MEMORY_LABELS,
  createMemory,
  updateMemory,
  deleteMemory,
  rememberEvent,
  extractMemories,
  listConversations,
  memoryStats,
  selectMemories,
};
