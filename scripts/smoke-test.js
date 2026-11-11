'use strict';

/* End-to-end smoke test for the console API (demo mode, no API key required). */

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4180';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error || ''}`);
  return data;
}

async function stream(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`STREAM ${path} → ${res.status} ${data.error || ''}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let done = null;
  let files = null;
  let error = null;
  for (;;) {
    const { done: finished, value } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf('\n\n');
    while (index !== -1) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      let event = 'message';
      const dataLines = [];
      for (const line of chunk.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) {
        const data = JSON.parse(dataLines.join('\n'));
        if (event === 'delta') text += data.text || '';
        if (event === 'done') done = data;
        if (event === 'files') files = data;
        if (event === 'error') error = data.message;
      }
      index = buffer.indexOf('\n\n');
    }
  }
  if (error) throw new Error(error);
  return { text, done, files };
}

function check(condition, label) {
  if (!condition) throw new Error(`FAILED: ${label}`);
  console.log(`  ✓ ${label}`);
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  const state = await request('GET', '/api/state');
  console.log(`Settings: demo=${state.settings.demo}, root=${state.root.path}, writable=${state.root.writable}`);
  check(state.root.writable, 'project root is writable');

  const created = await request('POST', '/api/projects', {
    name: 'Aurora 任务看板',
    description: '给 5 人小团队用的轻量任务看板，打开就能用。',
  });
  const project = created.project;
  console.log(`Project: ${project.id} → ${project.dir}`);
  check(project.status === 'new', 'new project starts as 待开始');

  console.log('\n[1] requirements conversation');
  const turn1 = await stream(`/api/projects/${project.id}/requirements/chat`, {
    text: '我想做一个给团队用的任务看板，最好打开就能用，不需要登录。',
  });
  check(turn1.text.includes('谁在用'), 'assistant asks clarifying questions');
  check(turn1.done.message.role === 'assistant', 'assistant message persisted');

  const turn2 = await stream(`/api/projects/${project.id}/requirements/chat`, {
    text: '给内部 5 人小团队用，核心是新增任务和切换完成状态，数据放本地就行。',
  });
  check(turn2.text.length > 40, 'second turn streams content');

  const turn3 = await stream(`/api/projects/${project.id}/requirements/chat`, {
    text: '暂时不做登录和多人协作，先按你的建议来。',
  });
  check(turn3.text.includes('信息已经足够'), 'assistant declares information sufficient');

  console.log('\n[2] requirements document');
  const doc = await stream(`/api/projects/${project.id}/requirements/doc`, {});
  check(doc.text.length > 800, 'document streams to client');
  check(doc.done.doc && doc.done.doc.version === 1, 'document v1 saved');
  check(doc.done.doc.markdown.includes('## 8. 验收标准'), 'document contains acceptance section');

  const afterDoc = await request('GET', `/api/projects/${project.id}`);
  check(afterDoc.project.doc.markdown.includes('AC-1'), 'acceptance criteria persisted');
  const filesAfterDoc = await request('GET', `/api/projects/${project.id}/files`);
  check(
    filesAfterDoc.files.some((file) => file.path === 'REQUIREMENTS.md'),
    'REQUIREMENTS.md written to project folder'
  );
  check(afterDoc.project.summary.status === 'doc', 'project status becomes 文档就绪');

  console.log('\n[3] build');
  const build = await stream(`/api/projects/${project.id}/build/start`, {});
  check(build.text.includes('实现计划'), 'build streams a plan without leaking FILE blocks');
  check(!build.text.includes('<<<FILE'), 'file markers filtered from chat stream');
  check(build.files && build.files.files.length >= 3, 'multiple files written');
  const detail = await request('GET', `/api/projects/${project.id}`);
  check(detail.project.build.startedAt, 'build start recorded');
  check(detail.project.files.some((file) => file.path === 'index.html'), 'index.html exists on disk');
  check(detail.project.summary.status === 'built', 'project status becomes 已产出');

  const readme = await request('GET', `/api/projects/${project.id}/file?path=${encodeURIComponent('README.md')}`);
  check(readme.content.includes('Aurora'), 'file preview returns content');

  console.log('\n[4] build follow-up');
  const follow = await stream(`/api/projects/${project.id}/build/chat`, {
    text: '再加一个筛选功能，并在 README 里说明验收路径。',
  });
  check(follow.text.length > 0, 'build follow-up responds');
  check(follow.files && follow.files.files.length >= 1, 'build follow-up rewrites files');

  console.log('\n[5] task mode');
  const taskCreated = await request('POST', '/api/tasks', { title: '输出一份竞品分析' });
  const task = taskCreated.task;
  const taskTurn = await stream(`/api/tasks/${task.id}/chat`, {
    text: '帮我输出一份轻量任务看板的竞品分析，包含结论和行动建议。',
  });
  check(taskTurn.text.includes('执行计划'), 'task streams plan');
  check(taskTurn.files && taskTurn.files.files.length >= 2, 'task files written');
  const taskDetail = await request('GET', `/api/tasks/${task.id}`);
  check(taskDetail.task.files.some((file) => file.path === 'deliverable.md'), 'task deliverable exists');
  check(taskDetail.task.summary.status === 'built', 'task status becomes 已产出');

  console.log('\n[6] validation');
  let blocked = false;
  try {
    await request('POST', '/api/projects', { name: '   ' });
  } catch {
    blocked = true;
  }
  check(blocked, 'empty project name rejected');

  console.log('\n[7] tool / file block protocol');
  const filesLib = require('../lib/files');
  const toolsLib = require('../lib/tools');
  const raw =
    '计划如下。\n\n<<<TOOL name="current_time">>>\n{"timezone":"local"}\n<<<END TOOL>>>\n\n' +
    '<<<FILE path="notes/test.md">>>\n# hello\n<<<END FILE>>>\n\n完成。';
  const parsedTools = toolsLib.parseToolBlocks(raw);
  check(parsedTools.length === 1 && parsedTools[0].name === 'current_time', 'tool block parsed');
  check(parsedTools[0].args.timezone === 'local', 'tool arguments parsed');
  const parsedFiles = filesLib.parseFileBlocks(raw);
  check(parsedFiles.files.length === 1 && parsedFiles.files[0].path === 'notes/test.md', 'file block parsed');
  const filter = new filesLib.FileBlockFilter();
  let visible = '';
  for (let i = 0; i < raw.length; i += 9) visible += filter.push(raw.slice(i, i + 9));
  visible += filter.finish();
  check(!visible.includes('<<<'), 'file and tool markers never leak into stream');
  check(visible.includes('计划如下') && visible.includes('完成'), 'surrounding text survives filtering');
  check(toolsLib.stripToolBlocks('a <<<TOOL name="x">>>\n{}\n<<<END TOOL>>> b').trim() === 'a  b'.trim(), 'tool strip works');

  const finalState = await request('GET', '/api/state');
  check(finalState.projects.length >= 1, 'state lists project');
  check(finalState.tasks.length >= 1, 'state lists task');

  console.log('\nAll smoke checks passed.');
  console.log(
    JSON.stringify(
      {
        projectId: project.id,
        projectDir: detail.project.dir,
        docVersion: detail.project.doc.version,
        files: detail.project.files.filter((f) => f.type === 'file').map((f) => f.path),
        taskId: task.id,
        taskDir: taskDetail.task.dir,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(`\n${err.stack || err.message}`);
  process.exit(1);
});
