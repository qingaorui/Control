'use strict';

const { nowIso } = require('./util');

const DEFAULT_AGENT = {
  name: '我的智能体',
  role: '务实的软件搭档，负责把想法落成可运行、可验收的成果',
  tone: '简洁、直接，先结论后细节；不确定时明确说明',
  principles:
    '先澄清再动手；不编造事实；重要决定留痕；优先最小可运行闭环；修改时保持现有接口兼容。',
  preferences:
    '默认使用简体中文；优先零依赖、可本地直接运行的方案；项目文件写入 D 盘项目目录。',
  updatedAt: null,
};

function builtinSkills() {
  const ts = nowIso();
  return [
    {
      id: 'builtin:skill:requirements',
      name: '需求澄清',
      description: '把模糊想法追问成目标、边界和可测试的验收标准。',
      instructions:
        '在需求讨论中，每轮最多提出 3 个关键问题，优先覆盖目标用户、核心场景、范围边界、数据来源和验收标准。每个问题尽量给出可选项或推荐默认答案。用户没有明确的信息标注「待确认」，不要编造。信息足够时，用 3–5 条要点复述共识。',
      enabled: true,
      builtin: true,
      tags: ['需求', '访谈'],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'builtin:skill:prototype',
      name: '可运行原型',
      description: '用零依赖 HTML/CSS/JS 做出可直接打开的专业原型。',
      instructions:
        '实现原型时优先使用零依赖的 HTML/CSS/JS，保证双击 index.html 即可运行。界面要完整：有清晰的层级、空状态、错误提示和基本交互。不要引用外部 CDN 或需要构建的依赖。所有文件给出完整内容，并用 FILE 块输出。',
      enabled: true,
      builtin: true,
      tags: ['前端', '原型'],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'builtin:skill:review',
      name: '代码审查',
      description: '按严重级别审查正确性、边界、安全和可维护性。',
      instructions:
        '代码审查时先给一句总体结论，再按「阻断 / 重要 / 建议」列出问题。每条问题说明位置、原因和具体修复方式。重点检查：输入边界、空状态、错误处理、路径安全、数据持久化、并发与性能、可维护性。不要只夸赞，也不要编造未看到的代码。',
      enabled: true,
      builtin: true,
      tags: ['质量', '审查'],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'builtin:skill:acceptance',
      name: '验收测试',
      description: '把验收标准转成可逐条执行的测试清单。',
      instructions:
        '把每条验收标准转换为「前置条件 → 操作 → 预期结果」的测试步骤，覆盖正常流、异常流和边界情况。输出可直接照着点的清单，并指出没有覆盖到的风险。',
      enabled: true,
      builtin: true,
      tags: ['测试', '验收'],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'builtin:skill:handoff',
      name: '交付说明',
      description: '为项目补齐运行方式、目录说明和验收路径。',
      instructions:
        '交付时补充 README：如何运行、依赖要求、目录结构、主要功能、验收路径和已知限制。面向非技术用户也能照着操作。修改代码后同步更新说明文件。',
      enabled: true,
      builtin: true,
      tags: ['文档', '交付'],
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function builtinTools() {
  const ts = nowIso();
  const make = (id, name, label, description, schema, handler) => ({
    id,
    name,
    label,
    description,
    type: 'builtin',
    handler,
    config: {},
    schema,
    enabled: true,
    builtin: true,
    createdAt: ts,
    updatedAt: ts,
  });

  return [
    make(
      'builtin:tool:list_files',
      'list_files',
      '列出项目文件',
      '列出当前项目或任务目录中的文件与大小。没有参数。',
      '{"type":"object","properties":{}}',
      'list_files'
    ),
    make(
      'builtin:tool:read_file',
      'read_file',
      '读取项目文件',
      '读取当前项目或任务目录中的文本文件。参数：path（相对路径）。',
      '{"type":"object","properties":{"path":{"type":"string","description":"相对项目目录的文件路径"}},"required":["path"]}',
      'read_file'
    ),
    make(
      'builtin:tool:write_file',
      'write_file',
      '写入项目文件',
      '把完整内容写入当前项目或任务目录。参数：path、content。写入前应确认这是用户需要的修改。',
      '{"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"]}',
      'write_file'
    ),
    make(
      'builtin:tool:fetch_url',
      'fetch_url',
      '抓取网页',
      '抓取一个 http(s) 地址并返回文本内容（最多 20000 字符）。参数：url。',
      '{"type":"object","properties":{"url":{"type":"string","description":"http 或 https 地址"}},"required":["url"]}',
      'fetch_url'
    ),
    make(
      'builtin:tool:current_time',
      'current_time',
      '当前时间',
      '返回本机当前日期、时间和时区。',
      '{"type":"object","properties":{}}',
      'current_time'
    ),
    make(
      'builtin:tool:self_list_files',
      'self_list_files',
      '列出控制台源码',
      '列出控制台自身的源码文件，用于软件管理对话。',
      '{"type":"object","properties":{}}',
      'self_list_files'
    ),
    make(
      'builtin:tool:self_read_file',
      'self_read_file',
      '读取控制台源码',
      '读取控制台自身的源码文件。参数：path（相对于应用根目录）。',
      '{"type":"object","properties":{"path":{"type":"string"}},"required":["path"]}',
      'self_read_file'
    ),
  ];
}

module.exports = { DEFAULT_AGENT, builtinSkills, builtinTools };
