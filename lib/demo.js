'use strict';

const { sleep } = require('./util');

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function today() {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function* streamText(text, chunkSize = 7) {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield { type: 'content', text: text.slice(i, i + chunkSize) };
    await sleep(9);
  }
}

function requirementsReply(project, turn, userText) {
  const name = project.name;
  const desc = project.description?.trim();
  if (turn <= 1) {
    return `我理解的核心目标是：做一个「${name}」，先把它跑通，而不是一次做全。

为了让后续实现不返工，先确认三件事：

1. **谁在用？** 是你自己、团队内部，还是外部客户？如果没特别说明，我建议先按「单人 / 小团队内部使用」设计。
2. **最重要的动作是什么？** 用户打开它之后，最先要完成的那一件事是什么？请用一句话描述，例如「录入一条记录并看到结果」。
3. **这一版的完成标准？** 什么情况算做完？例如「能完整走通一遍主流程，数据刷新后还在」。${desc ? `\n\n你提到「${desc}」，这会作为背景写进文档。` : ''}

你可以只回关键词，我会继续往下追问。`;
  }
  if (turn === 2) {
    return `方向清楚了。再补三个边界，避免做到一半才发现问题：

1. **数据从哪来？** 是用户手动录入、本地上传，还是接外部接口？如果暂时没有接口，我建议先用本地数据把流程跑通。
2. **失败时怎么办？** 例如没数据、输入不合法、网络中断，页面应该给出什么反馈？我建议至少要有空状态和明确的重试入口。
3. **这一版明确不做什么？** 请列 1–2 个你暂时不需要的能力（比如登录、多人协作、移动端），我会写进「本期不做」，防止范围膨胀。

另外确认一下：交付形态是网页、桌面工具，还是脚本？如果没有偏好，我建议先做本地网页，双击即可打开。`;
  }
  return `信息已经足够，可以生成需求文档了。最终共识如下：

- **产品**：${name}${desc ? `，聚焦「${desc}」` : ''}
- **用户**：先服务单人 / 小团队内部使用，不引入账号体系
- **主流程**：进入 → 完成核心操作 → 立即看到结果 → 刷新后数据仍在
- **边界**：包含空状态、输入校验和失败提示；本期不做登录、多人协作与移动端适配
- **验收**：主流程可完整走通，异常有反馈，产物可直接在本地运行
- **形态**：零依赖本地网页，打开即用

点击右上角的「生成需求文档」，我会把它整理成带 FR 编号和可测试验收标准（AC）的正式文档。你也可以继续补充任何遗漏。${userText ? '' : ''}`;
}

