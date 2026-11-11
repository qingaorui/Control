# 扩展与二次开发接口

控制台从设计上就是可扩展的。核心能力保持不变，新增能力优先通过这里描述的接口完成。

## 1. 目录地图

```
server.js            零依赖 HTTP 服务：API、SSE、文件写入、静态资源
lib/config.js        配置、数据目录、API Base
lib/store.js         JSON 持久化（data/store.json）
lib/prompts.js       需求分析师 / 执行工程师 / 任务模式提示词
lib/agent.js         记忆、技能、工具注入到系统提示词
lib/memory.js        长期记忆提取与对话档案
lib/tools.js         工具注册、解析、执行
lib/extensions.js    data/extensions/*.js 扩展加载器
lib/management.js    软件管理暂存、应用、备份
public/              原生前端（无构建步骤）
desktop/             主界面（WebView2）+ 外部对话浏览器窗口 + 托盘
data/                运行数据、设置、扩展、备份（不打包进应用）
```

## 2. 扩展模块

在数据目录的 `extensions/` 下放 `.js` 文件。桌面版路径：

```
%APPDATA%\DeepSeek Harness Console\data\extensions\
```

```js
module.exports = {
  id: 'my-toolkit',          // 唯一
  name: '我的工具包',
  version: '1.0.0',
  description: '一句话说明',

  skills: [
    {
      name: '输出检查清单',
      description: '交付前补充检查项',
      instructions: '在最终回复末尾追加 3–6 条检查项。'
    }
  ],

  tools: [
    {
      name: 'workspace_stats',
      description: '返回工作目录与时间',
      schema: '{"type":"object","properties":{}}',
      async execute(args, ctx) {
        return { root: ctx.root, now: new Date().toISOString() };
      }
    }
  ],

  // 可选：全局提示词片段（字符串）
  systemPrompt: '始终使用简体中文。'
};
```

加载后会出现在「技能与工具」页。扩展技能/工具只读，修改源文件后点「重新加载扩展」或重启。

### 工具执行上下文

`execute(args, ctx)` 的 `ctx`：

| 字段 | 说明 |
| --- | --- |
| `root` | 当前项目/任务目录；软件管理为应用根目录 |
| `scope` | `project` / `task` / `self` |
| `project` | 当前项目对象（可能为空） |
| `task` | 当前任务对象（可能为空） |
| `state` | 当前完整状态（只读使用） |

返回值可以是字符串或可 JSON 序列化对象，会被截断到 20000 字符后交给模型。

## 3. 技能

技能是提示词片段，不是可执行代码。

- 存储：`state.skills`，字段 `name / description / instructions / enabled / tags`。
- 注入：`lib/agent.js` 的 `skillsSection`。启用技能会进入所有对话的系统提示词；完整说明最多取 8 条，每条 1400 字符。
- 新增方式：界面「技能与工具 → 新增技能」，或扩展模块。

## 4. 工具协议

模型不直接执行工具，而是发起请求，用户批准后由服务端执行：

```
<<<TOOL name="read_file">>>
{"path":"README.md"}
<<<END TOOL>>>
```

- 服务端从流式输出中过滤工具块，解析为 `message.toolCalls`。
- 界面对每个请求显示「运行」按钮；执行结果进入工具运行历史，可复制或填回输入框。
- 内置工具：`list_files`、`read_file`、`write_file`、`fetch_url`、`current_time`、`self_list_files`、`self_read_file`。
- 自定义工具：
  - `http`：URL / Method / Headers / Body，支持 `{{参数名}}` 占位符。
  - `command`：`cmd.exe /c` 执行，支持 `{{参数名}}`；**只应添加你信任的命令**。
- 扩展工具：`type = extension`，由模块的 `execute` 实现。
- 执行入口：`lib/tools.js` 的 `executeTool`，记录到 `state.toolRuns`（最多 150 条）。

## 5. 记忆

```js
{
  id, type,          // profile | preference | decision | fact | project | conversation | task | insight
  title, content,
  tags: [],
  pinned: false,
  source,            // manual | auto
  projectId, taskId, projectName,
  createdAt, updatedAt
}
```

