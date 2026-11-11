# DeepSeek Harness 控制台

一个本地运行的 DeepSeek 工作台：把模糊想法聊成可验收的需求文档，交给执行工程师落成文件，并把每次协作沉淀为长期记忆、技能和工具，最终形成专属于你的智能体。

## 仓库与下载

- GitHub：https://github.com/qingaorui/Control
- Release：https://github.com/qingaorui/Control/releases/tag/v1.0.0
- 安装包：https://github.com/qingaorui/Control/releases/download/v1.0.0/Control-v1.0.0.zip

提供两种运行方式：

- **桌面版（推荐）**：`DeepSeek Harness Console.exe`，白色主界面，对话使用控制台自己的页面，安装一次长期使用。
- **源码版**：Node.js 本地服务 + 浏览器访问 `http://127.0.0.1:4180`。

## 对话后端

默认是 `auto`：

1. 检测到本机已安装 `dsh`，且存在 DSH 登录凭据时，对话直接调用 **已安装的 DeepSeek Harness**（`dsh headless`），复用它的模型、登录和凭据，不需要在控制台里再填 API Key。
2. 否则，如果配置了 DeepSeek API Key，使用 DeepSeek API。
3. 两者都没有时进入演示模式。

设置里可以显式选择「本机 DeepSeek Harness」或「DeepSeek API」。DSH 模式每轮对话会作为一次 headless 任务执行，回复完成后返回；控制台会把完整对话记录交给它，避免依赖额外的会话状态。

DSH 模式要求：

- 本机已经安装 `dsh`（当前检测路径会显示在设置里）。
- 已经在 DeepSeek Harness 中登录或配置了模型凭据。
- 应用以普通用户身份启动，能够读写 `%USERPROFILE%\.dsh`。如果从受限工作区启动，DSH 可能无法写入会话目录。

### 对话框页面

- 设置里的「对话框窗口」默认是 **控制台自己的对话页**，在本地浏览器标签中打开；也可切换为独立应用窗口。
- 对话内容仍由本机 DSH headless 或 DeepSeek API 生成，项目树、对话记录、记忆和成果都留在控制台内。
- 控制台不再强制打开 DSH Web，也不会修改你全局的 `%USERPROFILE%\.dsh`。

---

## 1. 工作区

### 项目

项目由文件夹组织：

- 文件夹可以有上下级；项目只是文件夹里的条目，项目之间不再有上下级关系。
- 新建项目时选择「所在文件夹」，新建文件夹时选择「上级文件夹」。
- 项目总览会显示文件夹下的子文件夹与项目。
- 点击项目不会再把侧边栏过滤成只剩该项目；完整项目树仍然显示，只高亮当前项目。
- 可以把项目或文件夹拖到文件夹上完成移动。
- 每个项目包含两个独立对话，工作区一次只显示当前对话：

1. **需求文档**
   - 自动注入「需求分析师」提示词。
   - 你给出初步想法后，DeepSeek 主动追问目标用户、核心流程、范围边界、验收标准。
   - 点击「生成需求文档」后，产出带章节结构、FR 编号功能需求和 AC 编号验收标准的 Markdown。
   - 自动保存为项目目录下的 `REQUIREMENTS.md`。

2. **项目制作**
   - 需求文档作为上下文发送给「执行工程师」。
   - 先给实现计划，再以 `<<<FILE ...>>>` 协议输出完整文件。
   - 服务端解析并写入项目目录；后续每轮自动带当前文件快照，支持增量修改。
   - 文件面板可查看目录树、预览文件、打开资源管理器。

### 任务

没有需求文档环节。直接描述任务，DeepSeek 执行并写入独立任务目录。任务可以归属到某个项目，进入项目范围时会随之显示。

### 项目总管理

侧边栏「项目总管理」提供跨项目视角：

- 左侧项目树可以选择任意项目或文件夹。
- 选中文件夹后汇总它下面所有子文件夹和项目的成果文件、任务、对话记忆；选中项目时查看该项目本身。
- 显示项目数、文件夹数、产出文件数、任务数和记忆数。
- 支持重命名、移动到其他文件夹/项目、移除节点；移除文件夹时子项自动上移。
- 所有成果仍保留在各自项目目录，移除只影响控制台记录。