function demoDoc(project) {
  const name = project.name;
  const desc = project.description?.trim() || '围绕用户提出的核心诉求，提供一个可本地直接运行的工具';
  return `# ${name} 需求文档

> 版本 v1.0 · ${today()} · 状态：待确认 · 来源：需求访谈

## 1. 背景与问题

${desc}。当前缺少一个足够轻量、无需部署即可使用的方案，用户需要把核心流程集中在一个界面内完成，并能立即看到结果。

本项目的目标是先交付一个可用闭环，而不是一次性覆盖所有场景。

## 2. 目标与成功指标

- 用户可以在 3 分钟内完成一次完整的主流程。
- 不依赖后端服务和账号体系，打开本地页面即可使用。
- 刷新或重新打开后，已录入的数据仍然保留。
- 首次使用不需要阅读文档，界面自带空状态引导。

## 3. 用户与核心场景

**目标用户**：单人使用者或 2–5 人的小团队，具备基础电脑操作能力。

**核心场景**：
1. 用户打开工具，看到清晰的空状态和主操作入口。
2. 用户完成一次录入 / 操作，界面即时给出结果反馈。
3. 用户关闭并重新打开，之前的记录仍然存在。
4. 用户输入不合法时，得到明确提示且不丢失已填内容。

## 4. 范围（本期做 / 本期不做）

**本期做**
- 核心数据的新增、展示、完成状态切换
- 本地持久化（localStorage）
- 空状态、输入校验、失败提示
- 响应式基础布局（桌面优先）

**本期不做**
- 登录、权限与多用户协作
- 服务端数据库与云端同步
- 移动端专属交互
- 数据导入导出（列为下一版候选）

## 5. 功能需求

| 编号 | 需求描述 | 优先级 | 验收要点 |
| --- | --- | --- | --- |
| FR-1 | 展示主界面与空状态，提供明确的主操作入口 | P0 | 无数据时可见引导文案与输入框 |
| FR-2 | 新增一条记录，校验必填与长度 | P0 | 空输入被拦截并提示；合法输入立即出现在列表顶部 |
| FR-3 | 列表展示记录内容、创建时间与完成状态 | P0 | 刷新后记录不丢失，状态与时间正确 |
| FR-4 | 切换记录的完成状态，并实时更新统计 | P1 | 统计数字随状态变化，刷新后保持 |
| FR-5 | 删除记录，操作前二次确认 | P1 | 取消不删除；确认后记录消失且持久化 |
| FR-6 | 筛选全部 / 未完成 / 已完成 | P2 | 三种筛选结果正确，空结果有提示 |

## 6. 非功能需求

- **性能**：首屏可交互时间小于 1 秒；500 条记录下操作不卡顿。
- **兼容性**：最新版 Chrome / Edge；窗口宽度 1280px 及以上优先适配。
- **可靠性**：localStorage 写入失败时给出可见提示，不静默丢失数据。
- **可维护性**：零构建依赖，HTML / CSS / JS 分离，代码含必要中文注释。
- **隐私**：所有数据仅保存在本机浏览器，不上传。

## 7. 交互与视觉要求

- 深色界面，主色为蓝紫渐变，信息层级清晰。
- 主操作区固定在首屏，列表与统计不抢占视觉焦点。
- 所有可点击元素有 hover 与 focus 状态；键盘 Enter 可提交。
- 反馈使用轻量 toast，不使用阻塞式弹窗（删除确认除外）。

## 8. 验收标准

| 编号 | 前置条件 | 操作 | 预期结果 |
| --- | --- | --- | --- |
| AC-1 | 首次打开，无本地数据 | 观察页面 | 显示空状态引导与输入框，无报错 |
| AC-2 | 输入框为空 | 点击新增 | 阻止提交并提示「请输入内容」 |
| AC-3 | 输入合法内容 | 点击新增 | 记录出现在列表顶部，输入框清空 |
| AC-4 | 已有 1 条记录 | 刷新页面 | 记录仍在，内容与状态一致 |
| AC-5 | 已有未完成记录 | 点击完成 | 状态变为已完成，统计数字同步 +1 |
| AC-6 | 已有记录 | 点击删除并取消 | 记录保留，无数据变化 |
| AC-7 | 已有记录 | 删除并确认 | 记录移除，刷新后不再出现 |
| AC-8 | 浏览器禁用 localStorage | 新增记录 | 出现持久化失败提示，当前会话内数据仍可见 |

## 9. 风险与待确认

- 数据规模未确认：超过 1000 条后的分页 / 虚拟列表方案待定。
- 是否需要导出 CSV，待用户确认（当前不在本期范围）。
- 视觉风格未提供品牌规范，先按深色控制台风格实现。
- 浏览器隐私模式下 localStorage 可能不可用，已纳入异常处理。

## 10. 交付与里程碑

1. **M1 骨架**：页面结构、视觉样式、空状态（0.5 天）
2. **M2 主流程**：新增、列表、状态切换、本地持久化（1 天）
3. **M3 完善**：删除确认、筛选、异常提示、自测验收（0.5 天）
4. **交付物**：可直接打开运行的项目目录 + README 使用说明`;
}