- 存储：`state.memories`，最多 500 条。
- 自动提取：对话完成后由 `lib/memory.js` 调用 DeepSeek 提取稳定信息；设置中可关闭 `autoMemory`。
- 注入：`lib/agent.js` 的 `memorySection`，按置顶、当前项目、近期加权选 14 条，每条最多 360 字符。
- 我的智能体：`state.agent` 的 `name / role / tone / principles / preferences`，始终注入所有对话。

## 6. 提示词组合

所有对话都走同一条组合链：

```js
agentLib.composeSystem(basePrompt, {
  projectId, taskId,
  allowTools: true | false
})
```

输出顺序：

1. 智能体画像
2. 长期记忆
3. 已启用技能
4. 可用工具与调用协议（仅 `allowTools`）
5. 扩展提示词片段
6. 基础角色提示词（需求分析师 / 执行工程师 / 维护工程师）

需要新增注入来源时，在 `lib/agent.js` 增加一个 `xxxSection` 并加入 `composeSystem` 即可，不要改各对话路由。

## 7. 软件管理（自更新）

「软件管理」对话使用 `lib/management.js` 的维护工程师提示词。

- 模型只能修改白名单路径：
  - `public/`、`lib/`、`docs/`、`desktop/`、`scripts/`、`assets/`
  - `server.js`、`package.json`、`README.md`
- 输出文件先写入 `data/self-updates/current/`，不会直接覆盖运行中的代码。
- 「应用更新」会：
  1. 备份原文件到 `data/backups/<时间戳>/`
  2. 复制暂存文件到应用根目录
  3. 提示重启应用
- 不允许修改 `data/`、`release/`、`node_modules/`、`.runtime/`。

新增 UI 页面时，同时更新 `public/app.js` 的路由与 `public/styles.css`；新增 API 时在 `server.js` 路由与本文档登记。

## 8. HTTP API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/state` | 项目、任务、计数、设置 |
| GET/POST | `/api/memory` | 列出 / 新增记忆 |
| PATCH/DELETE | `/api/memory/:id` | 更新 / 删除 |
| POST | `/api/memory/extract` | 从对话提取 |
| GET/POST | `/api/agent` | 读取 / 更新智能体画像 |
| GET/POST | `/api/skills` | 列出 / 新增或更新技能 |
| DELETE | `/api/skills/:id` | 删除技能 |
| GET/POST | `/api/tools` | 列出 / 新增或更新工具 |
| DELETE | `/api/tools/:id` | 删除工具 |
| POST | `/api/tools/run` | 按名称执行工具 |
| GET/POST | `/api/extensions` | 查看 / 重新加载扩展 |
| GET | `/api/management` | 软件管理状态、暂存区 |
| POST | `/api/management/chat` | SSE 软件管理对话 |
| POST | `/api/management/apply` | 应用暂存更新 |
| POST | `/api/management/discard` | 放弃暂存 |
| GET | `/api/management/file` | 预览暂存文件 |
| POST | `/api/workspace/open` | 在资源管理器中打开当前工作区根目录 |

SSE 事件：`start`、`delta`、`files`、`staged`、`error`、`done`。

## 9. 兼容性约定

1. 已有字段只增不删；新增字段必须有默认值。
2. 路由路径保持稳定；破坏性变更使用新路径。
3. 扩展工具名唯一，建议小写英文与下划线。
4. 文件协议 `<<<FILE path="...">>>` 与工具协议 `<<<TOOL name="...">>>` 不要更改，否则历史消息和模型行为会不兼容。
5. 修改存储结构时在 `lib/store.js` 的 `load()` 做迁移，并在 `docs/` 记录版本。
6. 每次改动跑 `npm test`，并至少手测一次需求文档 → 项目制作流程。

## 10. 本地调试

```powershell
npm start          # http://127.0.0.1:4180
npm test           # API 冒烟
npm run build:desktop
```

桌面版日志：

```
%APPDATA%\DeepSeek Harness Console\logs\server.log
```