### 记忆库 · 我的智能体

- 自动从对话中沉淀偏好、决定、项目事实；也可手动新增、从已有对话提取。
- 记忆可置顶、编辑、删除、按类型/关键词筛选。
- 「对话档案」列出所有项目和任务的对话摘要，可直接跳回原对话。
- 「我的智能体」画像（名称、角色、语气、原则、偏好）会注入每一次对话。
- 相关记忆按置顶、当前项目、近期加权选入上下文，不会无限堆积。

### 技能与工具

- **技能**：可复用的方法说明，启用后进入系统提示词。内置需求澄清、可运行原型、代码审查、验收测试、交付说明。
- **工具**：模型提出调用请求，你确认后在本机执行，结果进入运行历史。
  - 内置：列出/读取/写入项目文件、抓取网页、当前时间、读取控制台源码。
  - 自定义 HTTP 工具：URL / Method / Headers / Body，支持 `{{参数}}` 占位符。
  - 自定义命令工具：在本机 `cmd` 执行，仅供可信场景。
- **扩展接口**：`data/extensions/*.js` 可以同时提供技能、工具与提示词片段；界面可查看、重新加载、打开目录。

### 软件管理

- 一个专门用于改进控制台自身的对话窗口。
- 维护工程师可以请求读取源码（`self_read_file`），修改先进入暂存区。
- 暂存文件可在右侧「系统档案」中预览；点击「应用更新」才覆盖源码，并自动备份原文件。
- 应用后重启应用生效；界面、服务端、文档、脚本都在可改范围内。

---

## 2. 桌面版

### 启动

```
release\DeepSeekHarnessConsole\DeepSeek Harness Console.exe
```

启动后：

1. 推荐先双击同目录的 `Install.bat`：安装到 `%LOCALAPPDATA%\Programs\DeepSeekHarnessConsole` 并创建桌面快捷方式。
2. 之后始终从桌面快捷方式启动，避免从受限工作区/对话文件链接启动。
3. 点击左下角「设置」。
4. 在「设置 → 对话后端」确认：默认「自动」会优先使用本机已安装且已登录的 DSH；也可以显式选择本机 DSH 或 DeepSeek API。使用本机 DSH 时不需要填 API Key。
5. 确认工作区根目录，默认 `D:\dscontrol`。项目与任务会分别放入 `xaingmu`、`renwu` 子目录；如果已有 `xiangmu`，会优先复用已有目录。

应用主界面在自己的窗口中打开；点击需求文档、项目制作、任务对话或软件管理对话时，使用**控制台自己的对话页**在本地浏览器标签中打开，侧边栏保持完整项目树，不会因点击项目而隐藏其他项目。桌面版优先使用固定端口 `43180`（被占用时自动顺延）。

主界面使用系统 **Microsoft Edge WebView2 Runtime**（Windows 10/11 默认自带）。如果提示缺少 WebView2，安装微软的 Evergreen Runtime 即可。

关闭主界面会最小化到系统托盘，本地服务继续运行；关闭外部对话窗口不会影响主界面：

- 托盘菜单：显示应用界面、打开工作区、打开日志、开机自动启动、创建桌面快捷方式、退出。
- 双击托盘图标可重新打开主界面。
- 技能、工具、记忆、项目和对话都会持久化，重启或升级后继续可用，不需要重复配置。
- 建议首次使用时在托盘菜单创建桌面快捷方式；需要随系统启动就勾选“开机自动启动”。

### 数据位置

| 内容 | 位置 |
| --- | --- |
| 会话、记忆、技能、工具、设置、API Key | `%APPDATA%\DeepSeek Harness Console\data` |
| 软件管理暂存与备份 | 同上：`self-updates/`、`backups/` |
| 扩展模块 | 同上：`extensions/` |
| 项目文件 | `<工作区根目录>\xaingmu\<slug>`，默认 `D:\dscontrol\xaingmu`；已有 `xiangmu` 时复用之 |
| 任务文件 | `<工作区根目录>\renwu\<slug>`，默认 `D:\dscontrol\renwu` |
| DSH 会话与登录凭据 | `%USERPROFILE%\.dsh`（由已安装的 DeepSeek Harness 管理） |
| 日志 | `%APPDATA%\DeepSeek Harness Console\logs\server.log`，启动器日志为同目录 `launcher.log` |