function demoBuildReply(project) {
  const name = esc(project.name);
  const date = today();
  return `实现计划：

1. 搭建零依赖的静态页面，HTML / CSS / JS 分离，双击即可运行。
2. 完成记录新增、状态切换、删除与筛选，并使用 localStorage 持久化。
3. 加入空状态、输入校验和轻量 toast，覆盖需求文档中的异常场景。
4. 补齐 README，说明运行方式与验收路径。

<<<FILE path="README.md">>>
# ${name}

一个零依赖的本地任务看板，由 DeepSeek Harness 控制台根据需求文档生成。

## 运行

直接双击 \`index.html\`，或在浏览器中打开即可，无需安装依赖。

## 功能

- 新增记录，自动校验空输入与长度
- 切换完成状态，实时更新统计
- 删除记录（二次确认）
- 按全部 / 未完成 / 已完成筛选
- 使用 localStorage 持久化，刷新不丢失

## 目录

- \`index.html\` 页面结构
- \`styles.css\` 深色控制台视觉
- \`app.js\` 状态管理与交互

## 验收路径

1. 空输入提交，应被拦截并提示。
2. 输入内容新增，记录出现在列表顶部。
3. 刷新页面，记录仍在。
4. 切换完成状态，统计同步变化。
5. 删除记录并取消，记录保留。
<<<END FILE>>>

<<<FILE path="index.html">>>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="mark">${name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1>${name}</h1>
          <p>本地任务看板 · 数据只保存在这台设备</p>
        </div>
      </div>
      <button id="theme" class="ghost" type="button" aria-label="切换主题">◐</button>
    </header>

    <section class="stats" aria-label="统计">
      <article><span id="stat-total">0</span><label>全部</label></article>
      <article><span id="stat-open">0</span><label>未完成</label></article>
      <article><span id="stat-done">0</span><label>已完成</label></article>
    </section>

    <form id="composer" class="composer" autocomplete="off">
      <input id="input" maxlength="120" placeholder="写下要做的事，按 Enter 添加" aria-label="新记录" />
      <button type="submit">添加</button>
    </form>
    <p id="hint" class="hint" role="status"></p>

    <nav class="filters" aria-label="筛选">
      <button class="chip active" data-filter="all" type="button">全部</button>
      <button class="chip" data-filter="open" type="button">未完成</button>
      <button class="chip" data-filter="done" type="button">已完成</button>
    </nav>

    <ul id="list" class="list"></ul>
    <div id="empty" class="empty" hidden>
      <div class="orb"></div>
      <p>还没有记录</p>
      <span>从上面输入第一条，开始今天的推进。</span>
    </div>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script src="app.js"></script>
</body>
</html>
<<<END FILE>>>

<<<FILE path="styles.css">>>
:root {
  --bg: #0b0d12;
  --panel: #12151d;
  --line: rgba(255, 255, 255, 0.08);
  --text: #e8eaf0;
  --muted: #8b93a7;
  --accent: #6d8bff;
  --accent-2: #a78bfa;
  --ok: #3ddc97;
  --danger: #ff6b81;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--text);
  background:
    radial-gradient(800px 420px at 85% -10%, rgba(109, 139, 255, 0.18), transparent 60%),
    radial-gradient(600px 380px at 0% 110%, rgba(167, 139, 250, 0.12), transparent 60%),
    var(--bg);
}

.shell { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 80px; }

.topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { display: flex; align-items: center; gap: 14px; }
.mark {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  font-weight: 800; color: #0a0c12; font-size: 20px;
}
h1 { margin: 0; font-size: 22px; letter-spacing: -0.4px; }
.brand p { margin: 4px 0 0; color: var(--muted); font-size: 12.5px; }

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 32px 0 24px; }
.stats article {
  padding: 16px 18px; border: 1px solid var(--line); border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012));
}
.stats span { display: block; font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
.stats label { color: var(--muted); font-size: 12px; }

.composer { display: flex; gap: 10px; }
.composer input {
  flex: 1; height: 48px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--line);
  background: var(--panel); color: var(--text); font-size: 14px; outline: none;
}
.composer input:focus { border-color: rgba(109, 139, 255, 0.55); box-shadow: 0 0 0 3px rgba(109,139,255,.12); }
.composer button, .ghost {
  height: 48px; padding: 0 22px; border: 0; border-radius: 12px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0a0c12; font-weight: 700;
}
.ghost { height: 38px; padding: 0 12px; background: transparent; border: 1px solid var(--line); color: var(--muted); }
.hint { min-height: 18px; margin: 8px 4px 0; color: var(--danger); font-size: 12.5px; }

.filters { display: flex; gap: 8px; margin: 26px 0 12px; }
.chip {
  padding: 7px 14px; border-radius: 999px; border: 1px solid var(--line);
  background: transparent; color: var(--muted); font-size: 12.5px; cursor: pointer;
}
.chip.active { color: var(--text); border-color: rgba(109,139,255,.55); background: rgba(109,139,255,.12); }

.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.item {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid var(--line); border-radius: 12px; background: var(--panel);
  animation: rise .25s ease both;
}
.item.done .text { color: var(--muted); text-decoration: line-through; }
.check {
  width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--muted);
  background: transparent; cursor: pointer; flex: none;
}
.item.done .check { background: var(--ok); border-color: var(--ok); }
.text { flex: 1; font-size: 14px; line-height: 1.5; word-break: break-word; }
.time { color: var(--muted); font-size: 11.5px; white-space: nowrap; }
.del { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 16px; }
.del:hover { color: var(--danger); }

.empty { padding: 56px 0; text-align: center; color: var(--muted); }
.empty p { margin: 18px 0 4px; color: var(--text); font-weight: 600; }
.empty span { font-size: 12.5px; }
.orb {
  width: 76px; height: 76px; margin: 0 auto; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(109,139,255,.75), rgba(167,139,250,.1) 65%);
  filter: blur(.2px); animation: pulse 3s ease-in-out infinite;
}

.toast {
  position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 20px);
  padding: 10px 16px; border-radius: 10px; background: #1b2030; border: 1px solid var(--line);
  color: var(--text); font-size: 13px; opacity: 0; pointer-events: none; transition: .22s ease;
}
.toast.show { opacity: 1; transform: translate(-50%, 0); }

@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes pulse { 50% { transform: scale(1.06); opacity: .82; } }

@media (max-width: 620px) {
  .shell { padding-top: 28px; }
  .stats { grid-template-columns: 1fr; }
  .time { display: none; }
}
<<<END FILE>>>

<<<FILE path="app.js">>>
(function () {
  'use strict';

  var KEY = '${project.slug}:tasks';
  var filter = 'all';
  var tasks = load();

  var list = document.getElementById('list');
  var empty = document.getElementById('empty');
  var input = document.getElementById('input');
  var hint = document.getElementById('hint');
  var toastEl = document.getElementById('toast');

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch (err) {
      toast('本地保存失败，数据仅在当前页面有效');
    }
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function visible() {
    if (filter === 'open') return tasks.filter(function (t) { return !t.done; });
    if (filter === 'done') return tasks.filter(function (t) { return t.done; });
    return tasks;
  }

  function render() {
    var items = visible();
    list.innerHTML = '';
    items.forEach(function (task) {
      var li = document.createElement('li');
      li.className = 'item' + (task.done ? ' done' : '');

      var check = document.createElement('button');
      check.className = 'check';
      check.type = 'button';
      check.setAttribute('aria-label', task.done ? '标记未完成' : '标记完成');
      check.addEventListener('click', function () {
        task.done = !task.done;
        save();
        render();
      });

      var text = document.createElement('span');
      text.className = 'text';
      text.textContent = task.text;

      var time = document.createElement('span');
      time.className = 'time';
      time.textContent = task.time;

      var del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', '删除');
      del.addEventListener('click', function () {
        if (!confirm('确定删除这条记录？')) return;
        tasks = tasks.filter(function (t) { return t.id !== task.id; });
        save();
        render();
        toast('已删除');
      });

      li.append(check, text, time, del);
      list.appendChild(li);
    });

    empty.hidden = items.length > 0;
    document.getElementById('stat-total').textContent = tasks.length;
    document.getElementById('stat-open').textContent = tasks.filter(function (t) { return !t.done; }).length;
    document.getElementById('stat-done').textContent = tasks.filter(function (t) { return t.done; }).length;
  }

  document.getElementById('composer').addEventListener('submit', function (event) {
    event.preventDefault();
    var value = input.value.trim();
    if (!value) {
      hint.textContent = '请输入内容';
      input.focus();
      return;
    }
    hint.textContent = '';
    tasks.unshift({
      id: Date.now().toString(36),
      text: value,
      done: false,
      time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    input.value = '';
    save();
    render();
  });

  input.addEventListener('input', function () { hint.textContent = ''; });

  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      filter = chip.dataset.filter;
      document.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('active', c === chip); });
      render();
    });
  });

  document.getElementById('theme').addEventListener('click', function () {
    document.body.classList.toggle('light');
  });

  render();
})();
<<<END FILE>>>

## 下一步

1. 双击 \`index.html\`，按需求文档中的 AC-1 至 AC-8 逐条验收。
2. 如需下一版，建议补充 CSV 导出与超过 500 条记录时的分页方案。`;
}

