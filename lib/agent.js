'use strict';

const store = require('./store');
const { extensionSkills, extensionTools, getExtensions } = require('./extensions');

const MEMORY_LABELS = {
  profile: '个人档案',
  preference: '偏好',
  decision: '决定',
  fact: '事实',
  project: '项目记忆',
  conversation: '对话记忆',
  task: '任务记忆',
  insight: '洞察',
};

function truncate(text, max) {
  const s = String(text || '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function selectMemories(state, { projectId, taskId }) {
  const all = (state.memories || []).filter((m) => !m.archived);
  const scored = all.map((memory) => {
    let score = 0;
    if (memory.pinned) score += 100;
    if (projectId && memory.projectId === projectId) score += 40;
    if (taskId && memory.taskId === taskId) score += 40;
    const age = Date.now() - new Date(memory.updatedAt || memory.createdAt || 0).getTime();
    if (age < 7 * 86400000) score += 10;
    if (age < 86400000) score += 6;
    if (memory.source === 'manual') score += 6;
    if (memory.type === 'profile' || memory.type === 'preference') score += 12;
    return { memory, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 14).map((item) => item.memory);
}

function memorySection(state, ctx) {
  const memories = selectMemories(state, ctx);
  if (!memories.length) return '';
  const lines = memories.map((memory) => {
    const label = MEMORY_LABELS[memory.type] || memory.type || '记忆';
    const pinned = memory.pinned ? '（置顶）' : '';
    return `- [${label}]${pinned} ${memory.title || ''}：${truncate(memory.content, 360)}`;
  });
  return `## 长期记忆\n以下是你与用户过往协作中沉淀的记忆，请在相关时主动使用，不要机械复述：\n${lines.join('\n')}`;
}

function agentSection(state) {
  const agent = state.agent || {};
  const lines = [];
  if (agent.name) lines.push(`- 名称：${agent.name}`);
  if (agent.role) lines.push(`- 角色：${agent.role}`);
  if (agent.tone) lines.push(`- 语气：${agent.tone}`);
  if (agent.principles) lines.push(`- 原则：${agent.principles}`);
  if (agent.preferences) lines.push(`- 偏好：${agent.preferences}`);
  if (!lines.length) return '';
  return `## 我的智能体\n你不是通用助手，而是下面这个专属智能体。保持人设一致：\n${lines.join('\n')}`;
}

function enabledSkills(state) {
  const local = (state.skills || []).filter((skill) => skill.enabled !== false);
  const extension = extensionSkills().filter((skill) => skill.enabled !== false);
  return [...local, ...extension];
}

function skillsSection(state) {
  const skills = enabledSkills(state);
  if (!skills.length) return '';
  const lines = skills.map((skill) => `- ${skill.name}：${skill.description || ''}`);
  const detailed = skills
    .filter((skill) => skill.instructions)
    .slice(0, 8)
    .map((skill) => `### 技能：${skill.name}\n${truncate(skill.instructions, 1400)}`);
  return `## 已启用的技能\n${lines.join('\n')}\n\n在合适的时候遵循以下技能说明：\n${detailed.join('\n\n')}`;
}

function allTools(state) {
  const local = (state.tools || []).filter((tool) => tool.enabled !== false);
  const extension = extensionTools().filter((tool) => tool.enabled !== false);
  const seen = new Set();
  const result = [];
  for (const tool of [...local, ...extension]) {
    if (seen.has(tool.name)) continue;
    seen.add(tool.name);
    result.push(tool);
  }
  return result;
}

function toolsSection(state, ctx) {
  if (!ctx.allowTools) return '';
  const tools = allTools(state);
  if (!tools.length) return '';
  const lines = tools.map(
    (tool) => `- ${tool.name}：${tool.description || tool.label || ''}\n  参数 Schema：${truncate(tool.schema || '{}', 500)}`
  );
  return `## 可用工具
${lines.join('\n')}

需要外部信息或执行动作时，可以请求调用工具。调用格式必须严格如下，一次只请求一个工具：
<<<TOOL name="工具名">>>
{"参数名":"参数值"}
<<<END TOOL>>>
请求后停止输出，等待用户批准执行。不要在未拿到结果时编造工具结果。用户执行后会把结果发回对话。
文件类工具作用于当前工作目录；软件管理对话中只能使用 self_ 前缀的工具。`;
}

function extensionSection() {
  const { modules } = getExtensions();
  const fragments = modules.filter((mod) => mod.promptFragment).map((mod) => mod.promptFragment);
  if (!fragments.length) return '';
  return `## 扩展提供的指令\n${fragments.map((fragment) => truncate(fragment, 1200)).join('\n\n')}`;
}

function composeSystem(base, ctx = {}) {
  const state = store.getState();
  const sections = [
    agentSection(state),
    memorySection(state, ctx),
    skillsSection(state),
    toolsSection(state, ctx),
    extensionSection(),
  ].filter(Boolean);
  if (!sections.length) return base;
  return `${base}\n\n${sections.join('\n\n')}`;
}

function contextStats(ctx = {}) {
  const state = store.getState();
  return {
    memories: selectMemories(state, ctx).length,
    skills: enabledSkills(state).length,
    tools: ctx.allowTools ? allTools(state).length : 0,
    extensions: getExtensions().modules.length,
  };
}

module.exports = { composeSystem, contextStats, allTools, enabledSkills, MEMORY_LABELS, selectMemories };