如果 `%APPDATA%` 不可写（例如受限账户、受控环境），应用会自动回退到安装目录下的 `user-data\data`，再回退到 `D:\dscontrol\.dsh-console-data`，不会因为权限问题直接退出。

桌面版可整体移动；用户数据仍保存在 `%APPDATA%`。

### 重新构建桌面版

```powershell
npm install
npm run build:desktop
```

构建脚本使用 .NET Framework 4.x 的 `csc` 编译应用主界面，复制 WebView2 SDK 与当前 `node.exe`，输出到 `release\DeepSeekHarnessConsole`。

---

## 3. 源码版

要求 Node.js 20+，零运行时依赖。

```powershell
npm start
```

打开 `http://127.0.0.1:4180`。开发时自动打开浏览器：

```powershell
npm run dev
```

环境变量：

| 变量 | 说明 |
| --- | --- |
| `DEEPSEEK_API_KEY` | API Key，优先级高于设置文件 |
| `DEEPSEEK_BASE_URL` | API Base，默认 `https://api.deepseek.com` |
| `DSH_PROJECT_ROOT` | 工作区根目录，默认 `D:\dscontrol`；其下自动创建 `xaingmu`、`renwu`（已有 `xiangmu` 时复用之） |
| `DSH_CHAT_PROVIDER` | `auto`（默认）、`dsh` 或 `api`，覆盖设置里的对话后端 |
| `DSH_CLI` | 可选，指定 `dsh` 的 `lib/bin.js` 路径；默认自动查找全局安装 |
| `DSH_CONSOLE_PORT` | HTTP 端口，源码版默认 `4180`；桌面版优先 `43180` |
| `DSH_DATA_DIR` | 数据目录，桌面版指向 `%APPDATA%` |

---

## 4. 使用流程

```
新建项目
   │
   ├─ 01 需求文档 ── 多轮追问 ── 需求文档 v1 + AC 验收标准
   │                                  │
   │                                  ▼
   └─ 02 项目制作 ── 计划 + 文件块 ── 写入 D:\dscontrol\xaingmu\<项目>
                                      │
                                      └─ 继续对话修改 ── 覆盖/新增文件

记忆库 ←─ 自动提取 / 手动记录 ── 注入之后的每次对话
技能与工具 ←─ 启用 / 自定义 ── 注入技能，工具由你批准执行
软件管理 ←─ 先暂存，再应用 ── 持续改进控制台本身
```

需求访谈建议：

- 可以只回关键词，DeepSeek 会继续追问。
- 信息不足时不会假装足够，会标注「待确认」。
- 生成文档后仍可继续访谈，再点「重新生成」得到更高版本。
- 制作阶段的追加修改会携带当前文件快照，模型输出完整新文件而不是 diff。

---

## 5. 技术结构

```
server.js                 零依赖 HTTP 服务：API、SSE、文件落盘、静态资源
desktop/Program.cs        主界面（WebView2）+ 外部对话窗口 + 托盘常驻 + 快捷方式/开机启动
desktop/SelfTest.cs       桌面运行时自检工具（开发用）
lib/config.js             配置、数据目录、API Base
lib/store.js              JSON 持久化（data/store.json）
lib/prompts.js            需求分析师 / 执行工程师 / 任务模式提示词
lib/agent.js              智能体、记忆、技能、工具注入
lib/memory.js             长期记忆提取、对话档案
lib/tools.js              工具注册、解析、执行、运行历史
lib/extensions.js         data/extensions/*.js 扩展加载器
lib/management.js         软件管理暂存、应用、备份
public/                   原生前端（无构建步骤）
scripts/build-desktop.js  桌面版构建
scripts/smoke-test.js     API 冒烟测试
scripts/ui-audit.js       界面逐项检查
docs/EXTENDING.md         扩展与二次开发接口
```