function demoTaskReply(task, turn, userText) {
  const title = esc(task.title);
  if (turn === 1 && String(userText || '').length < 6) {
    return `任务信息有点短，先确认两点：

1. 你希望最终产物是什么形态？文档、网页，还是一段可运行的代码？
2. 有没有必须包含的内容或参考样例？

也可以直接补充一句期望，我会按最实用的默认方式执行。`;
  }
  return `执行计划：

1. 把任务目标拆成「背景 / 结论 / 可执行步骤」三部分。
2. 产出一份可直接阅读的交付说明，并在 README 中记录任务上下文。
3. 所有产物写入任务目录，方便后续继续迭代。

<<<FILE path="README.md">>>
# ${title}

本目录由 DeepSeek Harness 控制台「任务模式」生成。

## 任务

${title}

## 产物

- \`deliverable.md\`：任务交付说明
- \`README.md\`：目录说明

## 继续迭代

在控制台中打开该任务继续对话，新的产物会写入同一目录。
<<<END FILE>>>

<<<FILE path="deliverable.md">>>
# ${title}

> 生成时间：${today()} · 模式：任务

## 背景

围绕「${title}」这一任务，先给出一个可以直接执行的版本，避免停留在讨论层面。

## 结论

1. 先明确唯一的成功标准，其余需求按优先级排队。
2. 用最小可运行产物验证方向，再补充细节。
3. 每次迭代只改动一个变量，并记录结果。

## 可执行步骤

- [ ] 确认交付形态与验收方式
- [ ] 完成第一版产物并自测
- [ ] 根据反馈迭代，记录变更

## 待补充

- 具体的业务背景与约束（可在对话中继续说明）
<<<END FILE>>>

## 下一步

告诉我交付形态或补充背景，我可以把这份说明细化为更具体的产物。`;
}

