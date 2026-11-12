'use strict';

/*
 * UI audit: renders every workspace in jsdom against a running console and
 * checks structure, navigation, modals, labels and runtime errors.
 *
 *   node server.js
 *   npm run test:ui
 */

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.UI_BASE_URL || 'http://127.0.0.1:4180';
const results = [];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function check(condition, label) {
  if (!condition) throw new Error(`FAILED: ${label}`);
  results.push(label);
  console.log(`  ✓ ${label}`);
}

async function ensureSeed() {
  const state = await (await fetch(`${BASE}/api/state`)).json();
  let project = state.projects[0];
  let task = state.tasks[0];
  if (!project) {
    const created = await (
      await fetch(`${BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'UI 审计项目', description: '用于界面检查' }),
      })
    ).json();
    project = created.project;
  }
  if (!task) {
    const created = await (
      await fetch(`${BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'UI 审计任务' }),
      })
    ).json();
    task = created.task;
  }
  const memory = await (await fetch(`${BASE}/api/memory`)).json();
  if (!memory.memories.length) {
    await fetch(`${BASE}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'preference',
        title: '界面偏好',
        content: '偏好克制、低干扰的深色界面。',
        tags: ['UI'],
        pinned: true,
      }),
    });
  }
  const tools = await (await fetch(`${BASE}/api/tools`)).json();
  if (!tools.runs.length) {
    await fetch(`${BASE}/api/tools/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'current_time', args: {}, scope: 'self' }),
    });
  }
  return { project, task };
}

