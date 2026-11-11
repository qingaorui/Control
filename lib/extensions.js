'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR } = require('./config');
const { nowIso } = require('./util');

const EXTENSIONS_DIR = path.join(DATA_DIR, 'extensions');
const EXAMPLE_README = `# 控制台扩展接口

把 \`.js\` 文件放进这个目录，重启控制台后自动加载。

## 模块格式

\`\`\`js
module.exports = {
  id: 'my-toolkit',              // 唯一标识
  name: '我的工具包',
  version: '1.0.0',
  description: '一句话说明',

  // 可选的提示词技能
  skills: [
    {
      name: '输出检查清单',
      description: '每次交付前补充检查清单',
      instructions: '在最终回复末尾追加一个 3–6 项的检查清单。'
    }
  ],

  // 可执行工具
  tools: [
    {
      name: 'workspace_stats',
      description: '返回当前工作目录与时间',
      schema: '{"type":"object","properties":{}}',
      async execute(args, ctx) {
        // ctx.root   当前项目/任务目录
        // ctx.entity 当前项目或任务对象
        // ctx.state  控制台状态
        return { ok: true, root: ctx.root, now: new Date().toISOString() };
      }
    }
  ]
};
\`\`\`

- 工具函数可以是异步的，返回值会序列化后交给模型。
- 工具名称必须唯一，建议使用英文小写与下划线。
- 扩展代码在本机主进程执行，请只加载你信任的文件。
- 修改扩展后重启应用生效。技能与工具页会显示加载错误。
`;

const EXAMPLE_MODULE = `'use strict';

/**
 * 示例扩展：一个技能 + 一个只读工具。
 * 复制这个文件改一改，就能添加自己的扩展。
 */
module.exports = {
  id: 'example-toolkit',
  name: '示例扩展',
  version: '1.0.0',
  description: '演示如何添加技能与工具（可安全删除）',

  skills: [
    {
      name: '交付检查',
      description: '在交付类回复末尾附上可执行的检查清单',
      instructions:
        '当你在交付文件或方案时，在回复末尾追加一个「交付检查」小节，包含 3–6 条可勾选的检查项，覆盖运行、边界、错误提示和验收。'
    }
  ],

  tools: [
    {
      name: 'workspace_stats',
      description: '返回当前工作目录、时间和已启用的技能数量（只读）',
      schema: '{"type":"object","properties":{}}',
      async execute(args, ctx) {
        const state = ctx.state || {};
        return {
          root: ctx.root,
          now: new Date().toISOString(),
          skills: (state.skills || []).filter((s) => s.enabled !== false).length,
          files: 0
        };
      }
    }
  ]
};
`;

let registry = null;
let loadedAt = null;

function ensureDir() {
  fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
  const readme = path.join(EXTENSIONS_DIR, 'README.md');
  if (!fs.existsSync(readme)) fs.writeFileSync(readme, EXAMPLE_README, 'utf8');
  const example = path.join(EXTENSIONS_DIR, 'example.js');
  if (!fs.existsSync(example)) fs.writeFileSync(example, EXAMPLE_MODULE, 'utf8');
}

function normalizeSkill(moduleId, moduleName, skill, index) {
  const name = String(skill.name || '').trim();
  if (!name) throw new Error(`技能 #${index + 1} 缺少 name`);
  return {
    id: `ext:${moduleId}:skill:${index}`,
    name,
    description: String(skill.description || '').trim(),
    instructions: String(skill.instructions || skill.prompt || '').trim(),
    enabled: skill.enabled !== false,
    builtin: false,
    extension: true,
    moduleId,
    moduleName,
    tags: Array.isArray(skill.tags) ? skill.tags.map(String) : ['扩展'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function normalizeTool(moduleId, moduleName, tool, index) {
  const name = String(tool.name || '').trim();
  if (!name) throw new Error(`工具 #${index + 1} 缺少 name`);
  if (typeof tool.execute !== 'function') throw new Error(`工具 ${name} 缺少 execute 函数`);
  return {
    id: `ext:${moduleId}:tool:${index}`,
    name,
    label: String(tool.label || tool.name || '').trim(),
    description: String(tool.description || '').trim(),
    type: 'extension',
    schema: typeof tool.schema === 'string' ? tool.schema : JSON.stringify(tool.schema || { type: 'object', properties: {} }),
    enabled: tool.enabled !== false,
    builtin: false,
    extension: true,
    moduleId,
    moduleName,
    config: {},
    execute: tool.execute,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function loadExtensions() {
  ensureDir();
  const modules = [];
  const errors = [];

  let entries = [];
  try {
    entries = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true });
  } catch (err) {
    errors.push({ file: EXTENSIONS_DIR, message: err.message });
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = path.join(EXTENSIONS_DIR, entry.name);
    try {
      delete require.cache[require.resolve(file)];
      const mod = require(file);
      const id = String(mod.id || path.basename(entry.name, '.js')).trim();
      const moduleName = String(mod.name || id).trim();
      if (!id) throw new Error('模块缺少 id');
      const skills = Array.isArray(mod.skills)
        ? mod.skills.map((skill, index) => normalizeSkill(id, moduleName, skill, index))
        : [];
      const tools = Array.isArray(mod.tools)
        ? mod.tools.map((tool, index) => normalizeTool(id, moduleName, tool, index))
        : [];
      modules.push({
        id,
        name: moduleName,
        version: String(mod.version || '1.0.0'),
        description: String(mod.description || '').trim(),
        file: entry.name,
        skills,
        tools,
        systemPrompt: typeof mod.systemPrompt === 'function' ? mod.systemPrompt : null,
        promptFragment: typeof mod.systemPrompt === 'string' ? mod.systemPrompt : '',
      });
    } catch (err) {
      errors.push({ file: entry.name, message: err.message });
    }
  }

  registry = { modules, errors, loadedAt: nowIso(), dir: EXTENSIONS_DIR };
  loadedAt = registry.loadedAt;
  return registry;
}

function getExtensions() {
  if (!registry) loadExtensions();
  return registry;
}

function extensionSkills() {
  return getExtensions().modules.flatMap((mod) => mod.skills);
}

function extensionTools() {
  return getExtensions().modules.flatMap((mod) => mod.tools);
}

module.exports = {
  EXTENSIONS_DIR,
  loadExtensions,
  getExtensions,
  extensionSkills,
  extensionTools,
  loadedAt: () => loadedAt,
};