### 文件输出协议

```
<<<FILE path="src/app.js">>>
完整文件内容
<<<END FILE>>>
```

### 工具调用协议

```
<<<TOOL name="read_file">>>
{"path":"README.md"}
<<<END TOOL>>>
```

流式输出会过滤掉这两类标记，聊天区只显示计划与说明；工具请求会变成带「运行」按钮的卡片。

---

## 6. 扩展接口

扩展模块放在 `%APPDATA%\DeepSeek Harness Console\data\extensions\`（源码版为 `data/extensions/`）。

```js
module.exports = {
  id: 'my-toolkit',
  name: '我的工具包',
  version: '1.0.0',
  description: '一句话说明',
  skills: [
    { name: '输出检查清单', description: '交付前补充检查项', instructions: '追加 3–6 条检查项。' }
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
  ]
};
```

详见 [docs/EXTENDING.md](docs/EXTENDING.md)，或在应用内「技能与工具 → 扩展接口 → 查看接口文档」阅读。

---

## 7. 安全与隐私

- API Key 只保存在本机数据目录，仅发送给设置中的 DeepSeek API Base。
- 服务只监听 `127.0.0.1`。
- 所有项目文件路径都会校验是否位于项目/任务目录内。
- Markdown 渲染会转义 HTML，链接仅允许 `http(s)`。
- 工具需要你点击「运行」才执行；命令工具会在本机真实执行，界面有明确警告。
- 软件管理改动先进入暂存区并自动备份，不会静默覆盖运行中的代码。
- 演示模式只在未配置 Key 时启用，界面与设置中会明确标识。
- 桌面版未做代码签名，Windows SmartScreen 可能提示，选择「仍要运行」即可。

---

## 8. 测试

```powershell
npm start
npm test
```

启动测试服务时建议加上 `DSH_CHAT_PROVIDER=api`，避免冒烟测试真的调用本机 DSH：

```powershell
$env:DSH_CHAT_PROVIDER='api'; npm start
```

冒烟测试覆盖：项目创建 → 多轮需求访谈 → 生成需求文档 → 验收标准落盘 → 开始制作 → 文件写入 → 修改对话 → 任务模式 → 参数校验 → FILE/TOOL 协议解析与流式过滤。

界面逐项审计（需要控制台已在 4180 运行）：

```powershell
npm run test:ui
```

会依次检查全局侧边栏、空状态、项目总览、项目文件夹、项目总管理、范围过滤、需求对话、制作对话、任务模式、记忆库、技能/工具/扩展、软件管理、设置与新增弹窗，以及重复 id、无名称图标按钮、失效导航和运行时错误。

双窗口模式检查（主界面与外部对话窗口）：

```powershell
npm run test:modes
```

桌面运行时自检（开发）：

```powershell
# 编译 SelfTest.exe 后运行，检查 node、本地服务、状态接口和静态页面
```

---

## 9. 常见问题

**Q：项目根目录不可写？**  
在设置里换一个有写权限的目录。桌面版以当前用户权限运行，默认 `D:\dscontrol`；如果该目录不可写，会自动回退到用户目录或应用数据目录，并在设置中显示实际路径。

**Q：没有 API Key 可以用吗？**  
可以。未配置时进入演示模式，能体验完整交互、记忆、技能、工具与文件产出；内容由本地模拟生成。

**Q：工具会自己执行吗？**  
不会。模型只发起请求，必须由你点击「运行」。命令工具尤其要谨慎添加。

**Q：软件管理的改动什么时候生效？**  
点击「应用更新」后写入源码，重启应用生效；原文件备份在数据目录的 `backups/` 中。

**Q：模型没有按 FILE 格式输出怎么办？**  
提示词已强约束。若某次未产出文件，可以回复「请按 FILE 块格式重新输出完整文件」继续。

**Q：端口 4180 被占用？**  
源码版设置 `DSH_CONSOLE_PORT`；桌面版自动使用随机端口。