async function main() {
  const seed = await ensureSeed();
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  const dom = new JSDOM(html, { url: `${BASE}/#/projects`, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;

  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
  window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  window.HTMLElement.prototype.scrollTo = function scrollTo() {};
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
  window.fetch = (url, options) => fetch(typeof url === 'string' && url.startsWith('/') ? BASE + url : url, options);

  const errors = [];
  window.addEventListener('error', (event) => errors.push(event.error || event.message));
  window.addEventListener('unhandledrejection', (event) => errors.push(event.reason));

  window.eval(script);
  await wait(900);
  const view = window.document.querySelector('#view');
  const document = window.document;

  async function navigate(hash) {
    window.location.hash = hash;
    window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    await wait(650);
  }

  function auditPage(name, checks) {
    console.log(`\n[${name}]`);
    for (const [condition, label] of checks) check(condition, label);
    const ids = Array.from(document.querySelectorAll('[id]')).map((node) => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    check(duplicates.length === 0, `${name}：无重复 id`);
    const unlabeled = Array.from(document.querySelectorAll('#topbar button, #view button')).filter((button) => {
      const text = button.textContent.replace(/\s/g, '');
      return !text && !button.getAttribute('title') && !button.getAttribute('aria-label');
    });
    check(unlabeled.length === 0, `${name}：图标按钮均有可访问名称`);
    const brokenHash = Array.from(document.querySelectorAll('a[href^="#"]')).filter((link) => {
      const href = link.getAttribute('href');
      return !href || href === '#';
    });
    check(brokenHash.length === 0, `${name}：导航链接有效`);
  }

  console.log(`UI audit against ${BASE}\n`);

  auditPage('全局与空状态', [
    [Boolean(document.querySelector('.sidebar')), '侧边栏存在'],
    [Boolean(document.querySelector('.mode-switch')), '项目/任务模式切换存在'],
    [Boolean(document.querySelector('#add-folder')), '项目侧边栏有新建文件夹入口'],
    [
      document.querySelectorAll('.side-utils .util-link').length === 4 &&
        document.querySelector('.side-utils').textContent.includes('项目总管理'),
      '项目总管理、记忆、技能工具、软件改进入口齐全',
    ],
    [Boolean(document.querySelector('[data-action="open-software"]')), '软件改进打开原生 DSH 页面'],
    [view.textContent.includes('把想法，变成可验收的交付'), '项目工作区空状态/首页正常'],
    [Boolean(document.querySelector('#api-status')), '底部 API 状态可点击'],
  ]);

  await navigate('#/memory');
  auditPage('记忆库', [
    [view.textContent.includes('记忆库') && view.textContent.includes('我的智能体'), '标题与智能体卡片'],
    [document.querySelectorAll('.stat-card').length === 4, '四项统计卡片'],
    [document.querySelectorAll('[data-memory-card]').length > 0, '记忆卡片'],
    [Boolean(document.querySelector('#memory-search')), '搜索框'],
    [document.querySelectorAll('[data-memory-type]').length >= 2, '类型筛选'],
    [document.querySelectorAll('.conv-row').length > 0, '对话档案'],
    [Boolean(document.querySelector('[data-action="new-memory"]')), '新增记忆入口'],
  ]);
  document.querySelector('[data-action="new-memory"]').click();
  await wait(50);
  auditPage('新增记忆弹窗', [
    [Boolean(document.querySelector('#memory-form')), '表单存在'],
    [Boolean(document.querySelector('#mf-type')) && Boolean(document.querySelector('#mf-content')), '类型与内容字段'],
    [document.querySelectorAll('#memory-form .modal-actions button').length === 2, '取消/保存按钮'],
  ]);
  document.querySelector('[data-action="close-modal"]').click();

  await navigate('#/skills');
  auditPage('技能', [
    [document.querySelectorAll('.tabs .tab').length === 3, '技能/工具/扩展三个 Tab'],
    [document.querySelectorAll('.skill-card').length > 0, '技能卡片'],
    [document.querySelectorAll('.switch input').length > 0, '启停开关'],
    [Boolean(document.querySelector('[data-action="new-skill"]')), '新增技能入口'],
  ]);
  document.querySelector('[data-tab="tools"]').click();
  await wait(100);
  auditPage('工具', [
    [view.textContent.includes('current_time'), '工具卡片'],
    [Boolean(document.querySelector('[data-action="run-tool-page"]')), '运行入口'],
    [Boolean(document.querySelector('.run-history')), '运行历史'],
  ]);
  document.querySelector('[data-tab="extensions"]').click();
  await wait(100);
  auditPage('扩展接口', [
    [document.querySelectorAll('.ext-card').length > 0, '扩展模块卡片'],
    [Boolean(document.querySelector('[data-action="view-extension-docs"]')), '接口文档入口'],
    [Boolean(document.querySelector('[data-action="reload-extensions"]')), '重新加载入口'],
  ]);

  await navigate('#/management');
  auditPage('软件管理', [
    [view.textContent.includes('维护工程师') && view.textContent.includes('系统档案'), '对话与系统档案'],
    [Boolean(document.querySelector('.management-layout')), '管理布局'],
    [Boolean(document.querySelector('#composer-input')), '输入框'],
    [document.querySelectorAll('.endpoint-row').length > 0, '接口清单'],
    [Boolean(document.querySelector('[data-action="toggle-system"]')), '面板折叠入口'],
  ]);

  await navigate(`#/project/${seed.project.id}`);
  auditPage('项目总览', [
    [view.textContent.includes('需求文档') && view.textContent.includes('项目制作'), '两个阶段卡片'],
    [document.querySelectorAll('.phase-card').length === 2, '阶段卡数量'],
    [document.querySelectorAll('.meta-row .chip').length >= 2, '项目元信息'],
    [Boolean(document.querySelector('[data-action="open-folder"]')), '打开目录入口'],
    [!document.querySelector('.side-scope'), '点击项目后不隐藏其他项目'],
    [document.querySelectorAll('.side-item').length > 0, '侧边栏仍显示完整项目树'],
  ]);

  await navigate(`#/project/${seed.project.id}/requirements`);
  auditPage('需求对话', [
    [view.textContent.includes('需求分析师'), '提示词状态'],
    [Boolean(document.querySelector('#composer-input')), '输入框'],
    [Boolean(document.querySelector('.context-pane')), '需求文档面板'],
    [Boolean(document.querySelector('[data-action="generate-doc"]')), '生成文档入口'],
    [Boolean(document.querySelector('[data-action="toggle-doc"]')), '面板折叠入口'],
  ]);

  await navigate(`#/project/${seed.project.id}/build`);
  const buildBlocked = Boolean(document.querySelector('.blocked-card'));
  auditPage('项目制作', [
    [buildBlocked || Boolean(document.querySelector('#composer-input')), '制作页状态正常'],
    [buildBlocked || Boolean(document.querySelector('.context-pane')), '文件面板或需求文档引导'],
    [buildBlocked || Boolean(document.querySelector('[data-action="open-folder"]')), '打开目录入口或需求引导'],
    [buildBlocked ? Boolean(document.querySelector('a[href*="/requirements"]')) : true, '缺少文档时可回到需求对话'],
  ]);

  await navigate(`#/task/${seed.task.id}`);
  auditPage('任务模式', [
    [view.textContent.includes('任务模式'), '任务提示'],
    [Boolean(document.querySelector('#composer-input')), '输入框'],
    [view.textContent.includes('任务文件'), '任务文件面板'],
  ]);

  await navigate('#/manage');
  auditPage('项目总管理', [
    [Boolean(document.querySelector('.portfolio-layout')), '总管理布局存在'],
    [Boolean(document.querySelector('.portfolio-tree')), '项目树存在'],
    [document.querySelectorAll('.portfolio-tree-item').length > 1, '项目树包含可选择的项目'],
    [document.querySelector('.portfolio-main')?.textContent.includes('成果'), '展示成果区域'],
    [document.querySelector('.portfolio-main')?.textContent.includes('对话记忆'), '展示对话记忆区域'],
    [Boolean(document.querySelector('[data-action="portfolio-refresh"]')), '刷新入口存在'],
  ]);
  const portfolioNode = document.querySelector('.portfolio-tree-item[data-id]:not([data-id=""])');
  if (portfolioNode) {
    const id = portfolioNode.dataset.id;
    portfolioNode.click();
    await wait(300);
    check(window.location.hash === `#/manage/${id}`, '选择项目后更新总管理范围');
    check(
      document.querySelector('.portfolio-scope-head')?.textContent.includes(
        document.querySelector('.portfolio-tree-item.active')?.textContent.trim() || '@@'
      ) || Boolean(document.querySelector('.portfolio-scope-head')),
      '总管理范围标题更新'
    );
  }

  await navigate('#/projects');
  const folderResponse = await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `审计文件夹-${Date.now()}`, kind: 'folder' }),
  });
  const folderData = await folderResponse.json();
  await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `子项目-${Date.now()}`, kind: 'project', folderId: folderData.project.id }),
  });
  await navigate(`#/project/${folderData.project.id}`);
  auditPage('项目文件夹', [
    [view.textContent.includes('文件夹内容'), '文件夹内容区域'],
    [view.textContent.includes('子项目') || view.textContent.includes('文件夹内容'), '显示文件夹内容'],
    [!document.querySelector('.side-scope'), '文件夹页面仍显示完整项目树'],
    [
      Boolean(document.querySelector('[data-action="new-project"][data-parent]')),
      '提供新建子项目入口',
    ],
    [view.textContent.includes('总管理'), '提供总管理入口'],
  ]);

  await navigate('#/projects');
  document.querySelector('#add-folder').click();
  await wait(80);
  check(
    document.querySelector('#np-kind')?.value === 'folder' &&
      Boolean(document.querySelector('#new-project-form')),
    '侧边栏新建文件夹入口打开文件夹表单'
  );
  document.querySelector('[data-action="close-modal"]').click();

  document.querySelector('#api-status').click();
  await wait(80);
  auditPage('设置弹窗', [
    [Boolean(document.querySelector('#settings-form')), '表单存在'],
    [Boolean(document.querySelector('#set-key')) && Boolean(document.querySelector('#set-model')), 'Key 与模型字段'],
    [
      Boolean(document.querySelector('#set-provider')) &&
        [...document.querySelectorAll('#set-provider option')].some((option) => option.value === 'dsh') &&
        [...document.querySelectorAll('#set-provider option')].some((option) => option.value === 'api'),
      '对话后端可选本机 DSH / API',
    ],
    [
      Boolean(document.querySelector('#set-window')) &&
        [...document.querySelectorAll('#set-window option')].some((option) => option.value === 'browser') &&
        [...document.querySelectorAll('#set-window option')].some((option) => option.value === 'app'),
      '对话框窗口可选本地浏览器 / 独立窗口',
    ],
    [Boolean(document.querySelector('#set-auto-memory')), '自动记忆开关'],
    [Boolean(document.querySelector('[data-action="test-connection"]')), '测试连接入口'],
    [
      /xaingmu|xiangmu/.test(document.querySelector('#settings-form').textContent) &&
        document.querySelector('#settings-form').textContent.includes('renwu'),
      '展示项目 / 任务子目录',
    ],
  ]);
  document.querySelector('[data-action="close-modal"]').click();

  document.querySelector('#add-side').click();
  await wait(80);
  check(
    /xaingmu|xiangmu/.test(document.querySelector('#np-path')?.textContent || ''),
    '新建项目路径包含项目目录'
  );
  document.querySelector('[data-action="close-modal"]').click();

  await navigate('#/tasks');
  document.querySelector('#add-side').click();
  await wait(80);
  check(
    (document.querySelector('#nt-path')?.textContent || '').includes('renwu'),
    '新建任务路径包含 renwu'
  );
  document.querySelector('[data-action="close-modal"]').click();

  await wait(200);
  check(errors.length === 0, '全程无未捕获的运行时错误');

  console.log(`\nUI audit passed: ${results.length} checks.`);
  dom.window.close();
}

main().catch((err) => {
  console.error(`\n${err.stack || err.message}`);
  process.exit(1);
});