function demoManagementReply(userText) {
  return `我会把这次讨论落成一个低风险的改进记录，先不直接改运行中的代码。

计划：
1. 记录目标、影响范围与验证方式。
2. 把可扩展点整理到文档，方便后续通过 Skill / 工具扩展，而不是重写核心。
3. 文件先进入暂存区，由你确认后应用，重启生效。

演示模式只生成一条文档级改动；接入真实 API 后，维护工程师可以读取源码并按需修改。

<<<FILE path="docs/IMPROVEMENT-NOTES.md">>>
# 控制台改进记录

> 由软件管理对话生成 · 演示模式

## 本次目标

${String(userText || '持续改进控制台').slice(0, 300)}

## 改进原则

1. 保持现有 API、数据结构与路由兼容。
2. 新能力优先通过扩展接口实现：技能、工具、提示词片段。
3. 源码改动必须先进入暂存区，经过确认后再应用。
4. 每次改动都补充验证方式与回滚说明。

## 可扩展点

- \`data/extensions/*.js\`：添加技能与工具。
- \`lib/agent.js\`：记忆、技能、工具注入。
- \`lib/tools.js\`：工具执行器。
- \`public/\`：界面；\`desktop/\`：桌面外壳。

## 验收方式

- [ ] 重启应用后控制台正常打开。
- [ ] 记忆、技能、工具页面数据正常。
- [ ] 新建项目并完成一次需求文档与制作流程。
<<<END FILE>>>

## 验证方式

应用更新后重启桌面应用，确认「使用说明」与扩展接口页面正常。`;
}

function demoReply(ctx) {
  const { mode, project, task, turn, userText } = ctx;
  let text = '';
  if (mode === 'requirements') text = requirementsReply(project, turn, userText);
  else if (mode === 'doc') text = demoDoc(project);
  else if (mode === 'build') text = demoBuildReply(project);
  else if (mode === 'task') text = demoTaskReply(task, turn, userText);
  else if (mode === 'management') text = demoManagementReply(userText);
  else text = '演示模式：暂无内容。';
  return streamText(text);
}

module.exports = { demoReply, demoDoc };
