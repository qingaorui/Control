'use strict';

/*
 * Verifies the desktop shell / dialog split:
 *   ?shell=1  → app interface stays, dialogs are posted to the native host
 *   ?dialog=1 → only the conversation is rendered in the browser window
 */

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.UI_BASE_URL || 'http://127.0.0.1:4180';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function check(condition, label) {
  if (!condition) throw new Error(`FAILED: ${label}`);
  console.log(`  ✓ ${label}`);
}

async function load(url, { posted, opened }) {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
  window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  window.HTMLElement.prototype.scrollTo = function scrollTo() {};
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
  window.fetch = (input, options) => fetch(typeof input === 'string' && input.startsWith('/') ? BASE + input : input, options);
  window.open = (target) => {
    opened.push(target);
    return { closed: false, focus() {} };
  };
  if (posted) {
    window.chrome = { webview: { postMessage: (message) => posted.push(message) } };
  }
  const errors = [];
  window.addEventListener('error', (event) => errors.push(event.error || event.message));
  window.addEventListener('unhandledrejection', (event) => errors.push(event.reason));
  window.eval(script);
  await wait(800);
  return { dom, window, errors };
}

async function main() {
  const state = await (await fetch(`${BASE}/api/state`)).json();
  const project = state.projects[0];
  const task = state.tasks[0];
  if (!project) throw new Error('请先运行 npm test 生成一个项目');

  console.log(`Window mode audit against ${BASE}\n`);
  await fetch(`${BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dialogWindow: 'browser' }),
  });
  console.log('[应用主界面 ?shell=1]');
  const posted = [];
  const shell = await load(`${BASE}/?shell=1#/project/${project.id}`, { posted, opened: [] });
  check(shell.window.document.body.classList.contains('dialog-mode') === false, '主界面不是对话模式');
  check(shell.window.document.querySelector('#side-list') !== null, '主界面侧边栏存在');
  check(shell.window.document.querySelector('.overview') !== null, '主界面显示项目总览');
  if (state.root && state.root.fallback) {
    const banner = shell.window.document.querySelector('#workspace-banner');
    check(!banner.hidden, '受限启动时显示目录回退提示');
    check(banner.textContent.includes('受限启动'), '提示说明当前是受限启动');
    check(banner.textContent.includes(state.root.path), '提示显示实际保存路径');
  }

  shell.window.location.hash = `#/project/${project.id}/requirements`;
  shell.window.dispatchEvent(new shell.window.HashChangeEvent('hashchange'));
  await wait(500);
  check(posted.length === 1, '点击需求对话会通知桌面宿主打开外部窗口');
  check(posted[0].includes('?dialog=1#/project/'), '外部地址包含 dialog=1');
  check(
    shell.window.document.querySelector('.overview') !== null,
    '通知外部打开后主界面仍停留在项目总览'
  );

  shell.window.location.hash = '#/management';
  shell.window.dispatchEvent(new shell.window.HashChangeEvent('hashchange'));
  await wait(500);
  check(posted.length === 2 && posted[1].includes('?dialog=1#/management'), '软件管理也外部打开');

  console.log('\n[外部对话窗口 ?dialog=1]');
  const opened = [];
  const dialog = await load(`${BASE}/?dialog=1#/project/${project.id}/requirements`, { posted: null, opened });
  check(dialog.window.document.body.classList.contains('dialog-mode'), '对话窗口标记为 dialog-mode');
  check(dialog.window.document.querySelector('#composer-input') !== null, '对话窗口包含输入框');
  check(dialog.window.document.querySelector('#chat-scroll') !== null, '对话窗口包含消息区');
  check(dialog.window.document.querySelector('.context-pane') !== null, '对话窗口保留需求文档面板');
  check(dialog.window.document.querySelector('#topbar .breadcrumb').textContent.includes('需求文档'), '顶部只显示对话标题');

  console.log('\n[任务对话窗口]');
  if (task) {
    const taskDialog = await load(`${BASE}/?dialog=1#/task/${task.id}`, { posted: null, opened: [] });
    check(taskDialog.window.document.querySelector('#composer-input') !== null, '任务对话窗口包含输入框');
    check(taskDialog.window.document.body.classList.contains('dialog-mode'), '任务窗口为 dialog-mode');
  }

  check(
    shell.errors.length === 0 && dialog.errors.length === 0,
    '两种窗口模式都没有运行时错误'
  );
  console.log('\nWindow mode audit passed.');
  shell.dom.window.close();
  dialog.dom.window.close();
}

main().catch((err) => {
  console.error(`\n${err.stack || err.message}`);
  process.exit(1);
});
