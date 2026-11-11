'use strict';

/* ==========================================================================
   DeepSeek Harness Console — client
   ========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder:
    '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z"/>',
  doc: '<path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 3.5V8h4"/><path d="M9 12h6M9 15.5h6"/>',
  file: '<path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 3.5V8h4"/>',
  sparkles:
    '<path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3Z"/><path d="m19 14 .9 2.4 2.1.9-2.1.9L19 20.6l-.9-2.4-2.1-.9 2.1-.9L19 14Z"/>',
  send: '<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-8-8-4L21 3Z"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  download: '<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5L16.5 11"/><path d="M5 19h14"/>',
  external:
    '<path d="M14 4h6v6"/><path d="M20 4 10.5 13.5"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 .6 7"/><path d="M20 3v5h-5"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14"/>',
  trash:
    '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  alert:
    '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.5v.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  layout: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15"/>',
  terminal: '<path d="m5 7 4 5-4 5M12 17h7"/>',
  message: '<path d="M21 12a8 8 0 0 1-8 8H4l2-4a8 8 0 1 1 15-4Z"/>',
  memory:
    '<rect x="7" y="7" width="10" height="10" rx="2.2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/><circle cx="12" cy="12" r="1.6"/>',
  puzzle:
    '<path d="M9 4.5h2.2a1.8 1.8 0 1 1 3.6 0H17a1.5 1.5 0 0 1 1.5 1.5v2.2a1.8 1.8 0 1 1 0 3.6V14a1.5 1.5 0 0 1-1.5 1.5h-2.2a1.8 1.8 0 1 0-3.6 0H9A1.5 1.5 0 0 1 7.5 14v-2.2a1.8 1.8 0 1 1 0-3.6V6A1.5 1.5 0 0 1 9 4.5Z"/>',
  wrench:
    '<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.8-2.8 2.2-2.6Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  pin: '<path d="m9 4 6 6M14 3l7 7-4 1-4 4-1 4-7-7 4-1 4-4 1-4Z"/><path d="m8 16-4 4"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  book: '<path d="M5 4h9l5 5v11H5V4Z"/><path d="M14 4v5h5"/><path d="M8 13h7M8 16h5"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z"/><path d="M12 17v4"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12 3 3 5-6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
};

function icon(name, cls = '') {
  const body = ICONS[name] || '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function relTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < 0) return '刚刚';
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function fmtClock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/* --------------------------------------------------------------------------
   markdown
   -------------------------------------------------------------------------- */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMd(text) {
  const codes = [];
  let s = text.replace(/`([^`\n]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`);
    return `\u0001${codes.length - 1}\u0001`;
  });
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0001(\d+)\u0001/g, (_, index) => codes[Number(index)]);
  return s;
}

function codeBlockHtml(lang, code) {
  return `<div class="md-code"><div class="md-code-head"><span>${escapeHtml(lang || 'text')}</span><button type="button" data-action="copy-code">复制</button></div><pre><code>${escapeHtml(code)}</code></pre></div>`;
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split('|').map((cell) => cell.trim());
}

function listMatch(line) {
  return /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
}

function isHr(line) {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);
}

function startsBlock(line, next) {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\u0000C\d+\u0000$/.test(line) ||
    /^```/.test(line) ||
    Boolean(listMatch(line)) ||
    isHr(line) ||
    (line.includes('|') && next !== undefined && isTableSeparator(next))
  );
}

function renderMarkdown(source) {
  const blocks = [];
  let text = String(source == null ? '' : source)
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n');

  const fence = /```([^\n`]*)\n([\s\S]*?)```/g;
  text = text.replace(fence, (_, lang, code) => {
    blocks.push({ lang: lang.trim(), code });
    return `\u0000C${blocks.length - 1}\u0000`;
  });

  let escaped = escapeHtml(text);
  const lines = escaped.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const blockToken = /^\u0000C(\d+)\u0000$/.exec(line.trim());
    if (blockToken) {
      const block = blocks[Number(blockToken[1])];
      out.push(codeBlockHtml(block.lang, block.code));
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (isHr(line)) {
      out.push('<hr />');
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inlineMd(quoted.join('<br>'))}</blockquote>`);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const headHtml = header.map((cell) => `<th>${inlineMd(cell)}</th>`).join('');
      const bodyHtml = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inlineMd(cell)}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }

    const firstItem = listMatch(line);
    if (firstItem) {
      const ordered = /^\d/.test(firstItem[2]);
      const items = [];
      while (i < lines.length) {
        const match = listMatch(lines[i]);
        if (!match) {
          if (/^\s{2,}\S/.test(lines[i]) && items.length) {
            items[items.length - 1] += `<br>${inlineMd(lines[i].trim())}`;
            i += 1;
            continue;
          }
          break;
        }
        items.push(inlineMd(match[3]));
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`);
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${inlineMd(paragraph.join('<br>'))}</p>`);
  }

  return out.join('');
}

/* --------------------------------------------------------------------------
   state
   -------------------------------------------------------------------------- */

const app = {
  mode: 'projects',
  state: {
    projects: [],
    tasks: [],
    settings: { demo: true, model: 'deepseek-chat', projectRoot: '' },
    root: { path: '', writable: false, error: '' },
  },
  route: { name: 'home', mode: 'projects' },
  project: null,
  task: null,
  portfolio: null,
  portfolioId: null,
  memory: null,
  skillsData: null,
  toolsData: null,
  extensionsData: null,
  management: null,
  skillTab: 'skills',
  memoryFilter: { type: 'all', q: '', pinned: false },
  busy: null,
  docDraft: '',
  pane: { doc: true, files: true, system: true },
  docTimer: null,
  streamTimer: null,
  lastPreview: '',
  lastToolOutput: '',
  shellMode: false,
  dialogMode: false,
};

try {
  const wide = window.innerWidth > 1040;
  const docPref = localStorage.getItem('dsh:pane:doc');
  const filePref = localStorage.getItem('dsh:pane:files');
  const systemPref = localStorage.getItem('dsh:pane:system');
  app.pane.doc = wide && docPref !== '0';
  app.pane.files = wide && filePref !== '0';
  app.pane.system = wide && systemPref !== '0';
  const params = new URLSearchParams(location.search);
  app.shellMode = params.get('shell') === '1';
  app.dialogMode = params.get('dialog') === '1';
  if (app.dialogMode) document.body.classList.add('dialog-mode');
} catch {
  /* ignore */
}

const DIALOG_ROUTES = new Set(['requirements', 'build', 'task', 'management']);

function openExternalDialog(hash) {
  if (!hash) return;
  const target = `${location.origin}${location.pathname}?dialog=1${hash.startsWith('#') ? hash : `#${hash}`}`;
  const mode = app.state.settings?.dialogWindow === 'app' ? 'app' : 'browser';
  openNativeUrl(target, mode);
}

function openNativeUrl(target, mode) {
  if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
    window.chrome.webview.postMessage(`${mode}|${target}`);
    toast('对话已在浏览器窗口打开', 'ok');
    return;
  }
  const opened = window.open(target, '_blank', 'popup,width=1280,height=900');
  if (!opened) {
    toast('浏览器拦截了对话窗口，请允许弹出窗口', 'bad');
  }
}

/* --------------------------------------------------------------------------
   api
   -------------------------------------------------------------------------- */

async function apiGet(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

async function apiPost(url, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

async function apiPatch(url, body = {}) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

async function postStream(url, body, handlers, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body || {}),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  }
  if (!res.body) throw new Error('服务器没有返回数据流');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf('\n\n');
    while (index !== -1) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const lines = chunk.split(/\r?\n/);
      let event = 'message';
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) {
        let data;
        try {
          data = JSON.parse(dataLines.join('\n'));
        } catch {
          data = null;
        }
        if (data && handlers[event]) await handlers[event](data);
      }
      index = buffer.indexOf('\n\n');
    }
  }
}

/* --------------------------------------------------------------------------
   boot / routing
   -------------------------------------------------------------------------- */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'project' && parts[1]) {
    const sub = parts[2];
    return {
      name: sub === 'requirements' ? 'requirements' : sub === 'build' ? 'build' : 'overview',
      id: parts[1],
    };
  }
  if (parts[0] === 'task' && parts[1]) return { name: 'task', id: parts[1] };
  if (parts[0] === 'tasks') return { name: 'home', mode: 'tasks' };
  if (parts[0] === 'memory') return { name: 'memory' };
  if (parts[0] === 'skills') return { name: 'skills' };
  if (parts[0] === 'management') return { name: 'management' };
  if (parts[0] === 'manage') return { name: 'portfolio', id: parts[1] || null };
  return { name: 'home', mode: 'projects' };
}

function modeForRoute(route) {
  if (route.name === 'task') return 'tasks';
  if (route.name === 'home') return route.mode || 'projects';
  if (route.name === 'memory' || route.name === 'skills' || route.name === 'management') return app.mode;
  if (route.name === 'portfolio') return 'projects';
  return 'projects';
}

async function loadState() {
  const data = await apiGet('/api/state');
  app.state = data;
}

async function loadProject(id) {
  const data = await apiGet(`/api/projects/${id}`);
  app.project = data.project;
  app.task = null;
  updateProjectSummary(data.project.summary);
}

async function loadTask(id) {
  const data = await apiGet(`/api/tasks/${id}`);
  app.task = data.task;
  app.project = null;
  updateTaskSummary(data.task.summary);
}

async function loadMemory() {
  app.memory = await apiGet('/api/memory');
  if (app.state.counts) app.state.counts.memories = app.memory.stats.total;
}

async function loadSkillsData() {
  const [skills, tools, extensionsData] = await Promise.all([
    apiGet('/api/skills'),
    apiGet('/api/tools'),
    apiGet('/api/extensions'),
  ]);
  app.skillsData = skills;
  app.toolsData = tools;
  app.extensionsData = extensionsData;
  if (app.state.counts) {
    app.state.counts.skills = skills.skills.filter((skill) => skill.enabled !== false).length;
    app.state.counts.tools = tools.tools.filter((tool) => tool.enabled !== false).length;
    app.state.counts.extensions = extensionsData.modules.length;
  }
}

async function loadManagementData() {
  app.management = await apiGet('/api/management');
}

async function loadPortfolio(projectId = null) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  app.portfolio = await apiGet(`/api/portfolio${query}`);
  app.portfolioId = app.portfolio.root?.id || null;
}

function updateProjectSummary(summary) {
  if (!summary) return;
  const list = app.state.projects || [];
  const index = list.findIndex((item) => item.id === summary.id);
  if (index >= 0) list[index] = { ...list[index], ...summary };
  else list.unshift(summary);
}

function updateTaskSummary(summary) {
  if (!summary) return;
  const list = app.state.tasks || [];
  const index = list.findIndex((item) => item.id === summary.id);
  if (index >= 0) list[index] = { ...list[index], ...summary };
  else list.unshift(summary);
}

function projectById(id) {
  return (app.state.projects || []).find((item) => item.id === id) || null;
}

function folderContents(folderId) {
  return (app.state.projects || []).filter((item) =>
    item.kind === 'folder' ? item.parentId === folderId : item.folderId === folderId
  );
}

function projectDescendants(id) {
  const self = projectById(id);
  if (!self) return [];
  if (self.kind === 'project') return [];
  const folderIds = new Set([id]);
  const result = [];
  const queue = [id];
  while (queue.length) {
    const parent = queue.shift();
    for (const item of app.state.projects || []) {
      if (item.kind !== 'folder' || item.parentId !== parent || folderIds.has(item.id)) continue;
      folderIds.add(item.id);
      result.push(item);
      queue.push(item.id);
    }
    for (const item of app.state.projects || []) {
      if (item.kind !== 'project' || item.folderId !== parent) continue;
      if (!result.some((entry) => entry.id === item.id)) result.push(item);
    }
  }
  return result;
}

function projectSubtreeIds(id) {
  if (!id) return null;
  const self = projectById(id);
  if (!self) return new Set();
  if (self.kind === 'project') return new Set([id]);
  return new Set([id, ...projectDescendants(id).map((item) => item.id)]);
}

function currentFolderId() {
  if (app.project?.kind === 'folder') return app.project.id;
  if (app.project?.folderId) return app.project.folderId;
  if (app.route.name === 'portfolio' && app.portfolioId) {
    const selected = projectById(app.portfolioId);
    if (selected?.kind === 'folder') return selected.id;
    if (selected?.folderId) return selected.folderId;
  }
  return '';
}

function projectTreeRows(rootId = null) {
  const all = app.state.projects || [];
  const allowed = rootId ? projectSubtreeIds(rootId) : null;
  const visible = allowed ? all.filter((item) => allowed.has(item.id)) : all;
  const folders = visible.filter((item) => item.kind === 'folder');
  const projects = visible.filter((item) => item.kind === 'project');
  const folderIds = new Set(folders.map((item) => item.id));
  const rows = [];
  const placed = new Set();
  const walkFolder = (folderId, depth) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;
    rows.push({ item: folder, depth });
    placed.add(folder.id);
    for (const child of folders.filter((item) => item.parentId === folderId)) {
      walkFolder(child.id, depth + 1);
    }
    for (const project of projects.filter((item) => item.folderId === folderId)) {
      rows.push({ item: project, depth: depth + 1 });
      placed.add(project.id);
    }
  };
  for (const folder of folders.filter(
    (item) => !item.parentId || !folderIds.has(item.parentId)
  )) {
    walkFolder(folder.id, 0);
  }
  for (const project of projects.filter(
    (item) => !item.folderId || !folderIds.has(item.folderId)
  )) {
    if (!placed.has(project.id)) rows.push({ item: project, depth: 0 });
  }
  return rows;
}

function folderOptions(excludeId = null) {
  return projectTreeRows()
    .filter(({ item }) => item.kind === 'folder' && item.id !== excludeId)
    .map(({ item, depth }) => ({
      ...item,
      depth,
      label: `${'　'.repeat(depth)}📁 ${item.name}`,
    }));
}

function projectOptions() {
  return (app.state.projects || []).filter((item) => item.kind === 'project');
}

async function route(options = {}) {
  const next = parseHash();
  if (app.shellMode && DIALOG_ROUTES.has(next.name)) {
    openExternalDialog(location.hash);
    const fallback =
      next.name === 'task'
        ? '#/tasks'
        : next.name === 'management'
        ? '#/projects'
        : next.id
        ? `#/project/${next.id}`
        : '#/projects';
    history.replaceState(null, '', fallback);
    return route({ initial: true });
  }
  if (window.innerWidth <= 840) toggleSidebar(false);
  if (!options.initial && app.busy) {
    app.busy.controller?.abort();
    app.busy = null;
  }
  app.route = next;
  app.mode = modeForRoute(next);
  renderSidebar();
  renderTopbar();

  if (next.name === 'home') {
    app.project = null;
    app.task = null;
    renderView();
    return;
  }

  const isSystem = next.name === 'memory' || next.name === 'skills' || next.name === 'management' || next.name === 'portfolio';
  if (isSystem) {
    app.project = null;
    app.task = null;
  }

  const view = $('#view');
  if (view) {
    view.className = 'view';
    const labels = {
      task: '任务',
      memory: '记忆库',
      skills: '技能与工具',
      management: '软件管理',
      portfolio: '项目总管理',
    };
    view.innerHTML = `<div class="boot"><div class="boot-orbit"><span></span></div><p>正在载入${labels[next.name] || '项目'}…</p></div>`;
  }

  try {
    if (next.name === 'task') await loadTask(next.id);
    else if (next.name === 'memory') await loadMemory();
    else if (next.name === 'skills') await loadSkillsData();
    else if (next.name === 'management') await loadManagementData();
    else if (next.name === 'portfolio') await loadPortfolio(next.id);
    else await loadProject(next.id);
  } catch (err) {
    toast(err.message, 'bad');
    location.hash = app.mode === 'tasks' ? '#/tasks' : '#/projects';
    return;
  }

  renderSidebar();
  renderTopbar();
  renderView();
  document.title = pageTitle();
}

function pageTitle() {
  const settings = app.state.settings || {};
  const suffix = settings.demo ? '演示模式' : settings.model || 'DeepSeek';
  if (app.route.name === 'task' && app.task) return `${app.task.title} · 任务 — DSH 控制台`;
  if (app.route.name === 'requirements' && app.project) return `${app.project.name} · 需求文档 — DSH 控制台`;
  if (app.route.name === 'build' && app.project) return `${app.project.name} · 项目制作 — DSH 控制台`;
  if (app.route.name === 'overview' && app.project) return `${app.project.name} — DSH 控制台`;
  if (app.route.name === 'memory') return '记忆库 · 我的智能体 — DSH 控制台';
  if (app.route.name === 'skills') return '技能与工具 — DSH 控制台';
  if (app.route.name === 'management') return '软件管理 — DSH 控制台';
  if (app.route.name === 'portfolio') return '项目总管理 — DSH 控制台';
  return `DeepSeek Harness 控制台 · ${suffix}`;
}

/* --------------------------------------------------------------------------
   sidebar / topbar
   -------------------------------------------------------------------------- */

function renderSidebar() {
  const settings = app.state.settings || {};
  const demo = settings.demo !== false;
  const usingDsh = settings.chatBackend === 'dsh';
  const dot = $('#api-dot');
  const label = $('#api-label');
  const sub = $('#api-sub');
  if (dot) dot.className = `dot ${demo ? 'warn' : 'ok'}`;
  if (label) label.textContent = demo ? '演示模式' : usingDsh ? '本机 DSH' : 'API 已连接';
  if (sub)
    sub.textContent = demo
      ? '配置 Key 或本机 DSH 后接入真实模型'
      : usingDsh
      ? '使用已安装的 DeepSeek Harness'
      : settings.model || 'deepseek-chat';
  const statusBtn = $('#api-status');
  if (statusBtn)
    statusBtn.title = demo
      ? '没有可用的对话后端'
      : usingDsh
      ? '对话由本机已安装的 DeepSeek Harness 提供'
      : `模型：${settings.model || ''}`;

  const isProjects = app.mode === 'projects';
  const title = $('#side-title');
  const count = $('#side-count');
  const add = $('#add-side');
  const addFolder = $('#add-folder');
  if (title) title.textContent = isProjects ? '项目' : '任务';
  if (add) {
    add.dataset.action = isProjects ? 'new-project' : 'new-task';
    add.dataset.parent = isProjects ? currentFolderId() : '';
    add.title = isProjects ? '新建项目' : '新建任务';
  }
  if (addFolder) {
    addFolder.hidden = !isProjects;
    addFolder.dataset.parent = currentFolderId();
    addFolder.title = '新建文件夹';
  }
  if ($('#mode-projects')) $('#mode-projects').classList.toggle('active', isProjects);
  if ($('#mode-tasks')) $('#mode-tasks').classList.toggle('active', !isProjects);
  if ($('#mode-projects')) $('#mode-projects').setAttribute('aria-selected', String(isProjects));
  if ($('#mode-tasks')) $('#mode-tasks').setAttribute('aria-selected', String(!isProjects));

  const counts = app.state.counts || {};
  $$('.util-link').forEach((link) => {
    const key = link.dataset.util;
    link.classList.toggle('active', app.route.name === key);
  });
  if ($('#util-memory-count')) $('#util-memory-count').textContent = String(counts.memories || 0);
  if ($('#util-skills-count')) {
    $('#util-skills-count').textContent = String((counts.skills || 0) + (counts.tools || 0));
  }

  const list = $('#side-list');
  if (!list) return;

  if (isProjects) {
    const rows = projectTreeRows();
    if (count) count.textContent = String(rows.length);
    if (!rows.length) {
      list.innerHTML = `<div class="side-empty"><strong>还没有项目</strong>一个项目，两个对话：<br>需求文档 → 项目制作<div><button class="btn sm" data-action="new-project">${icon('plus')}新建</button></div></div>`;
      return;
    }
    list.innerHTML = rows
      .map(({ item, depth }) => {
        const active = app.route.id === item.id;
        const folder = item.kind === 'folder';
        return `<a class="side-item side-depth ${active ? 'active' : ''}" style="padding-left:${12 + depth * 14}px" href="#/project/${item.id}" draggable="true" data-project-id="${item.id}" ${folder ? `data-folder-id="${item.id}"` : ''}>
          <span class="status-dot ${esc(item.status)}"></span>
          <span class="side-item-body">
            <span class="side-item-name">${folder ? `${icon('folder')} ` : ''}${esc(item.name)}</span>
            <span class="side-item-meta">${folder ? `文件夹 · ${item.childCount || 0} 项` : `${esc(item.statusLabel)} · ${esc(relTime(item.updatedAt))}`}</span>
          </span>
        </a>`;
      })
      .join('');
    return;
  }

  const tasks = app.state.tasks || [];
  if (count) count.textContent = String(tasks.length);
  if (!tasks.length) {
    list.innerHTML = `<div class="side-empty"><strong>还没有任务</strong>直接描述目标，<br>DeepSeek 边做边产出文件<div><button class="btn sm" data-action="new-task">${icon('plus')}新建任务</button></div></div>`;
    return;
  }
  list.innerHTML = tasks
    .map((item) => {
      const active = app.route.id === item.id;
      return `<a class="side-item ${active ? 'active' : ''}" href="#/task/${item.id}">
        <span class="status-dot ${esc(item.status)}"></span>
        <span class="side-item-body">
          <span class="side-item-name">${esc(item.title)}</span>
          <span class="side-item-meta">${item.projectName ? `${esc(item.projectName)} · ` : ''}${esc(item.statusLabel)} · ${item.messageCount || 0} 条消息</span>
        </span>
      </a>`;
    })
    .join('');
}

function crumbFor(route) {
  if (app.dialogMode) {
    if (route.name === 'task' && app.task) return `<span class="current">${esc(app.task.title)}</span>`;
    if (route.name === 'requirements' && app.project)
      return `<span class="current">${esc(app.project.name)} · 需求文档</span>`;
    if (route.name === 'build' && app.project)
      return `<span class="current">${esc(app.project.name)} · 项目制作</span>`;
    if (route.name === 'management') return `<span class="current">软件管理对话</span>`;
    return '<span class="current">对话窗口</span>';
  }
  const menu = `<button class="icon-btn mobile-menu" data-action="toggle-sidebar" aria-label="菜单">${icon('menu')}</button>`;
  if (route.name === 'home') {
    return `${menu}<span class="current">${route.mode === 'tasks' ? '任务工作区' : '项目工作区'}</span>`;
  }
  if (route.name === 'task' && app.task) {
    return `${menu}<a href="#/tasks">任务</a><span class="crumb-sep">/</span><span class="current">${esc(app.task.title)}</span>`;
  }
  if (route.name === 'memory' || route.name === 'skills' || route.name === 'management' || route.name === 'portfolio') {
    const labels = { memory: '记忆库', skills: '技能与工具', management: '软件管理', portfolio: '项目总管理' };
    return `${menu}<span class="current">${labels[route.name]}</span>`;
  }
  if (app.project) {
    const back =
      route.name === 'overview'
        ? ''
        : `<a class="crumb-back" href="#/project/${app.project.id}" title="返回项目">${icon('back')}</a>`;
    const tail =
      route.name === 'requirements'
        ? `<span class="crumb-sep">/</span><span class="current">需求文档</span>`
        : route.name === 'build'
        ? `<span class="crumb-sep">/</span><span class="current">项目制作</span>`
        : `<span class="current">${esc(app.project.name)}</span>`;
    const prefix =
      route.name === 'overview'
        ? `<a href="#/projects">项目</a><span class="crumb-sep">/</span>`
        : `<a href="#/projects">项目</a><span class="crumb-sep">/</span><a href="#/project/${app.project.id}">${esc(app.project.name)}</a>`;
    return `${menu}${back}${prefix}${tail}`;
  }
  return `${menu}<span class="current">控制台</span>`;
}

function renderTopbar() {
  const topbar = $('#topbar');
  if (!topbar) return;
  const settings = app.state.settings || {};
  const demo = settings.demo !== false;
  const route = app.route;
  let actions = '';

  if (route.name === 'memory') {
    actions = `<button class="btn sm" data-action="extract-memory">${icon('sparkles')}<span>从对话提取</span></button>
      <button class="btn sm primary" data-action="new-memory">${icon('plus')}<span>新增记忆</span></button>`;
  } else if (route.name === 'skills') {
    actions =
      app.skillTab === 'tools'
        ? `<button class="btn sm primary" data-action="new-tool">${icon('plus')}<span>新增工具</span></button>
           <button class="icon-btn" data-action="reload-extensions" title="重新加载扩展">${icon('refresh')}</button>`
        : app.skillTab === 'extensions'
        ? `<button class="icon-btn" data-action="reload-extensions" title="重新加载扩展">${icon('refresh')}</button>
           <button class="btn sm" data-action="open-extensions-folder">${icon('external')}<span>打开扩展目录</span></button>`
        : `<button class="btn sm primary" data-action="new-skill">${icon('plus')}<span>新增技能</span></button>
           <button class="icon-btn" data-action="reload-extensions" title="重新加载扩展">${icon('refresh')}</button>`;
  } else if (route.name === 'management') {
    const staged = app.management?.management?.staged?.length || 0;
    actions = `${staged ? `<button class="btn sm primary" data-action="apply-update">${icon('check')}<span>应用更新</span></button>` : ''}
      <button class="icon-btn" data-action="toggle-system" title="系统档案" aria-pressed="${app.pane.system}">${icon('layout')}</button>`;
  } else if (route.name === 'portfolio') {
    actions = `<button class="btn sm" data-action="portfolio-refresh">${icon('refresh')}<span>刷新</span></button>
      <button class="btn sm" data-action="new-folder" data-parent="${app.portfolioId || ''}">${icon('folder')}<span>新建文件夹</span></button>
      <button class="btn sm primary" data-action="new-project" data-parent="${app.portfolioId || ''}">${icon('plus')}<span>新建项目</span></button>`;
  } else if (route.name === 'overview' && app.project) {
    actions =
      app.project.kind === 'folder'
        ? `<button class="btn sm primary" data-action="new-project" data-parent="${app.project.id}" data-kind="project">${icon('plus')}<span>项目</span></button>
           <button class="btn sm" data-action="new-folder" data-parent="${app.project.id}">${icon('folder')}<span>子文件夹</span></button>
           <button class="btn sm danger" data-action="delete-project">${icon('trash')}<span>移除</span></button>`
        : `<button class="btn sm" data-action="open-folder">${icon('folder')}<span>打开文件夹</span></button>
           <button class="btn sm danger" data-action="delete-project">${icon('trash')}<span>移除项目</span></button>`;
  } else if (route.name === 'requirements' && app.project) {
    const userMessages = (app.project.requirements?.messages || []).filter((m) => m.role === 'user').length;
    const busy = app.busy && (app.busy.kind === 'doc' || app.busy.kind === 'requirements');
    const canGenerate = userMessages > 0 && !busy;
    actions = `<button class="btn sm primary" data-action="generate-doc" ${canGenerate ? '' : 'disabled'}>${icon('sparkles')}<span>${
      app.busy?.kind === 'doc' ? '生成中…' : app.project.doc ? '重新生成' : '生成需求文档'
    }</span></button>
      <button class="icon-btn" data-action="toggle-doc" title="需求文档面板" aria-pressed="${app.pane.doc}">${icon('layout')}</button>`;
  } else if (route.name === 'build' && app.project) {
    actions = `<button class="btn sm" data-action="open-folder">${icon('folder')}<span>打开文件夹</span></button>
      <button class="icon-btn" data-action="toggle-files" title="文件面板" aria-pressed="${app.pane.files}">${icon('layout')}</button>`;
  } else if (route.name === 'task' && app.task) {
    actions = `<button class="btn sm" data-action="open-folder">${icon('folder')}<span>打开文件夹</span></button>
      <button class="icon-btn" data-action="toggle-files" title="文件面板" aria-pressed="${app.pane.files}">${icon('layout')}</button>
      <button class="icon-btn" data-action="delete-task" title="移除任务">${icon('trash')}</button>`;
  } else {
    actions = `<button class="icon-btn" data-action="settings" title="设置">${icon('settings')}</button>`;
  }

  topbar.innerHTML = `<div class="breadcrumb">${crumbFor(route)}</div>
    <div class="top-actions">${actions}
      <span class="model-pill ${demo ? 'demo' : ''}" title="${
        demo
          ? '演示模式：未配置 API Key'
          : settings.chatBackend === 'dsh'
          ? '由本机已安装的 DeepSeek Harness 提供对话'
          : '已连接 DeepSeek API'
      }"><span class="led"></span>${esc(
    demo ? 'demo' : settings.chatBackend === 'dsh' ? '本机 DSH' : settings.model || 'deepseek'
  )}</span>
    </div>`;
  renderWorkspaceBanner();
}

function renderWorkspaceBanner() {
  const banner = $('#workspace-banner');
  if (!banner) return;
  const root = app.state.root || {};
  if (app.dialogMode || !root.fallback) {
    banner.hidden = true;
    banner.innerHTML = '';
    return;
  }
  banner.hidden = false;
  banner.innerHTML = `<span class="banner-icon">${icon('alert')}</span>
    <span class="banner-text"><b>当前是受限启动</b>，无法写入 ${esc(
      root.preferred || '配置的工作区目录'
    )}。项目和任务实际保存在：</span>
    <code>${esc(root.path || '')}</code>
    <span class="banner-actions">
      <button class="btn sm" data-action="open-workspace">打开实际目录</button>
      <button class="btn sm" data-action="settings">更换目录</button>
    </span>
    <span class="banner-hint">要从 D 盘运行，请关闭应用后从文件资源管理器直接双击 exe，不要从对话里的文件链接启动。</span>`;
}

/* --------------------------------------------------------------------------
   views
   -------------------------------------------------------------------------- */

function renderView() {
  const view = $('#view');
  if (!view) return;
  const route = app.route;
  const isChat =
    route.name === 'requirements' ||
    route.name === 'build' ||
    route.name === 'task' ||
    route.name === 'management';
  view.className = `view${isChat ? ' chat-view' : ''}`;

  if (route.name === 'home') {
    view.innerHTML = emptyView();
    view.dataset.view = 'home';
  } else if (route.name === 'overview' && app.project) {
    view.innerHTML = overviewView();
    view.dataset.view = 'overview';
  } else if (route.name === 'requirements' && app.project) {
    view.innerHTML = requirementsView();
    view.dataset.view = 'requirements';
  } else if (route.name === 'build' && app.project) {
    view.innerHTML = buildView();
    view.dataset.view = 'build';
  } else if (route.name === 'task' && app.task) {
    view.innerHTML = taskView();
    view.dataset.view = 'task';
  } else if (route.name === 'memory') {
    view.innerHTML = memoryView();
    view.dataset.view = 'memory';
  } else if (route.name === 'skills') {
    view.innerHTML = skillsView();
    view.dataset.view = 'skills';
  } else if (route.name === 'management') {
    view.innerHTML = managementView();
    view.dataset.view = 'management';
  } else if (route.name === 'portfolio') {
    view.innerHTML = portfolioView();
    view.dataset.view = 'portfolio';
  } else {
    view.innerHTML = `<div class="boot"><div class="boot-orbit"><span></span></div><p>正在载入…</p></div>`;
    return;
  }

  document.title = pageTitle();
  applyPaneState();
  if (view.dataset.view === 'home' || view.dataset.view === 'overview' || view.dataset.view === 'memory' || view.dataset.view === 'skills') {
    view.scrollTop = 0;
  } else {
    requestAnimationFrame(() => scrollChat('auto'));
  }
  if (isChat) updateComposerState();
  if (view.dataset.view === 'memory') bindMemoryFilters();
}

function emptyView() {
  const isProjects = app.mode === 'projects';
  const projects = app.state.projects || [];
  const tasks = app.state.tasks || [];
  const fileCount = projects.reduce((sum, item) => sum + (item.fileCount || 0), 0);
  const stats = isProjects
    ? `<b>${projects.length}</b> 个项目 <span>·</span> <b>${fileCount}</b> 个产出文件`
    : `<b>${tasks.length}</b> 个任务 <span>·</span> <b>${tasks.reduce((s, t) => s + (t.fileCount || 0), 0)}</b> 个产出文件`;
  const steps = isProjects
    ? `<div class="empty-step"><b>01</b><span>需求访谈</span><small>DeepSeek 主动追问</small></div>
       <div class="empty-step"><b>02</b><span>需求文档</span><small>范围 + 可测试验收</small></div>
       <div class="empty-step"><b>03</b><span>项目制作</span><small>文件写入项目目录</small></div>`
    : `<div class="empty-step"><b>01</b><span>描述任务</span><small>一句话也可以开始</small></div>
       <div class="empty-step"><b>02</b><span>直接执行</span><small>不再走需求文档</small></div>
       <div class="empty-step"><b>03</b><span>文件产出</span><small>写入任务目录</small></div>`;
  return `<div class="empty-view">
    <div class="empty-glow"></div>
    <div class="empty-card">
      <div class="empty-mark">${icon('sparkles')}</div>
      <span class="eyebrow">${isProjects ? 'PROJECT WORKSPACE' : 'TASK WORKSPACE'}</span>
      <h2>${isProjects ? '把想法，变成可验收的交付' : '直接下达一个任务'}</h2>
      <p>${
        isProjects
          ? '先与 DeepSeek 澄清需求，形成需求文档，再把它交给执行工程师落成文件。整个工作区一次只关注一个对话。'
          : '任务模式跳过需求文档：描述你要的结果，DeepSeek 直接执行，并把产物写入独立的任务目录。'
      }</p>
      <div class="empty-actions">
        <button class="btn primary lg" data-action="${isProjects ? 'new-project' : 'new-task'}">${icon('plus')}${
    isProjects ? '新建项目' : '新建任务'
  }</button>
        ${isProjects ? `<button class="btn lg" data-action="new-folder">${icon('folder')}新建文件夹</button>` : ''}
        <button class="btn lg" data-action="settings">${icon('settings')}配置模型</button>
      </div>
      <div class="empty-steps">${steps}</div>
      <div class="empty-stats">${stats} <span>·</span> ${
    app.state.settings?.demo ? '当前为演示模式' : `模型 ${esc(app.state.settings?.model || '')}`
  }</div>
    </div>
  </div>`;
}

function portfolioView() {
  const data = app.portfolio;
  if (!data) return `<div class="boot"><p>正在读取项目总览…</p></div>`;
  const rows = projectTreeRows();
  const selected = app.portfolioId ? projectById(app.portfolioId) : null;
  const selectedFolder = selected && selected.kind === 'folder';
  const totals = data.totals || {};
  const projects = (data.projects || []).filter((item) => item.kind !== 'folder');
  const outcomes = data.outcomes || [];
  const tasks = data.tasks || [];
  const memories = data.memories || [];
  const folderCount = (data.projects || []).filter((item) => item.kind === 'folder').length;

  const tree = rows.length
    ? rows
        .map(({ item, depth }) => {
          const active = selected?.id === item.id;
          const folder = item.kind === 'folder';
          return `<button class="portfolio-tree-item ${active ? 'active' : ''}" style="padding-left:${10 + depth * 14}px" data-action="portfolio-select" data-id="${item.id}" draggable="true" data-project-id="${item.id}" ${folder ? `data-folder-id="${item.id}"` : ''}>
            <span class="portfolio-tree-icon">${icon(folder ? 'folder' : 'doc')}</span>
            <span>${esc(item.name)}</span>
            ${folder ? `<small>${item.childCount || 0}</small>` : ''}
          </button>`;
        })
        .join('')
    : `<div class="side-empty">还没有项目</div>`;

  const outcomeCards = outcomes.length
    ? outcomes
        .map((item) => {
          const files = (item.files || []).filter((file) => file.type === 'file');
          const preview = files
            .slice(0, 8)
            .map((file) => `<span class="portfolio-file">${icon('file')}${esc(file.path)}</span>`)
            .join('');
          return `<article class="portfolio-outcome">
            <div class="portfolio-outcome-head">
              <div><strong>${esc(item.projectName)}</strong><small>${esc(item.dir || '')}</small></div>
              <a class="btn sm" href="#/project/${item.projectId}">打开</a>
            </div>
            <div class="portfolio-outcome-stats">
              <span>${files.length} 个文件</span>
              <span>${item.hasDoc ? `需求文档 v${item.docVersion}` : '暂无需求文档'}</span>
              <span>${item.buildStarted ? `${item.buildMessages} 条制作消息` : '尚未开始制作'}</span>
            </div>
            <div class="portfolio-files">${preview || '<span class="muted">还没有产出文件</span>'}</div>
          </article>`;
        })
        .join('')
    : `<div class="memory-empty"><strong>没有成果</strong>这个范围下还没有项目产出。</div>`;

  const taskRows = tasks.length
    ? tasks
        .map(
          (task) => `<a class="portfolio-row" href="#/task/${task.id}">
            <span class="status-dot ${esc(task.status)}"></span>
            <span class="portfolio-row-main"><strong>${esc(task.title)}</strong><small>${esc(task.projectName || '未归属项目')} · ${task.messageCount || 0} 条消息</small></span>
            <span class="portfolio-row-meta">${task.fileCount || 0} 个文件</span>
          </a>`
        )
        .join('')
    : `<div class="memory-empty">这个范围下还没有任务。</div>`;

  const memoryRows = memories.length
    ? memories
        .map(
          (memory) => `<article class="portfolio-memory">
            <div class="portfolio-memory-head"><strong>${esc(memory.title)}</strong><span>${esc(memory.projectName || '')}</span></div>
            <p>${esc(memory.content)}</p>
          </article>`
        )
        .join('')
    : `<div class="memory-empty">这个范围下还没有对话记忆。</div>`;

  const scopeTitle = selected ? selected.name : '全部项目';
  return `<div class="system-page portfolio-page">
    <header class="page-head">
      <div>
        <span class="eyebrow">PROJECT COMMAND · PORTFOLIO</span>
        <h1>项目总管理</h1>
        <p>文件夹可以有上下级；选择文件夹查看它下面所有项目的成果、任务与对话记忆，选择项目查看该项目本身。</p>
      </div>
      <div class="page-actions">
        <button class="btn sm" data-action="portfolio-refresh">${icon('refresh')}刷新</button>
        <button class="btn sm" data-action="new-folder" data-parent="${selected?.id || ''}">${icon('folder')}新建文件夹</button>
        <button class="btn sm primary" data-action="new-project" data-parent="${selected?.id || ''}" data-kind="project">${icon('plus')}新建项目</button>
      </div>
    </header>

    <div class="stat-strip">
      <div class="stat-card"><b>${totals.projects || projects.length}</b><span>项目</span></div>
      <div class="stat-card"><b>${totals.folders || folderCount}</b><span>文件夹</span></div>
      <div class="stat-card"><b>${totals.files || 0}</b><span>产出文件</span></div>
      <div class="stat-card"><b>${totals.tasks || tasks.length}</b><span>任务</span></div>
      <div class="stat-card"><b>${totals.memories || memories.length}</b><span>对话记忆</span></div>
    </div>

    <div class="portfolio-layout">
      <aside class="portfolio-tree">
        <button class="portfolio-tree-item ${selected ? '' : 'active'}" data-action="portfolio-select" data-id="">${icon('folder')}全部项目</button>
        ${tree}
      </aside>
      <div class="portfolio-main">
        <div class="portfolio-scope-head">
          <div>
            <span class="eyebrow">${selectedFolder ? 'FOLDER SCOPE' : 'PROJECT SCOPE'}</span>
            <h2>${esc(scopeTitle)}<small>${selected ? `包含 ${data.projects.length} 个节点` : '全部项目'}</small></h2>
          </div>
          <div class="portfolio-scope-actions">
            ${
              selected
                ? `<button class="btn sm" data-action="portfolio-rename" data-id="${selected.id}">${icon('edit')}重命名</button>
                   <button class="btn sm" data-action="portfolio-move" data-id="${selected.id}">${icon('folder')}移动</button>
                   <button class="btn sm danger" data-action="portfolio-delete" data-id="${selected.id}">${icon('trash')}移除</button>`
                : ''
            }
          </div>
        </div>

        <section class="portfolio-section">
          <div class="section-head"><div class="section-title">${icon('folder')}成果</div><span class="count">${outcomes.length}</span></div>
          <div class="portfolio-outcomes">${outcomeCards}</div>
        </section>

        <section class="portfolio-section">
          <div class="section-head"><div class="section-title">${icon('terminal')}任务</div><span class="count">${tasks.length}</span></div>
          <div class="portfolio-rows">${taskRows}</div>
        </section>

        <section class="portfolio-section">
          <div class="section-head"><div class="section-title">${icon('memory')}对话记忆</div><span class="count">${memories.length}</span></div>
          <div class="portfolio-memories">${memoryRows}</div>
        </section>
      </div>
    </div>
  </div>`;
}

function portfolioSelect(id) {
  location.hash = id ? `#/manage/${id}` : '#/manage';
}

function portfolioRename(id) {
  const project = projectById(id);
  if (!project) return;
  openModal(`${modalHead('重命名', '只修改显示名称，不改变已有项目目录和文件。')}
    <form id="portfolio-rename-form" data-id="${project.id}">
      <div class="field"><label>名称</label>
        <input id="pr-name" maxlength="60" value="${esc(project.name)}" required />
      </div>
      <div class="inline-result" id="pr-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary">保存</button>
      </div>
    </form>`);
}

function portfolioMove(id) {
  const project = projectById(id);
  if (!project) return;
  const blocked = new Set([project.id, ...projectDescendants(project.id).map((item) => item.id)]);
  const current = project.kind === 'folder' ? project.parentId : project.folderId;
  const options = folderOptions()
    .filter((item) => !blocked.has(item.id))
    .map(
      (item) =>
        `<option value="${item.id}" ${item.id === current ? 'selected' : ''}>${esc(item.label)}</option>`
    )
    .join('');
  openModal(`${modalHead('移动', '项目只能放进文件夹；文件夹可以移动到另一个文件夹。')}
    <form id="portfolio-move-form" data-id="${project.id}">
      <div class="field"><label>移动到文件夹</label>
        <select id="pm-parent">
          <option value="" ${current ? '' : 'selected'}>无（顶层）</option>
          ${options}
        </select>
      </div>
      <div class="inline-result" id="pm-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary">移动</button>
      </div>
    </form>`);
}

function portfolioDelete(id) {
  const project = projectById(id);
  if (!project) return;
  const count = projectDescendants(id).length;
  confirmModal({
    title: '移除项目',
    message: `${esc(project.name)}${count ? ` 下面还有 ${count} 个子项，移除后会自动移到它的上级` : ''}。项目文件会保留，只从控制台移除记录。`,
    confirmText: '移除',
    danger: true,
    onConfirm: async () => {
      try {
        const data = await apiDelete(`/api/projects/${project.id}`);
        await loadState();
        closeModal();
        if (app.portfolioId === project.id) {
          app.portfolioId = null;
          location.hash = '#/manage';
        }
        await loadPortfolio(app.portfolioId);
        toast(`已移除，${data.movedChildren || 0} 个子项已移到上级`, 'ok');
        route({ initial: true });
      } catch (err) {
        toast(err.message, 'bad');
      }
    },
  });
}

function memoryView() {
  const data = app.memory;
  if (!data) return `<div class="boot"><p>正在读取记忆…</p></div>`;
  const stats = data.stats || {};
  const agent = data.agent || {};
  const memories = data.memories || [];
  const types = data.types || {};
  const typeFilters = [
    ['all', '全部'],
    ['preference', '偏好'],
    ['decision', '决定'],
    ['project', '项目'],
    ['conversation', '对话'],
    ['fact', '事实'],
    ['profile', '画像'],
    ['insight', '洞察'],
  ].filter(([key]) => key === 'all' || (stats.byType || {})[key]);

  const cards = memories.length
    ? memories.map(memoryCardHtml).join('')
    : `<div class="memory-empty"><strong>还没有记忆</strong>对话一阵子后，DeepSeek 会自动沉淀偏好与决定；也可以手动新增，或从已有对话中提取。</div>`;

  const conversations = (data.conversations || [])
    .map(
      (conversation) => `<a class="conv-row" href="${conversation.kind === 'task' ? '#/task/' : '#/project/'}${conversation.id}">
        <span class="conv-icon">${icon(conversation.kind === 'task' ? 'terminal' : 'message')}</span>
        <span class="conv-main"><strong>${esc(conversation.name)}</strong><small>${esc(conversation.preview)}</small></span>
        <span class="conv-meta">${conversation.kind === 'task' ? '任务' : '项目'} · ${conversation.messageCount} 条<br>${relTime(conversation.updatedAt)}</span>
      </a>`
    )
    .join('');

  return `<div class="system-page">
    <header class="page-head">
      <div>
        <span class="eyebrow">MEMORY · PERSONAL AGENT</span>
        <h1>记忆库</h1>
        <p>这里保存跨项目、跨对话沉淀的长期记忆。它会自动注入之后的每一次对话，逐渐形成专属于你的智能体；你随时可以修改、置顶或删除。</p>
      </div>
      <div class="page-actions">
        <button class="btn sm" data-action="edit-agent">${icon('edit')}编辑智能体</button>
        <button class="btn sm primary" data-action="new-memory">${icon('plus')}新增记忆</button>
      </div>
    </header>

    <div class="stat-strip">
      <div class="stat-card"><b>${stats.total || 0}</b><span>长期记忆</span></div>
      <div class="stat-card"><b>${stats.pinned || 0}</b><span>置顶记忆</span></div>
      <div class="stat-card"><b>${(stats.projects || 0) + (stats.tasks || 0)}</b><span>项目与任务</span></div>
      <div class="stat-card"><b>${stats.conversations || 0}</b><span>对话档案</span></div>
    </div>

    <div class="agent-card">
      <div class="agent-orb">DS</div>
      <div class="agent-info">
        <span class="eyebrow">MY AGENT PROFILE</span>
        <h2>${esc(agent.name || '我的智能体')}</h2>
        <p>${esc(agent.role || '还没有设置角色')}</p>
        <div class="agent-attrs">
          <span>语气 · ${esc(agent.tone || '未设置')}</span>
          <span>偏好 · ${esc(agent.preferences || '未设置')}</span>
          <span>原则 · ${esc(agent.principles || '未设置')}</span>
        </div>
      </div>
      <button class="btn sm" data-action="edit-agent">${icon('edit')}编辑画像</button>
    </div>

    <div class="memory-toolbar">
      <div class="search-box">${icon('search')}<input id="memory-search" placeholder="搜索记忆、标签或项目…" value="${esc(
        app.memoryFilter.q
      )}" /></div>
      <div class="filter-row">${typeFilters
        .map(
          ([key, label]) =>
            `<button class="filter-chip ${app.memoryFilter.type === key ? 'active' : ''}" data-memory-type="${key}">${label}${
              key === 'all' ? ` ${memories.length}` : ` ${(stats.byType || {})[key] || 0}`
            }</button>`
        )
        .join('')}</div>
      <label class="pin-filter"><input type="checkbox" id="memory-pinned" ${
        app.memoryFilter.pinned ? 'checked' : ''
      } />只看置顶</label>
      <span class="chip" id="memory-visible-count">${memories.length} 条</span>
    </div>

    <div class="memory-list" id="memory-list">${cards}</div>
    <div class="memory-empty" id="memory-noresult" hidden>没有匹配的记忆，试试换个关键词或筛选条件。</div>

    <section class="archive">
      <div class="archive-head">
        <div class="archive-title">${icon('book')}对话档案 <span class="count">${data.conversations?.length || 0}</span></div>
        <span class="chip">对话内容仍然按项目隔离</span>
      </div>
      <div class="conv-list">${conversations || '<div class="memory-empty">还没有项目或任务对话。</div>'}</div>
    </section>
  </div>`;
}

function memoryCardHtml(memory) {
  const label = (app.memory?.types || {})[memory.type] || memory.type || '记忆';
  const tags = (memory.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('');
  return `<article class="memory-card ${memory.pinned ? 'pinned' : ''}" data-memory-card data-type="${esc(
    memory.type
  )}" data-pinned="${memory.pinned ? '1' : '0'}" data-text="${esc(
    `${memory.title} ${memory.content} ${(memory.tags || []).join(' ')} ${memory.projectName || ''}`.toLowerCase()
  )}">
    <div class="memory-top">
      <span class="memory-type type-${esc(memory.type)}">${esc(label)}</span>
      <h3 title="${esc(memory.title)}">${esc(memory.title)}</h3>
      <span class="memory-time">${relTime(memory.updatedAt || memory.createdAt)}</span>
    </div>
    <p class="memory-content">${esc(memory.content)}</p>
    <div class="memory-foot">
      ${tags}
      <span class="memory-source">${memory.source === 'auto' ? '自动沉淀' : '手动记录'}${
    memory.projectName ? ` · ${esc(memory.projectName)}` : ''
  }</span>
      <div class="memory-actions">
        <button class="icon-btn" data-action="toggle-pin" data-id="${memory.id}" title="${
    memory.pinned ? '取消置顶' : '置顶'
  }">${icon('pin')}</button>
        <button class="icon-btn" data-action="edit-memory" data-id="${memory.id}" title="编辑">${icon('edit')}</button>
        <button class="icon-btn" data-action="delete-memory" data-id="${memory.id}" title="删除">${icon('trash')}</button>
      </div>
    </div>
  </article>`;
}

function bindMemoryFilters() {
  const search = $('#memory-search');
  const pinned = $('#memory-pinned');
  if (search) {
    search.addEventListener('input', () => {
      app.memoryFilter.q = search.value.trim().toLowerCase();
      applyMemoryFilters();
    });
  }
  if (pinned) {
    pinned.addEventListener('change', () => {
      app.memoryFilter.pinned = pinned.checked;
      applyMemoryFilters();
    });
  }
  $$('[data-memory-type]').forEach((chip) => {
    chip.addEventListener('click', () => {
      app.memoryFilter.type = chip.dataset.memoryType;
      $$('[data-memory-type]').forEach((item) => item.classList.toggle('active', item === chip));
      applyMemoryFilters();
    });
  });
  applyMemoryFilters();
}

function applyMemoryFilters() {
  const cards = $$('[data-memory-card]');
  let visible = 0;
  for (const card of cards) {
    const typeOk = app.memoryFilter.type === 'all' || card.dataset.type === app.memoryFilter.type;
    const pinOk = !app.memoryFilter.pinned || card.dataset.pinned === '1';
    const textOk = !app.memoryFilter.q || card.dataset.text.includes(app.memoryFilter.q);
    const show = typeOk && pinOk && textOk;
    card.classList.toggle('hidden', !show);
    if (show) visible += 1;
  }
  if ($('#memory-visible-count')) $('#memory-visible-count').textContent = `${visible} 条`;
  if ($('#memory-noresult')) $('#memory-noresult').hidden = visible > 0;
}

function skillsView() {
  const skills = app.skillsData?.skills || [];
  const tools = app.toolsData?.tools || [];
  const modules = app.extensionsData?.modules || [];
  const tab = app.skillTab;
  const tabs = `<div class="tabs">
    <button class="tab ${tab === 'skills' ? 'active' : ''}" data-action="skill-tab" data-tab="skills">${icon(
    'puzzle'
  )}技能 <span class="count">${skills.length}</span></button>
    <button class="tab ${tab === 'tools' ? 'active' : ''}" data-action="skill-tab" data-tab="tools">${icon(
    'wrench'
  )}工具 <span class="count">${tools.length}</span></button>
    <button class="tab ${tab === 'extensions' ? 'active' : ''}" data-action="skill-tab" data-tab="extensions">${icon(
    'plug'
  )}扩展接口 <span class="count">${modules.length}</span></button>
  </div>`;

  let panel = '';
  if (tab === 'skills') {
    panel = `<div class="section-intro"><p>技能是注入系统提示词的能力说明。启用后会参与所有对话；完整说明最多注入 8 条，避免挤占上下文。</p>
      <button class="btn sm" data-action="new-skill">${icon('plus')}新增技能</button></div>
      <div class="skill-grid">${skills.map(skillCardHtml).join('') || '<div class="memory-empty">还没有技能。</div>'}</div>`;
  } else if (tab === 'tools') {
    panel = `<div class="section-intro"><p>工具由模型提出请求、你确认后执行；结果会记入运行历史。HTTP 工具支持 <code>{{参数}}</code> 占位符，命令工具在本机执行，请只添加可信内容。</p>
      <button class="btn sm" data-action="new-tool">${icon('plus')}新增工具</button></div>
      <div class="skill-grid">${tools.map(toolCardHtml).join('') || '<div class="memory-empty">还没有工具。</div>'}</div>
      ${runHistoryHtml()}`;
  } else {
    panel = extensionsPanelHtml();
  }

  return `<div class="system-page">
    <header class="page-head">
      <div><span class="eyebrow">CAPABILITIES · EXTENSIONS</span><h1>技能与工具</h1>
      <p>把可复用的做事方法固化成技能，把外部能力封装成工具。所有能力都会进入对话上下文，并在需要时由你批准执行。</p></div>
      <div class="page-actions">
        <button class="btn sm" data-action="reload-extensions">${icon('refresh')}重新加载扩展</button>
        <button class="btn sm" data-action="open-extensions-folder">${icon('external')}扩展目录</button>
      </div>
    </header>
    ${tabs}
    ${panel}
  </div>`;
}

function skillCardHtml(skill) {
  const isExtension = Boolean(skill.extension);
  const badge = isExtension ? '<span class="badge extension">EXTENSION</span>' : skill.builtin ? '<span class="badge builtin">BUILT-IN</span>' : '<span class="badge">CUSTOM</span>';
  return `<article class="skill-card">
    <div class="skill-card-head">
      <h3>${esc(skill.name)}</h3>
      ${badge}
      <label class="switch" title="${skill.enabled !== false ? '已启用' : '已停用'}">
        <input type="checkbox" data-skill-toggle="${skill.id}" ${skill.enabled !== false ? 'checked' : ''} ${isExtension ? 'disabled' : ''} />
        <span></span>
      </label>
    </div>
    <p class="skill-desc">${esc(skill.description || '没有描述')}</p>
    <div class="skill-preview">${esc((skill.instructions || '（未填写具体指令）').slice(0, 420))}</div>
    <div class="card-foot">
      ${(skill.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}
      <div class="card-actions">
        ${
          isExtension
            ? '<span class="badge">扩展只读</span>'
            : `<button class="btn sm ghost" data-action="edit-skill" data-id="${skill.id}">${icon('edit')}编辑</button>
               <button class="btn sm ghost" data-action="delete-skill" data-id="${skill.id}">${icon('trash')}删除</button>`
        }
      </div>
    </div>
  </article>`;
}

function toolCardHtml(tool) {
  const isExtension = Boolean(tool.extension);
  const badge = isExtension
    ? '<span class="badge extension">EXTENSION</span>'
    : tool.builtin
    ? '<span class="badge builtin">BUILT-IN</span>'
    : '<span class="badge">CUSTOM</span>';
  const schema = tool.schema || '{"type":"object","properties":{}}';
  return `<article class="skill-card tool-card">
    <div class="skill-card-head">
      <h3>${esc(tool.label || tool.name)}</h3>
      <span class="tool-category">${esc(tool.type)}</span>
      ${badge}
      <label class="switch" title="${tool.enabled !== false ? '已启用' : '已停用'}">
        <input type="checkbox" data-tool-toggle="${tool.id}" ${tool.enabled !== false ? 'checked' : ''} ${isExtension ? 'disabled' : ''} />
        <span></span>
      </label>
    </div>
    <p class="skill-desc"><code>${esc(tool.name)}</code> · ${esc(tool.description || '没有描述')}</p>
    <div class="skill-preview">${esc(schema.slice(0, 420))}</div>
    <div class="card-foot">
      <div class="card-actions">
        <button class="btn sm" data-action="run-tool-page" data-name="${esc(tool.name)}" ${
    tool.enabled === false ? 'disabled' : ''
  }>${icon('play')}运行</button>
        ${
          isExtension
            ? '<span class="badge">扩展只读</span>'
            : `<button class="btn sm ghost" data-action="edit-tool" data-id="${tool.id}">${icon('edit')}编辑</button>
               <button class="btn sm ghost" data-action="delete-tool" data-id="${tool.id}">${icon('trash')}删除</button>`
        }
      </div>
    </div>
  </article>`;
}

function runHistoryHtml() {
  const runs = app.toolsData?.runs || [];
  if (!runs.length) return '';
  return `<div class="run-history"><div class="run-history-head">最近运行</div>
    ${runs
      .slice(0, 8)
      .map(
        (run) => `<div class="run-history-row"><span class="${run.ok ? 'ok' : 'bad'}">${run.ok ? '成功' : '失败'}</span>
          <span class="name">${esc(run.name)}</span>
          <span>${run.durationMs} ms</span><span>${relTime(run.createdAt)}</span></div>`
      )
      .join('')}
  </div>`;
}

function extensionsPanelHtml() {
  const data = app.extensionsData || {};
  const modules = data.modules || [];
  const errors = data.errors || [];
  return `<div class="ext-toolbar">
      <span class="path" title="${esc(data.dir || '')}">${esc(data.dir || '')}</span>
      <button class="btn sm" data-action="reload-extensions">${icon('refresh')}重新加载</button>
      <button class="btn sm" data-action="open-extensions-folder">${icon('external')}打开目录</button>
    </div>
    <div class="ext-grid">
      ${modules
        .map(
          (mod) => `<article class="ext-card"><h3>${esc(mod.name)} <span class="badge extension">v${esc(
            mod.version || '1.0.0'
          )}</span></h3><p>${esc(mod.description || '没有说明')} · ${esc(mod.file || '')}</p>
          <div class="ext-counts"><span>${mod.skills?.length || 0} 技能</span><span>${mod.tools?.length || 0} 工具</span></div></article>`
        )
        .join('') || '<div class="memory-empty">还没有扩展模块。可以在扩展目录新建一个 .js 文件。</div>'}
    </div>
    ${errors.length ? `<div class="ext-error">${errors.map((err) => `${esc(err.file)}：${esc(err.message)}`).join('<br>')}</div>` : ''}
    <div class="docs-card">
      <h3>扩展接口</h3>
      <p>扩展模块可以同时提供技能与工具；工具通过 <code>execute(args, ctx)</code> 执行，技能是注入系统提示词的说明。新增 API、记忆结构和提示词注入点都保持独立，便于持续改进。</p>
      <button class="btn sm" data-action="view-extension-docs">${icon('book')}查看接口文档</button>
    </div>`;
}

function managementView() {
  const data = app.management;
  if (!data) return `<div class="boot"><p>正在读取系统档案…</p></div>`;
  const messages = data.management?.messages || [];
  return `<div class="management-layout ${app.pane.system ? '' : 'pane-closed'}">
    <section class="chat-pane">
      <div class="chat-scroll" id="chat-scroll">
        <div class="chat-thread">
          ${promptChip('维护工程师 · 源码暂存模式')}
          ${messages.length ? '' : managementBrief()}
          ${messages.map((message) => messageHtml(message)).join('')}
        </div>
      </div>
      <div class="composer-wrap">${composerHtml('management')}</div>
    </section>
    ${managementSystemPanel(data)}
  </div>`;
}

function managementBrief() {
  return `<div class="brief-card">
    <div class="brief-icon">${icon('wrench')}</div>
    <h4>和维护工程师一起改进控制台</h4>
    <p>这里可以讨论界面、记忆注入、技能与工具、桌面外壳等改进。维护工程师可以读取源码，并把修改写进暂存区；只有你点「应用更新」后才会覆盖源码，重启应用生效。</p>
    <div class="brief-tips"><span>先读代码</span><span>完整文件块</span><span>暂存后确认</span><span>自动备份</span></div>
  </div>`;
}

function managementSystemPanel(data) {
  const system = data.system || {};
  const management = data.management || {};
  const staged = management.staged || [];
  const counts = system.counts || {};
  return `<aside class="system-panel" id="system-panel">
    <div class="context-head">
      <div class="context-title">${icon('terminal')}系统档案</div>
      <div class="context-actions">
        <button class="icon-btn tiny" data-action="toggle-system" title="收起">${icon('x')}</button>
      </div>
    </div>
    <div class="context-body">
      <div class="system-hero">
        <span class="label">DEEPSEEK HARNESS CONSOLE</span>
        <h3>v${esc(system.version || '1.0.0')} · 本地运行</h3>
        <p>${esc(system.appRoot || '')}</p>
      </div>
      <div class="system-stat-grid">
        <div class="system-stat"><b>${counts.projects || 0}</b><span>项目</span></div>
        <div class="system-stat"><b>${counts.memories || 0}</b><span>记忆</span></div>
        <div class="system-stat"><b>${counts.skills || 0}</b><span>启用技能</span></div>
        <div class="system-stat"><b>${counts.tools || 0}</b><span>启用工具</span></div>
      </div>
      <div class="system-section">
        <div class="system-section-head"><h4>暂存改动</h4><span class="count">${staged.length} 个文件</span></div>
        ${
          staged.length
            ? `<div class="staged-list">${staged
                .map(
                  (file) => `<button class="staged-row" data-action="open-staged-file" data-path="${esc(file.path)}">${icon(
                    'file'
                  )}<span class="name">${esc(file.path)}</span><span>${fmtBytes(file.bytes)}</span></button>`
                )
                .join('')}</div>
              <div class="staged-actions">
                <button class="btn sm primary" data-action="apply-update">${icon('check')}应用更新</button>
                <button class="btn sm ghost" data-action="discard-update">${icon('trash')}放弃</button>
              </div>
              <div class="doc-meta">应用前会备份原文件；应用后需重启应用。</div>`
            : `<div class="staged-empty">暂无暂存改动。<br>让维护工程师修改某个文件后，会先出现在这里。</div>`
        }
      </div>
      <div class="system-section">
        <div class="system-section-head"><h4>扩展接口</h4><span class="count">${counts.extensions || 0} 个模块</span></div>
        <div class="endpoint-list">${(system.endpoints || [])
          .slice(0, 10)
          .map((endpoint) => `<div class="endpoint-row">${esc(endpoint)}</div>`)
          .join('')}</div>
      </div>
      <div class="system-section">
        <div class="system-section-head"><h4>工作目录</h4></div>
        <button class="context-path" data-action="copy-path" data-path="${esc(system.dataDir || '')}">${icon(
    'folder'
  )}<span>${esc(system.dataDir || '')}</span></button>
      </div>
    </div>
    <div class="context-foot">
      <button class="context-path" data-action="copy-path" data-path="${esc(system.extensionsDir || '')}">${icon(
    'plug'
  )}<span>${esc(system.extensionsDir || '扩展目录')}</span></button>
    </div>
  </aside>`;
}

function folderOverviewView(project) {
  const children = project.children || folderContents(project.id);
  const cards = children.length
    ? children
        .map((child) => {
          const folder = child.kind === 'folder';
          const meta = folder
            ? `${child.childCount || 0} 项`
            : `${child.statusLabel || '待开始'} · ${child.fileCount || 0} 个产出`;
          return `<a class="portfolio-project-card" href="#/project/${child.id}">
            <span class="portfolio-project-icon">${icon('folder')}</span>
            <span class="portfolio-project-body">
              <strong>${esc(child.name)}</strong>
              <small>${esc(meta)}</small>
            </span>
            <span class="status-dot ${esc(child.status)}"></span>
          </a>`;
        })
        .join('')
    : `<div class="memory-empty"><strong>文件夹还是空的</strong>新建项目或子文件夹，把内容整理进来。</div>`;
  return `<div class="system-page portfolio-page">
    <header class="page-head">
      <div>
        <span class="eyebrow">PROJECT FOLDER</span>
        <h1>${esc(project.name)}</h1>
        <p>${esc(project.description || '文件夹可以有上下级，项目只作为文件夹里的条目。')}</p>
      </div>
      <div class="page-actions">
        <a class="btn sm" href="#/manage/${project.id}">${icon('folder')}总管理</a>
        <button class="btn sm" data-action="new-folder" data-parent="${project.id}">${icon('folder')}子文件夹</button>
        <button class="btn sm primary" data-action="new-project" data-parent="${project.id}" data-kind="project">${icon('plus')}项目</button>
      </div>
    </header>
    <div class="stat-strip">
      <div class="stat-card"><b>${children.length}</b><span>直属内容</span></div>
      <div class="stat-card"><b>${projectDescendants(project.id).length}</b><span>全部内容</span></div>
      <div class="stat-card"><b>${children.filter((item) => item.kind !== 'folder').length}</b><span>项目</span></div>
    </div>
    <section class="section-block">
      <div class="section-head"><div class="section-title">${icon('folder')}文件夹内容</div></div>
      <div class="portfolio-project-list">${cards}</div>
    </section>
  </div>`;
}

function overviewView() {
  const project = app.project;
  if (project.kind === 'folder') return folderOverviewView(project);
  const summary = project.summary || {};
  const messages = project.requirements?.messages || [];
  const userMessages = messages.filter((m) => m.role === 'user').length;
  const hasDoc = Boolean(project.doc);
  const buildStarted = Boolean(project.build?.startedAt);
  const files = (project.files || []).filter((f) => f.type === 'file');
  const doc = project.doc;

  const reqCard = `<article class="phase-card">
    <div class="phase-top">
      <span class="phase-num">01 / REQUIREMENTS</span>
      <span class="phase-icon">${icon('message')}</span>
    </div>
    <h3>需求文档</h3>
    <p>先说出你的初步想法。DeepSeek 会主动追问目标、边界和验收标准，最后整理成一份可直接实现的文档。</p>
    <div class="phase-foot">
      <span class="phase-status"><span class="dot ${userMessages ? 'doc' : ''}"></span>${
    userMessages ? `${userMessages} 轮对话` : '尚未开始'
  }${hasDoc ? ` · 文档 v${doc.version}` : ''}</span>
      <div class="phase-actions">
        ${hasDoc ? `<button class="btn sm ghost" data-action="view-doc">查看文档</button>` : ''}
        <a class="btn sm" href="#/project/${project.id}/requirements">${userMessages ? '继续访谈' : '开始访谈'}</a>
      </div>
    </div>
  </article>`;

  const buildLabel = buildStarted
    ? `${files.length} 个文件 · ${(project.build?.messages || []).length} 条消息`
    : hasDoc
    ? '需求文档已就绪'
    : '等待需求文档';
  const buildAction = !hasDoc
    ? `<button class="btn sm" disabled>${icon('lock')}暂不可用</button>`
    : !buildStarted
    ? `<button class="btn sm primary" data-action="start-build">${icon('sparkles')}开始制作</button>`
    : `<a class="btn sm" href="#/project/${project.id}/build">进入制作</a>`;

  const buildCard = `<article class="phase-card violet ${hasDoc ? '' : 'locked'}" data-num="02">
    <div class="phase-top">
      <span class="phase-num">02 / BUILD</span>
      <span class="phase-icon">${icon('terminal')}</span>
    </div>
    <h3>项目制作</h3>
    <p>把需求文档交给执行工程师。DeepSeek 会规划、生成文件，并写入项目目录，随后可以继续对话修改。</p>
    <div class="phase-foot">
      <span class="phase-status"><span class="dot ${files.length ? 'built' : buildStarted ? 'building' : ''}"></span>${esc(
    buildLabel
  )}</span>
      <div class="phase-actions">${buildAction}</div>
    </div>
  </article>`;

  const docSection = hasDoc
    ? `<section class="section-block">
        <div class="section-head">
          <div class="section-title">${icon('doc')}当前需求文档 <span class="count">v${doc.version}</span></div>
          <div class="section-actions">
            <button class="btn sm ghost" data-action="copy-doc">${icon('copy')}复制</button>
            <button class="btn sm ghost" data-action="download-doc">${icon('download')}下载</button>
            <button class="btn sm" data-action="view-doc">查看全文</button>
          </div>
        </div>
        <div class="doc-card">
          <div class="doc-card-head">
            <span class="doc-glyph">${icon('doc')}</span>
            <div><strong>${esc(project.name)} 需求文档</strong><small>版本 v${doc.version} · ${fmtDate(
        doc.createdAt
      )} · 已保存为 REQUIREMENTS.md</small></div>
            <div class="doc-head-actions"><a class="icon-btn" href="#/project/${project.id}/requirements" title="继续需求访谈">${icon(
        'message'
      )}</a></div>
          </div>
          <div class="doc-excerpt"><div class="md">${renderMarkdown(
            doc.markdown.split('\n').slice(0, 42).join('\n')
          )}</div></div>
        </div>
      </section>`
    : `<section class="section-block">
        <div class="section-head"><div class="section-title">${icon('sparkles')}工作流</div></div>
        <div class="workflow-strip">
          <div class="workflow-step"><b>先澄清，再动手</b><span>DeepSeek 会追问用户、流程、边界与验收，避免做到一半才发现偏差。</span></div>
          <div class="workflow-step"><b>形成可验收文档</b><span>功能需求带 FR 编号，验收标准可逐条测试，并保存到项目目录。</span></div>
          <div class="workflow-step"><b>交给执行工程师</b><span>文档作为上下文开启制作，所有文件落在 D 盘项目文件夹中。</span></div>
        </div>
      </section>`;

  const filesSection = files.length
    ? `<section class="section-block">
        <div class="section-head">
          <div class="section-title">${icon('folder')}最近产出 <span class="count">${files.length}</span></div>
          <div class="section-actions"><a class="btn sm ghost" href="#/project/${project.id}/build">打开制作对话</a></div>
        </div>
        <div class="file-mini-grid">${files
          .slice(0, 8)
          .map(
            (file) => `<button class="file-mini" data-action="open-file" data-path="${esc(file.path)}">
              ${icon(file.path.match(/\.(js|ts|tsx|jsx|css|html|json|py|go|rs)$/i) ? 'code' : 'file')}
              <span class="name">${esc(file.path)}</span><span class="size">${fmtBytes(file.size)}</span>
            </button>`
          )
          .join('')}</div>
      </section>`
    : '';

  return `<div class="overview">
    <header class="overview-head">
      <div class="eyebrow"><span class="status-dot ${esc(summary.status || 'new')}"></span>PROJECT · ${esc(
    String(project.id).toUpperCase()
  )}</div>
      <h1>${esc(project.name)}</h1>
      <p class="lede">${esc(
        project.description || '还没有填写项目描述。打开需求对话，让 DeepSeek 帮你把「想做什么」问清楚。'
      )}</p>
      <div class="meta-row">
        <span class="chip"><span class="dot ${summary.status === 'built' ? 'ok' : ''}"></span><b>${esc(
    summary.statusLabel || '待开始'
  )}</b></span>
        <span class="chip">${icon('clock')}创建于 ${fmtDate(project.createdAt)}</span>
        <button class="chip path-chip" data-action="copy-path" data-path="${esc(project.dir)}" title="复制项目路径">${icon(
    'folder'
  )}<span>${esc(project.dir)}</span></button>
      </div>
    </header>

    <div class="phase-grid">${reqCard}${buildCard}</div>
    ${docSection}
    ${filesSection}

    <div class="overview-danger">
      <button class="btn sm ghost" data-action="delete-project">${icon('trash')}移除项目</button>
    </div>
  </div>`;
}

function promptChip(text) {
  return `<div class="prompt-chip"><span class="glyph">${icon('sparkles')}</span><b>${esc(
    text
  )}</b><span>· 提示词已注入</span></div>`;
}

function briefCard(kind) {
  if (kind === 'requirements') {
    return `<div class="brief-card">
      <div class="brief-icon">${icon('message')}</div>
      <h4>先说出你的初步想法</h4>
      <p>不需要完整。比如「我想做一个给团队用的任务看板」。DeepSeek 会一轮轮追问目标用户、核心流程、边界和验收标准，信息足够后整理成正式需求文档。</p>
      <div class="brief-tips"><span>目标用户</span><span>核心流程</span><span>本期不做什么</span><span>验收标准</span></div>
    </div>`;
  }
  if (kind === 'build') {
    return `<div class="brief-card">
      <div class="brief-icon">${icon('terminal')}</div>
      <h4>执行工程师已就位</h4>
      <p>需求文档已经作为上下文发送。接下来它会给出实现计划，并把每个文件写入项目目录；你可以继续提出修改意见。</p>
      <div class="brief-tips"><span>完整文件</span><span>可直接运行</span><span>写入 D 盘项目目录</span></div>
    </div>`;
  }
  return `<div class="brief-card">
    <div class="brief-icon">${icon('terminal')}</div>
    <h4>直接描述你要完成的任务</h4>
    <p>任务模式没有需求文档环节。说清楚你希望的结果、交付形态或参考资料即可，DeepSeek 会直接执行，并把产物写入独立的任务目录。</p>
    <div class="brief-tips"><span>目标</span><span>交付形态</span><span>约束</span><span>验收方式</span></div>
  </div>`;
}

function messageHtml(message) {
  if (!message) return '';
  if (message.role === 'error') {
    return `<div class="msg error"><div class="msg-body">${icon('alert')} ${esc(message.content)}</div></div>`;
  }
  if (message.role === 'user' && message.kind === 'doc') {
    return `<div class="msg user doc-msg">
      <div class="msg-body">
        <button class="doc-attachment" data-action="view-doc">
          <span class="glyph">${icon('doc')}</span>
          <span><strong>需求文档 v${message.docVersion || 1} 已发送</strong><small>执行工程师将以它为上下文开始制作</small></span>
          <span class="chev">›</span>
        </button>
      </div>
    </div>`;
  }
  if (message.role === 'user') {
    return `<div class="msg user">
      <div class="msg-body">
        <div class="msg-head"><span>你</span><span>${fmtClock(message.ts)}</span></div>
        <div class="md">${renderMarkdown(message.content)}</div>
      </div>
    </div>`;
  }
  const streaming = Boolean(message.streaming);
  const contentHtml = streaming && !message.content
    ? '<span class="typing"><i></i><i></i><i></i></span>'
    : `${renderMarkdown(message.content)}${streaming ? '<span class="caret"></span>' : ''}`;
  const isManagement = app.route.name === 'management';
  const files = Array.isArray(message.files) && message.files.length
    ? `<div class="msg-files">${message.files
        .map(
          (file) => `<button class="file-card" data-action="${
            isManagement ? 'open-staged-file' : 'open-file'
          }" data-path="${esc(file.path)}">${icon('file')}<span>${esc(file.path)}</span><span class="size">${fmtBytes(
            file.size == null ? file.bytes : file.size
          )}</span></button>`
        )
        .join('')}</div>`
    : '';
  const toolCalls = toolCallsHtml(message);
  return `<div class="msg assistant ${message.interrupted ? 'interrupted' : ''}">
    <div class="msg-avatar">DS</div>
    <div class="msg-body">
      <div class="msg-head"><span class="msg-name">DeepSeek</span><span>${fmtClock(message.ts)}</span>${
    message.demo ? '<span class="msg-badge">DEMO</span>' : ''
  }${message.interrupted ? '<span class="msg-badge">已中断</span>' : ''}</div>
      <div class="md"${streaming ? ` data-stream-id="${esc(message.id)}"` : ''}>${contentHtml}</div>
      ${files}
      ${toolCalls}
    </div>
  </div>`;
}

function toolCallsHtml(message) {
  const calls = message.toolCalls || [];
  if (!calls.length) return '';
  const scope = app.route.name === 'management' ? 'self' : '';
  return calls
    .map(
      (call) => `<div class="tool-call">
        <div class="tool-call-head">${icon('wrench')}<strong>${esc(call.name)}</strong><span class="spacer"></span><span class="badge extension">TOOL REQUEST</span></div>
        <pre>${esc(JSON.stringify(call.args || {}, null, 2))}</pre>
        <div class="tool-call-foot"><button class="btn sm" data-action="run-tool" data-name="${esc(
          call.name
        )}" data-args="${esc(JSON.stringify(call.args || {}))}" data-scope="${scope}">${icon('play')}运行工具</button></div>
      </div>`
    )
    .join('');
}

function docReadyCard(project) {
  if (!project.doc) return '';
  return `<div class="doc-ready">
    <span class="check">${icon('check')}</span>
    <div><strong>需求文档 v${project.doc.version} 已生成</strong><small>已写入 REQUIREMENTS.md · 可以交给执行工程师</small></div>
    <a class="btn sm" href="#/project/${project.id}/build">进入项目制作</a>
  </div>`;
}

function composerHtml(kind) {
  const placeholders = {
    requirements: '回答追问，或补充你的想法…',
    build: '继续补充修改意见，或让 DeepSeek 完善文件…',
    task: '描述你要完成的任务…',
    management: '描述你希望如何改进控制台…',
  };
  const quick = {
    requirements: ['目标用户是团队内部', '先按你的建议来', '补充验收标准', '这一版先做最小闭环'],
    build: ['先跑通主流程', '补充使用说明', '检查并修复遗漏'],
    task: ['输出一份文档', '做一个可运行的网页原型', '先给我一个最小版本'],
    management: ['检查界面结构问题', '补充扩展接口文档', '优化记忆注入方式'],
  };
  const note = {
    requirements: 'DeepSeek 会主动追问；信息足够后点击「生成需求文档」。',
    build: '修改后的文件会直接写入项目目录；建议一次只提一类修改。',
    task: '任务模式没有需求文档环节，产物会写入任务目录。',
    management: '维护工程师的改动先进入暂存区；应用后重启生效。',
  };
  const busy = Boolean(app.busy);
  return `<form class="composer" id="composer" autocomplete="off">
    <div class="composer-box">
      <textarea id="composer-input" rows="1" maxlength="8000" placeholder="${placeholders[kind]}"></textarea>
      <div class="composer-bar">
        <span class="composer-hint">${
          busy ? (app.busy?.kind === 'doc' ? '正在整理需求文档…' : 'DeepSeek 正在回复…') : 'Enter 发送 · Shift + Enter 换行'
        }</span>
        <div class="composer-actions">${
          busy
            ? `<button type="button" class="stop-btn" data-action="stop">${icon('stop')}停止</button>`
            : `<button type="submit" class="send-btn" id="send-btn" aria-label="发送" disabled>${icon('send')}</button>`
        }</div>
      </div>
    </div>
    <div class="quick-row">${(quick[kind] || [])
      .map((item) => `<button type="button" class="quick-chip" data-quick="${esc(item)}">${esc(item)}</button>`)
      .join('')}</div>
    <div class="composer-note">${note[kind]}</div>
  </form>`;
}

function docPane(project) {
  const doc = project.doc;
  const busy = app.busy?.kind === 'doc';
  const userMessages = (project.requirements?.messages || []).filter((m) => m.role === 'user').length;
  let body;
  if (busy) {
    body = `<div class="doc-live"><span class="pulse"></span>正在生成需求文档</div>
      <div class="doc-body" id="doc-live-body"><div class="md">${
        app.docDraft ? renderMarkdown(app.docDraft) : '<span class="typing"><i></i><i></i><i></i></span>'
      }</div></div>`;
  } else if (doc) {
    body = `<div class="doc-body"><div class="md">${renderMarkdown(doc.markdown)}</div>
      <div class="doc-actions">
        <button class="btn sm" data-action="copy-doc">${icon('copy')}复制</button>
        <button class="btn sm ghost" data-action="download-doc">${icon('download')}下载 .md</button>
        <a class="btn sm ghost" href="#/project/${project.id}/build">进入制作</a>
      </div>
      <div class="doc-meta">版本 v${doc.version} · ${fmtDate(doc.createdAt)}<br>已保存 REQUIREMENTS.md</div>
    </div>`;
  } else {
    body = `<div class="doc-empty">
      <div class="glyph">${icon('doc')}</div>
      <p>还没有需求文档</p>
      <span>完成几轮追问后生成。文档会包含背景、范围、带编号的功能需求，以及可逐条测试的验收标准。</span>
      <button class="btn sm" data-action="generate-doc" ${userMessages && !app.busy ? '' : 'disabled'}>${icon(
      'sparkles'
    )}生成需求文档</button>
    </div>`;
  }

  return `<aside class="context-pane" id="context-pane">
    <div class="context-head">
      <div class="context-title">${icon('doc')}需求文档 ${doc ? `<span class="count">v${doc.version}</span>` : ''}</div>
      <div class="context-actions">
        ${doc ? `<button class="icon-btn tiny" data-action="copy-doc" title="复制">${icon('copy')}</button>` : ''}
        <button class="icon-btn tiny" data-action="toggle-doc" title="收起面板">${icon('x')}</button>
      </div>
    </div>
    <div class="context-body">${body}</div>
    <div class="context-foot"><button class="context-path" data-action="copy-path" data-path="${esc(project.dir)}" title="复制项目路径">${icon(
    'folder'
  )}<span>${esc(project.dir)}</span></button></div>
  </aside>`;
}

function requirementsView() {
  const project = app.project;
  const messages = project.requirements?.messages || [];
  return `<div class="chat-layout ${app.pane.doc ? '' : 'pane-closed'}">
    <section class="chat-pane">
      <div class="chat-scroll" id="chat-scroll">
        <div class="chat-thread">
          ${promptChip('需求分析师 · 主动追问')}
          ${messages.length ? '' : briefCard('requirements')}
          ${messages.map(messageHtml).join('')}
          ${docReadyCard(project)}
        </div>
      </div>
      <div class="composer-wrap">${composerHtml('requirements')}</div>
    </section>
    ${docPane(project)}
  </div>`;
}

function buildView() {
  const project = app.project;
  if (!project.doc) {
    return `<div class="ready-view"><div class="blocked-card">
      <div class="glyph">${icon('lock')}</div>
      <h2>还缺一份需求文档</h2>
      <p>项目制作需要以需求文档为上下文。先完成需求访谈并生成文档，再回来开始制作。</p>
      <a class="btn primary" href="#/project/${project.id}/requirements">${icon('message')}去梳理需求</a>
    </div></div>`;
  }

  if (!project.build?.startedAt) {
    return `<div class="ready-view"><div class="ready-card">
      <div class="ready-icon">${icon('terminal')}</div>
      <h2>需求文档已就绪</h2>
      <p>开始后，需求文档会作为上下文发送给执行工程师。它会先给出实现计划，再把完整文件写入项目目录。</p>
      <div class="ready-doc">${icon('doc')}<div class="meta"><strong>${esc(
      project.name
    )} 需求文档 v${project.doc.version}</strong><small>${fmtDate(project.doc.createdAt)} · ${
      project.doc.markdown.length
    } 字符</small></div></div>
      <div class="ready-actions">
        <button class="btn primary" data-action="start-build">${icon('sparkles')}开始制作</button>
        <button class="btn" data-action="view-doc">${icon('doc')}查看文档</button>
      </div>
      <div class="ready-hint">输出目录：${esc(project.dir)}</div>
    </div></div>`;
  }

  const messages = project.build?.messages || [];
  return `<div class="chat-layout ${app.pane.files ? '' : 'pane-closed'}">
    <section class="chat-pane">
      <div class="chat-scroll" id="chat-scroll">
        <div class="chat-thread">
          ${promptChip('执行工程师 · 需求文档已发送')}
          ${messages.length ? '' : briefCard('build')}
          ${messages.map(messageHtml).join('')}
        </div>
      </div>
      <div class="composer-wrap">${composerHtml('build')}</div>
    </section>
    ${filesPane(project)}
  </div>`;
}

function taskView() {
  const task = app.task;
  const messages = task.messages || [];
  return `<div class="chat-layout ${app.pane.files ? '' : 'pane-closed'}">
    <section class="chat-pane">
      <div class="chat-scroll" id="chat-scroll">
        <div class="chat-thread">
          ${promptChip('任务模式 · 直接执行')}
          ${messages.length ? '' : briefCard('task')}
          ${messages.map(messageHtml).join('')}
        </div>
      </div>
      <div class="composer-wrap">${composerHtml('task')}</div>
    </section>
    ${filesPane(task, true)}
  </div>`;
}

function filesPane(entity, isTask = false) {
  const files = entity.files || [];
  const fileCount = files.filter((f) => f.type === 'file').length;
  const busy = app.busy && (app.busy.kind === 'build-start' || app.busy.kind === 'build' || app.busy.kind === 'task');
  return `<aside class="context-pane" id="context-pane">
    <div class="context-head">
      <div class="context-title">${icon('folder')}${isTask ? '任务文件' : '项目文件'} <span class="count">${fileCount}</span></div>
      <div class="context-actions">
        <button class="icon-btn tiny" data-action="open-folder" title="打开文件夹">${icon('external')}</button>
        <button class="icon-btn tiny" data-action="refresh-files" title="刷新">${icon('refresh')}</button>
        <button class="icon-btn tiny" data-action="toggle-files" title="收起面板">${icon('x')}</button>
      </div>
    </div>
    <div class="context-body flush">${
      files.length
        ? `<div class="tree">${renderTree(files)}</div>`
        : `<div class="tree-empty"><div class="glyph">${icon('folder')}</div>${
            busy ? '正在生成文件，完成后会自动出现在这里。' : '还没有文件。<br>DeepSeek 产出的文件会写入这里。'
          }</div>`
    }</div>
    <div class="context-foot"><button class="context-path" data-action="copy-path" data-path="${esc(
      entity.dir
    )}" title="复制目录路径">${icon('folder')}<span>${esc(entity.dir)}</span></button></div>
  </aside>`;
}

function renderTree(files) {
  return files
    .map((entry) => {
      const depth = entry.path.split('/').length - 1;
      const indent = 6 + depth * 12;
      if (entry.type === 'dir') {
        return `<div class="tree-row folder" style="padding-left:${indent}px">${icon('folder')}<span class="tree-name">${esc(
          entry.name
        )}</span></div>`;
      }
      return `<button class="tree-row file" data-action="open-file" data-path="${esc(
        entry.path
      )}" style="padding-left:${indent}px" title="${esc(entry.path)}">${icon(
        entry.path.match(/\.(js|ts|tsx|jsx|css|html|json|py|go|rs|md)$/i) ? 'code' : 'file'
      )}<span class="tree-name">${esc(entry.name)}</span><span class="tree-size">${fmtBytes(entry.size)}</span></button>`;
    })
    .join('');
}

/* --------------------------------------------------------------------------
   panes
   -------------------------------------------------------------------------- */

function togglePane(type) {
  app.pane[type] = !app.pane[type];
  try {
    localStorage.setItem(`dsh:pane:${type}`, app.pane[type] ? '1' : '0');
  } catch {
    /* ignore */
  }
  applyPaneState();
  renderTopbar();
}

function applyPaneState() {
  const layout = $('.management-layout') || $('.chat-layout');
  if (!layout) return;
  const type = app.route.name === 'management' ? 'system' : app.route.name === 'requirements' ? 'doc' : 'files';
  layout.classList.toggle('pane-closed', !app.pane[type]);
}

/* --------------------------------------------------------------------------
   chat text
   -------------------------------------------------------------------------- */

function scrollChat(behavior = 'smooth') {
  const scroller = $('#chat-scroll');
  if (!scroller) return;
  scroller.scrollTo({ top: scroller.scrollHeight, behavior });
}

function isNearBottom() {
  const scroller = $('#chat-scroll');
  if (!scroller) return true;
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
}

function updateComposerState() {
  const input = $('#composer-input');
  const send = $('#send-btn');
  if (!input || !send) return;
  send.disabled = Boolean(app.busy) || !input.value.trim();
}

function growTextarea(element) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
}

function scheduleStreamRender(message) {
  if (app.streamTimer) return;
  const shouldStick = isNearBottom();
  app.streamTimer = setTimeout(() => {
    app.streamTimer = null;
    const node = document.querySelector(`[data-stream-id="${message.id}"]`);
    if (!node) return;
    node.innerHTML = message.content
      ? `${renderMarkdown(message.content)}<span class="caret"></span>`
      : '<span class="typing"><i></i><i></i><i></i></span>';
    if (shouldStick) scrollChat('auto');
  }, 60);
}

function scheduleDocRender() {
  if (app.docTimer) return;
  app.docTimer = setTimeout(() => {
    app.docTimer = null;
    const target = $('#doc-live-body .md');
    if (!target) return;
    target.innerHTML = app.docDraft
      ? `${renderMarkdown(app.docDraft)}<span class="caret"></span>`
      : '<span class="typing"><i></i><i></i><i></i></span>';
  }, 70);
}

/* --------------------------------------------------------------------------
   streaming actions
   -------------------------------------------------------------------------- */

async function streamInto({ url, body, kind, placeholder, endpointProject }) {
  const controller = new AbortController();
  app.busy = { kind, controller, hash: location.hash };
  renderTopbar();
  renderView();
  requestAnimationFrame(() => scrollChat('auto'));

  let completed = false;
  try {
    await postStream(
      url,
      body,
      {
        start: () => {},
        delta: ({ text }) => {
          if (!placeholder || !text) return;
          placeholder.content += text;
          scheduleStreamRender(placeholder);
        },
        files: () => {},
        error: ({ message }) => {
          throw new Error(message || '生成失败');
        },
        done: async (data) => {
          completed = true;
          if (!data || !data.message) return;
          Object.assign(placeholder, data.message, { streaming: false });
          if (data.project) updateProjectSummary(data.project);
          if (data.task) updateTaskSummary(data.task);
          try {
            if (kind === 'build' || kind === 'build-start') await refreshFiles('project');
            if (kind === 'task') await refreshFiles('task');
            if (kind === 'management') await loadManagementData();
          } catch {
            /* ignore */
          }
          if (kind === 'build' || kind === 'build-start') {
            const count = data.files?.length || 0;
            toast(count ? `制作完成，已写入 ${count} 个文件` : '本轮回复完成', 'ok');
          }
          if (kind === 'management' && data.staged?.length) {
            toast(`已暂存 ${data.staged.length} 个文件，确认后可应用`, 'ok');
          }
          if (kind === 'management' && data.stageErrors?.length) {
            toast(`有 ${data.stageErrors.length} 个文件因路径或内容问题未暂存`, 'bad');
          }
        },
      },
      controller.signal
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      placeholder.streaming = false;
      placeholder.interrupted = true;
      if (!placeholder.content) {
        removeMessage(placeholder);
      }
      toast('已停止生成');
      setTimeout(async () => {
        if (app.route.name === 'requirements' || app.route.name === 'build') {
          try {
            await loadProject(app.route.id);
          } catch {
            /* ignore */
          }
        } else if (app.route.name === 'task') {
          try {
            await loadTask(app.route.id);
          } catch {
            /* ignore */
          }
        } else if (app.route.name === 'management') {
          try {
            await loadManagementData();
          } catch {
            /* ignore */
          }
        }
        if (!app.busy) renderView();
      }, 450);
    } else {
      removeMessage(placeholder);
      if (kind === 'build-start' && app.project) {
        try {
          await loadProject(app.project.id);
        } catch {
          /* ignore */
        }
      }
      pushErrorMessage(err.message);
      toast(err.message, 'bad');
    }
  } finally {
    if (app.busy?.controller === controller) app.busy = null;
    renderTopbar();
    renderView();
    requestAnimationFrame(() => scrollChat('auto'));
    if (completed) renderSidebar();
  }
}

function removeMessage(message) {
  if (!message) return;
  const lists = [];
  if (app.project) {
    lists.push(app.project.requirements?.messages, app.project.build?.messages);
  }
  if (app.task) lists.push(app.task.messages);
  if (app.management) lists.push(app.management.management?.messages);
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const index = list.indexOf(message);
    if (index >= 0) list.splice(index, 1);
  }
}

function pushErrorMessage(message) {
  const target =
    app.route.name === 'task'
      ? app.task?.messages
      : app.route.name === 'build'
      ? app.project?.build?.messages
      : app.route.name === 'management'
      ? app.management?.management?.messages
      : app.project?.requirements?.messages;
  if (Array.isArray(target)) {
    target.push({
      id: `error-${Date.now()}`,
      role: 'error',
      content: message,
      ts: new Date().toISOString(),
    });
  }
}

async function sendCurrentMessage() {
  if (app.busy) return;
  const input = $('#composer-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const route = app.route;
  let url = '';
  let kind = '';
  let placeholder = null;
  let userMessage = null;

  if (route.name === 'requirements' && app.project) {
    kind = 'requirements';
    url = `/api/projects/${app.project.id}/requirements/chat`;
    userMessage = { id: `local-${Date.now()}`, role: 'user', content: text, ts: new Date().toISOString() };
    app.project.requirements.messages.push(userMessage);
    placeholder = { id: `stream-${Date.now()}`, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true };
    app.project.requirements.messages.push(placeholder);
  } else if (route.name === 'build' && app.project) {
    if (!app.project.build?.startedAt) {
      toast('请先开始制作');
      return;
    }
    kind = 'build';
    url = `/api/projects/${app.project.id}/build/chat`;
    userMessage = { id: `local-${Date.now()}`, role: 'user', content: text, ts: new Date().toISOString() };
    app.project.build.messages.push(userMessage);
    placeholder = { id: `stream-${Date.now()}`, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true };
    app.project.build.messages.push(placeholder);
  } else if (route.name === 'task' && app.task) {
    kind = 'task';
    url = `/api/tasks/${app.task.id}/chat`;
    userMessage = { id: `local-${Date.now()}`, role: 'user', content: text, ts: new Date().toISOString() };
    app.task.messages.push(userMessage);
    placeholder = { id: `stream-${Date.now()}`, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true };
    app.task.messages.push(placeholder);
  } else if (route.name === 'management' && app.management) {
    kind = 'management';
    url = '/api/management/chat';
    userMessage = { id: `local-${Date.now()}`, role: 'user', content: text, ts: new Date().toISOString() };
    app.management.management.messages.push(userMessage);
    placeholder = { id: `stream-${Date.now()}`, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true };
    app.management.management.messages.push(placeholder);
  } else {
    return;
  }

  input.value = '';
  await streamInto({ url, body: { text }, kind, placeholder });
}

async function startBuildFlow() {
  if (app.busy) return;
  const project = app.project;
  if (!project) return;
  if (app.shellMode) {
    openExternalDialog(`#/project/${project.id}/build`);
    return;
  }
  if (project.build?.startedAt) {
    location.hash = `#/project/${project.id}/build`;
    return;
  }
  confirmModal({
    title: '开始项目制作？',
    message: '需求文档会作为上下文发送给 DeepSeek，生成的完整文件将写入项目目录。<br><br><span style="color:#7f8aa3;font-family:var(--mono);font-size:10px">' +
      esc(project.dir) +
      '</span>',
    confirmText: '开始制作',
    onConfirm: async () => {
      closeModal();
      await beginBuild(project);
    },
  });
}

async function beginBuild(project) {
  if (!project.doc) {
    toast('请先生成需求文档', 'bad');
    return;
  }
  if (app.shellMode) {
    openExternalDialog(`#/project/${project.id}/build`);
    return;
  }
  app.route = { name: 'build', id: project.id };
  history.replaceState(null, '', `#/project/${project.id}/build`);
  renderSidebar();
  renderTopbar();

  if (!project.build) project.build = { messages: [], files: [] };
  const docMessage = {
    id: `local-doc-${Date.now()}`,
    role: 'user',
    kind: 'doc',
    docVersion: project.doc.version,
    content: project.doc.markdown,
    ts: new Date().toISOString(),
  };
  const placeholder = { id: `stream-${Date.now()}`, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true };
  project.build.messages.push(docMessage, placeholder);
  project.build.startedAt = new Date().toISOString();

  await streamInto({
    url: `/api/projects/${project.id}/build/start`,
    body: {},
    kind: 'build-start',
    placeholder,
  });
}

async function generateDoc(force = false) {
  if (app.busy) return;
  const project = app.project;
  if (!project) return;
  const userMessages = (project.requirements?.messages || []).filter((m) => m.role === 'user').length;
  if (!userMessages) {
    toast('请先完成至少一轮需求对话', 'bad');
    return;
  }
  if (project.doc && !force) {
    confirmModal({
      title: '重新生成需求文档？',
      message: `当前是 v${project.doc.version}。重新生成会基于目前全部对话产出新的版本，并覆盖项目目录中的 REQUIREMENTS.md。`,
      confirmText: '重新生成',
      onConfirm: async () => {
        closeModal();
        await runDocGeneration(project);
      },
    });
    return;
  }
  await runDocGeneration(project);
}

async function runDocGeneration(project) {
  const controller = new AbortController();
  app.docDraft = '';
  app.busy = { kind: 'doc', controller, hash: location.hash };
  renderTopbar();
  renderView();

  try {
    await postStream(
      `/api/projects/${project.id}/requirements/doc`,
      {},
      {
        delta: ({ text }) => {
          if (!text) return;
          app.docDraft += text;
          scheduleDocRender();
        },
        error: ({ message }) => {
          throw new Error(message || '生成失败');
        },
        done: async (data) => {
          if (!data || !data.doc) return;
          project.doc = data.doc;
          if (data.project) updateProjectSummary(data.project);
          toast(`需求文档 v${data.doc.version} 已生成`, 'ok');
        },
      },
      controller.signal
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      toast('已停止生成');
    } else {
      toast(err.message, 'bad');
    }
  } finally {
    if (app.busy?.controller === controller) app.busy = null;
    app.docDraft = '';
    renderTopbar();
    renderView();
    renderSidebar();
    requestAnimationFrame(() => scrollChat('auto'));
  }
}

async function refreshFiles(type) {
  try {
    if (type === 'task' && app.task) {
      const data = await apiGet(`/api/tasks/${app.task.id}/files`);
      app.task.files = data.files;
    } else if (app.project) {
      const data = await apiGet(`/api/projects/${app.project.id}/files`);
      app.project.files = data.files;
    }
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------------------
   modals
   -------------------------------------------------------------------------- */

function openModal(html, options = {}) {
  const root = $('#modal-root');
  if (!root) return;
  root.innerHTML = `<div class="modal-layer" data-action="modal-backdrop"><div class="modal ${options.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const focusTarget = root.querySelector('input, textarea, select');
    if (focusTarget) focusTarget.focus();
  }, 40);
}

function closeModal() {
  const root = $('#modal-root');
  if (root) root.innerHTML = '';
  document.body.classList.remove('modal-open');
}

function modalHead(title, subtitle) {
  return `<div class="modal-head"><div><h2>${esc(title)}</h2>${
    subtitle ? `<p class="modal-sub">${subtitle}</p>` : ''
  }</div><button class="icon-btn modal-close" data-action="close-modal" aria-label="关闭">${icon('x')}</button></div>`;
}

function openNewProjectModal(options = {}) {
  const root = app.state.root || {};
  const picked =
    options.parentId !== undefined ? options.parentId : currentFolderId();
  const pickedNode = projectById(picked);
  const currentParent = pickedNode
    ? pickedNode.kind === 'folder'
      ? pickedNode.id
      : pickedNode.folderId || ''
    : '';
  const defaultKind = options.kind === 'folder' ? 'folder' : 'project';
  const parentChoices = folderOptions()
    .map(
      (item) =>
        `<option value="${item.id}" ${item.id === currentParent ? 'selected' : ''}>${esc(item.label)}</option>`
    )
    .join('');
  openModal(`${modalHead(
    '新建项目 / 文件夹',
    '文件夹可以有上下级，项目只作为文件夹里的条目，不再有项目上下级。'
  )}
    <form id="new-project-form">
      <div class="field"><label>类型</label>
        <select id="np-kind">
          <option value="project" ${defaultKind === 'project' ? 'selected' : ''}>项目（需求文档 + 项目制作）</option>
          <option value="folder" ${defaultKind === 'folder' ? 'selected' : ''}>文件夹（可以继续嵌套）</option>
        </select>
      </div>
      <div class="field"><label id="np-parent-label">${defaultKind === 'folder' ? '上级文件夹' : '所在文件夹'} <small>可选</small></label>
        <select id="np-parent">
          <option value="">无（顶层）</option>
          ${parentChoices}
        </select>
      </div>
      <div class="field"><label>名称 <small>必填</small></label>
        <input id="np-name" name="name" maxlength="60" placeholder="例如：团队任务看板" required />
      </div>
      <div class="field"><label>一句话描述 <small>可选</small></label>
        <textarea id="np-desc" name="description" maxlength="500" placeholder="例如：给 5 人小团队用的轻量看板，打开就能用"></textarea>
      </div>
      <div class="path-preview" id="np-path-wrap">将创建于<code id="np-path">${esc(
        root.projectsDir || `${root.path || '项目根目录'}\\xaingmu`
      )}\\…</code></div>
      <div class="inline-result" id="np-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="np-submit">创建</button>
      </div>
    </form>`);

  const nameInput = $('#np-name');
  const kindInput = $('#np-kind');
  const parentLabel = $('#np-parent-label');
  const pathEl = $('#np-path');
  const pathWrap = $('#np-path-wrap');
  const rootPath = root.projectsDir || `${root.path || '项目根目录'}\\xaingmu`;
  const updatePath = () => {
    const folder = kindInput.value === 'folder';
    pathWrap.hidden = folder;
    if (parentLabel) parentLabel.innerHTML = `${folder ? '上级文件夹' : '所在文件夹'} <small>可选</small>`;
    const slug = slugPreview(nameInput.value) || '根据名称自动生成';
    pathEl.textContent = `${rootPath}\\${slug}`;
  };
  nameInput.addEventListener('input', updatePath);
  kindInput.addEventListener('change', updatePath);
  updatePath();

  if (root.writable === false && kindInput.value !== 'folder') {
    const err = $('#np-error');
    err.className = 'inline-result show bad';
    err.textContent = `项目根目录不可写：${root.error || root.path}。请先在设置中更换目录。`;
  } else if (root.fallback && kindInput.value !== 'folder') {
    const err = $('#np-error');
    err.className = 'inline-result show';
    err.textContent = `原配置目录不可写，项目将自动创建在：${root.path}`;
  }
}

function slugPreview(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
}

function openNewTaskModal() {
  const root = app.state.root || {};
  const projects = projectOptions().filter((item) => item.kind !== 'folder');
  const defaultProject =
    app.project?.kind === 'project'
      ? app.project.id
      : app.task?.projectId || '';
  openModal(`${modalHead('新建任务', '任务模式没有需求文档环节：直接描述目标，DeepSeek 执行并写入独立任务目录。')}
    <form id="new-task-form">
      <div class="field"><label>任务名称 <small>必填</small></label>
        <input id="nt-title" name="title" maxlength="80" placeholder="例如：整理一份产品竞品分析" required />
      </div>
      ${
        projects.length
          ? `<div class="field"><label>归属项目 <small>便于工作区按项目范围显示</small></label>
              <select id="nt-project">
                <option value="">不归属项目</option>
                ${projects
                  .map(
                    (project) =>
                      `<option value="${project.id}" ${project.id === defaultProject ? 'selected' : ''}>${esc(project.label)}</option>`
                  )
                  .join('')}
              </select>
            </div>`
          : ''
      }
      <div class="path-preview">将创建于<code id="nt-path">${esc(
        root.tasksDir || `${root.path || '项目根目录'}\\renwu`
      )}\\…</code></div>
      <div class="inline-result" id="nt-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="nt-submit">创建任务</button>
      </div>
    </form>`);

  const titleInput = $('#nt-title');
  const pathEl = $('#nt-path');
  titleInput.addEventListener('input', () => {
    const slug = slugPreview(titleInput.value) || '根据名称自动生成';
    const taskRoot = root.tasksDir || `${root.path || '项目根目录'}\\renwu`;
    pathEl.textContent = `${taskRoot}\\${slug}`;
  });

  if (root.writable === false) {
    const err = $('#nt-error');
    err.className = 'inline-result show bad';
    err.textContent = `项目根目录不可写：${root.error || root.path}。请先在设置中更换目录。`;
  } else if (root.fallback) {
    const err = $('#nt-error');
    err.className = 'inline-result show';
    err.textContent = `原配置目录不可写，任务将自动创建在：${root.path}`;
  }
}

async function submitNewProject(form) {
  const name = $('#np-name').value.trim();
  const description = $('#np-desc').value.trim();
  const error = $('#np-error');
  const button = $('#np-submit');
  if (!name) {
    error.className = 'inline-result show bad';
    error.textContent = '请填写项目名称';
    return;
  }
  button.disabled = true;
  button.textContent = '创建中…';
  try {
    const kind = $('#np-kind')?.value === 'folder' ? 'folder' : 'project';
    const parentId = $('#np-parent')?.value || null;
    const data = await apiPost(
      '/api/projects',
      kind === 'folder'
        ? { name, description, kind, parentId }
        : { name, description, kind, folderId: parentId }
    );
    updateProjectSummary(data.project);
    if (data.root) app.state.root = data.root;
    closeModal();
    toast(
      data.root?.fallback
        ? `${kind === 'folder' ? '文件夹' : '项目'}已创建，保存在自动回退目录：${data.root.path}`
        : kind === 'folder'
        ? '文件夹已创建'
        : '项目已创建',
      'ok'
    );
    location.hash = `#/project/${data.project.id}`;
    renderSidebar();
  } catch (err) {
    error.className = 'inline-result show bad';
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = '创建项目';
  }
}

async function submitNewTask(form) {
  const title = $('#nt-title').value.trim();
  const error = $('#nt-error');
  const button = $('#nt-submit');
  if (!title) {
    error.className = 'inline-result show bad';
    error.textContent = '请填写任务名称';
    return;
  }
  button.disabled = true;
  button.textContent = '创建中…';
  try {
    const projectId = $('#nt-project')?.value || null;
    const data = await apiPost('/api/tasks', { title, projectId });
    updateTaskSummary(data.task);
    if (data.root) app.state.root = data.root;
    closeModal();
    toast(
      data.root?.fallback
        ? `任务已创建，保存在自动回退目录：${data.root.path}`
        : '任务已创建',
      'ok'
    );
    location.hash = `#/task/${data.task.id}`;
    renderSidebar();
  } catch (err) {
    error.className = 'inline-result show bad';
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = '创建任务';
  }
}

function openSettingsModal() {
  const settings = app.state.settings || {};
  const root = app.state.root || {};
  const models = ['deepseek-chat', 'deepseek-reasoner'];
  if (settings.model && !models.includes(settings.model)) models.push(settings.model);
  openModal(
    `${modalHead('设置', '配置对话后端、DeepSeek 连接与本地文件目录。所有配置只保存在这台电脑。')}
    <form id="settings-form">
      <div class="field"><label>对话后端</label>
        <select id="set-provider">
          <option value="auto" ${settings.chatProvider === 'auto' ? 'selected' : ''}>自动（优先本机 DeepSeek Harness）</option>
          <option value="dsh" ${settings.chatProvider === 'dsh' ? 'selected' : ''}>本机 DeepSeek Harness（dsh headless）</option>
          <option value="api" ${settings.chatProvider === 'api' ? 'selected' : ''}>DeepSeek API</option>
        </select>
        <div class="hint">${
          settings.dshAvailable
            ? `已检测到 dsh：${esc(settings.dshPath || '')}${
                settings.dshAuthenticated ? '，将复用本机登录与模型配置。' : '，但尚未检测到登录凭据，请先在 DeepSeek Harness 中配置模型。'
              } 使用本机 DSH 时，每轮对话会作为一次 headless 任务执行，回复完成后返回，通常需要几十秒。`
            : '未检测到已安装的 dsh；可以继续使用 DeepSeek API。'
        }</div>
      </div>
      ${
        settings.demo
          ? `<div class="inline-result show bad" style="margin-top:16px">当前没有可用对话后端，控制台运行在演示模式。配置本机 DSH 或填入 API Key 后即接入真实模型。</div>`
          : ''
      }
      <div class="field"><label>对话框窗口</label>
        <select id="set-window">
          <option value="browser" ${settings.dialogWindow !== 'app' ? 'selected' : ''}>控制台对话页（本地浏览器标签，默认）</option>
          <option value="app" ${settings.dialogWindow === 'app' ? 'selected' : ''}>控制台对话页（独立应用窗口）</option>
        </select>
        <div class="hint">对话使用控制台自己的页面，按项目范围显示；不再打开 DSH Web。</div>
      </div>
      <div class="field"><label>DeepSeek API Key <small>${
        settings.hasKey ? `已保存 ${settings.apiKeyMasked}，留空保持不变` : '可选，仅 API 后端需要'
      }</small></label>
        <div class="key-row">
          <input id="set-key" type="password" autocomplete="off" placeholder="${
            settings.hasKey ? '••••••••••••••••' : 'sk-…'
          }" />
          ${settings.hasKey ? '<button type="button" class="btn sm danger" id="clear-key">清除</button>' : ''}
        </div>
        <div class="hint">Key 只会发送给 DeepSeek API，不会上传到其他服务。使用本机 DSH 后端时不需要填写。</div>
      </div>
      <div class="field"><label>模型</label>
        <select id="set-model">${models
          .map(
            (model) =>
              `<option value="${esc(model)}" ${model === settings.model ? 'selected' : ''}>${esc(
                model === 'deepseek-reasoner' ? 'deepseek-reasoner · 推理模型' : model === 'deepseek-chat' ? 'deepseek-chat · 通用模型' : model
              )}</option>`
          )
          .join('')}</select>
      </div>
      <div class="field"><label>API Base</label>
        <input id="set-base" value="${esc(settings.baseUrl || 'https://api.deepseek.com')}" spellcheck="false" />
      </div>
      <div class="field"><label>工作区根目录 <small>项目与任务会分别放进 xaingmu / renwu</small></label>
        <input id="set-root" value="${esc(settings.projectRoot || 'D:\\dscontrol')}" spellcheck="false" />
        <div class="hint">${
          root.fallback
            ? `配置目录不可写，已自动回退到：${esc(root.path)}。可以继续使用，或填写一个有权限的目录。`
            : root.writable
            ? '目录可写。修改后只影响新建项目，已有项目保留原路径。'
            : `当前目录不可写：${esc(root.error || '未知错误')}。请更换为有权限的目录。`
        }</div>
        <div class="hint">项目：${esc(root.projectsDir || `${root.path || ''}\\xaingmu`)}<br>任务：${esc(
          root.tasksDir || `${root.path || ''}\\renwu`
        )}<br>保存后会自动创建这两个子目录。</div>
      </div>
      <div class="field"><label>长期记忆</label>
        <label class="pin-filter"><input type="checkbox" id="set-auto-memory" ${
          settings.autoMemory !== false ? 'checked' : ''
        } />对话结束后自动提取值得记住的偏好、决定与项目事实</label>
        <div class="hint">关闭后仍可手动新增记忆，或在记忆库中从对话提取。</div>
      </div>
      <div class="inline-result" id="settings-result"></div>
      <div class="modal-actions">
        <button type="button" class="btn ghost left" data-action="test-connection">测试连接</button>
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="settings-submit">保存设置</button>
      </div>
    </form>`
  );

  const clear = $('#clear-key');
  if (clear) {
    clear.addEventListener('click', async () => {
      if (!window.confirm('清除已保存的 API Key？清除后如果本机 DSH 不可用，将回到演示模式。')) return;
      try {
        const data = await apiPost('/api/settings', { clearKey: true });
        app.state.settings = data.settings;
        app.state.root = data.root;
        closeModal();
        toast('API Key 已清除', 'ok');
        renderSidebar();
        renderTopbar();
        renderView();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  }
}

async function saveSettings(form) {
  const key = $('#set-key')?.value.trim() || '';
  const model = $('#set-model')?.value;
  const baseUrl = $('#set-base')?.value.trim();
  const projectRoot = $('#set-root')?.value.trim();
  const result = $('#settings-result');
  const button = $('#settings-submit');
  if (button) {
    button.disabled = true;
    button.textContent = '保存中…';
  }
  try {
    const payload = {
      model,
      baseUrl,
      projectRoot,
      chatProvider: $('#set-provider')?.value || 'auto',
      dialogWindow: $('#set-window')?.value || 'browser',
      autoMemory: $('#set-auto-memory')?.checked !== false,
    };
    if (key) payload.apiKey = key;
    const data = await apiPost('/api/settings', payload);
    app.state.settings = data.settings;
    app.state.root = data.root;
    closeModal();
    toast('设置已保存', 'ok');
    renderSidebar();
    renderTopbar();
    renderView();
    if (data.root && data.root.writable === false) {
      toast(`项目根目录不可写：${data.root.error || data.root.path}`, 'bad');
    } else if (data.root && data.root.fallback) {
      toast(`配置目录不可写，项目将自动保存到：${data.root.path}`, '');
    }
  } catch (err) {
    if (result) {
      result.className = 'inline-result show bad';
      result.textContent = err.message;
    }
    if (button) {
      button.disabled = false;
      button.textContent = '保存设置';
    }
  }
}

async function testConnection() {
  const result = $('#settings-result');
  const key = $('#set-key')?.value.trim() || '';
  const baseUrl = $('#set-base')?.value.trim();
  const model = $('#set-model')?.value;
  const chatProvider = $('#set-provider')?.value || 'auto';
  if (result) {
    result.className = 'inline-result show';
    result.textContent = '正在测试连接…';
  }
  try {
    const data = await apiPost('/api/settings/test', { apiKey: key, baseUrl, model, chatProvider });
    if (result) {
      result.className = `inline-result show ${data.ok ? 'ok' : 'bad'}`;
      result.textContent = data.message || (data.ok ? '连接成功' : '连接失败');
    }
  } catch (err) {
    if (result) {
      result.className = 'inline-result show bad';
      result.textContent = err.message;
    }
  }
}

function confirmModal({ title, message, confirmText = '确认', danger = false, onConfirm }) {
  openModal(`<div class="modal-head"><div><h2>${esc(title)}</h2>
      <p class="modal-sub">${message}</p></div>
      <button class="icon-btn modal-close" data-action="close-modal" aria-label="关闭">${icon('x')}</button></div>
    <div class="modal-actions">
      <button class="btn" data-action="close-modal">取消</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" id="confirm-action">${esc(confirmText)}</button>
    </div>`);
  const button = $('#confirm-action');
  button?.addEventListener('click', async () => {
    if (button) {
      button.disabled = true;
      button.textContent = '处理中…';
    }
    try {
      await onConfirm();
    } catch (err) {
      toast(err.message, 'bad');
      if (button) {
        button.disabled = false;
        button.textContent = confirmText;
      }
    }
  });
}

function openDocModal() {
  const project = app.project;
  if (!project?.doc) {
    toast('还没有需求文档');
    return;
  }
  const doc = project.doc;
  openModal(
    `<div class="preview-head">
      <span class="doc-glyph" style="display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:rgba(109,139,255,.1);color:#aebdff">${icon(
      'doc'
    )}</span>
      <div class="file-meta"><strong>${esc(project.name)} · 需求文档 v${doc.version}</strong><small>${fmtDate(
      doc.createdAt
    )} · 已保存为 REQUIREMENTS.md</small></div>
      <button class="btn sm" data-action="copy-doc">${icon('copy')}复制</button>
      <button class="btn sm ghost" data-action="download-doc">${icon('download')}下载</button>
      <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x')}</button>
    </div>
    <div class="doc-body" style="padding:0 2px"><div class="md">${renderMarkdown(doc.markdown)}</div></div>`,
    { wide: true }
  );
}

async function openFilePreview(path) {
  if (!path) return;
  const isTask = app.route.name === 'task';
  const id = isTask ? app.task?.id : app.project?.id;
  if (!id) return;
  const base = isTask ? `/api/tasks/${id}` : `/api/projects/${id}`;
  openModal(
    `<div class="preview-head"><span class="doc-glyph" style="display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:rgba(109,139,255,.1);color:#aebdff">${icon(
      'file'
    )}</span><div class="file-meta"><strong>${esc(path)}</strong><small>正在读取…</small></div><button class="icon-btn" data-action="close-modal">${icon(
      'x'
    )}</button></div><div class="boot" style="min-height:200px"><div class="boot-orbit"><span></span></div></div>`,
    { wide: true }
  );
  try {
    const data = await apiGet(`${base}/file?path=${encodeURIComponent(path)}`);
    app.lastPreview = data.content;
    const lines = data.content.split('\n');
    const limited = lines.slice(0, 5000);
    const gutter = limited.map((_, index) => index + 1).join('\n');
    const content = data.binary
      ? `<div class="binary-note">这是二进制文件，无法以文本方式预览。大小：${fmtBytes(data.size)}</div>`
      : `<div class="code-view"><div class="code-gutter">${gutter}</div><pre>${escapeHtml(
          limited.join('\n')
        )}</pre></div>`;
    openModal(
      `<div class="preview-head">
        <span class="doc-glyph" style="display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:rgba(109,139,255,.1);color:#aebdff">${icon(
        'file'
      )}</span>
        <div class="file-meta"><strong>${esc(data.path)}</strong><small>${fmtBytes(data.size)}${
        data.truncated ? ' · 已截断显示' : ''
      }${lines.length > 5000 ? ` · 仅显示前 5000 行（共 ${lines.length} 行）` : ''}</small></div>
        <button class="btn sm" data-action="copy-preview">${icon('copy')}复制</button>
        <button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x')}</button>
      </div>${content}`,
      { wide: true }
    );
  } catch (err) {
    openModal(
      `<div class="preview-head"><div class="file-meta"><strong>${esc(path)}</strong><small>读取失败</small></div><button class="icon-btn" data-action="close-modal">${icon(
        'x'
      )}</button></div><div class="inline-result show bad">${esc(err.message)}</div>`,
      { wide: true }
    );
  }
}

/* --------------------------------------------------------------------------
   memory / skills / tools / management actions
   -------------------------------------------------------------------------- */

function memoryById(id) {
  return (app.memory?.memories || []).find((memory) => memory.id === id) || null;
}

function openMemoryModal(id) {
  const memory = id ? memoryById(id) : null;
  const types = app.memory?.types || {};
  const options = Object.entries(types)
    .map(
      ([key, label]) =>
        `<option value="${esc(key)}" ${memory?.type === key ? 'selected' : ''}>${esc(label)}</option>`
    )
    .join('');
  openModal(`${modalHead(memory ? '编辑记忆' : '新增记忆', '记忆会进入之后的对话上下文；越具体、越稳定，越有用。')}
    <form id="memory-form">
      <input type="hidden" id="mf-id" value="${memory?.id || ''}" />
      <div class="field"><label>类型</label><select id="mf-type">${options}</select></div>
      <div class="field"><label>标题 <small>不超过 80 字</small></label><input id="mf-title" maxlength="80" value="${esc(
        memory?.title || ''
      )}" placeholder="例如：偏好深色低干扰界面" /></div>
      <div class="field"><label>内容</label><textarea id="mf-content" rows="5" placeholder="写下需要长期保留的事实、偏好或决定…">${esc(
        memory?.content || ''
      )}</textarea></div>
      <div class="field"><label>标签 <small>用逗号分隔</small></label><input id="mf-tags" value="${esc(
        (memory?.tags || []).join(', ')
      )}" placeholder="UI, 偏好" /></div>
      <label class="pin-filter" style="margin-top:14px"><input type="checkbox" id="mf-pinned" ${
        memory?.pinned ? 'checked' : ''
      } />置顶这条记忆</label>
      <div class="inline-result" id="mf-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="mf-submit">${memory ? '保存记忆' : '添加记忆'}</button>
      </div>
    </form>`);
}

async function submitMemoryForm(form) {
  const id = $('#mf-id')?.value;
  const payload = {
    type: $('#mf-type').value,
    title: $('#mf-title').value.trim(),
    content: $('#mf-content').value.trim(),
    tags: $('#mf-tags').value,
    pinned: $('#mf-pinned').checked,
  };
  const error = $('#mf-error');
  const button = $('#mf-submit');
  if (!payload.content) {
    error.className = 'inline-result show bad';
    error.textContent = '请填写记忆内容';
    return;
  }
  button.disabled = true;
  button.textContent = '保存中…';
  try {
    if (id) await apiPatch(`/api/memory/${id}`, payload);
    else await apiPost('/api/memory', payload);
    closeModal();
    await loadMemory();
    renderSidebar();
    renderView();
    toast(id ? '记忆已更新' : '记忆已添加', 'ok');
  } catch (err) {
    error.className = 'inline-result show bad';
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = id ? '保存记忆' : '添加记忆';
  }
}

async function toggleMemoryPin(id) {
  const memory = memoryById(id);
  if (!memory) return;
  try {
    await apiPatch(`/api/memory/${id}`, { pinned: !memory.pinned });
    await loadMemory();
    renderSidebar();
    renderView();
  } catch (err) {
    toast(err.message, 'bad');
  }
}

function deleteMemoryFlow(id) {
  const memory = memoryById(id);
  if (!memory) return;
  confirmModal({
    title: '删除这条记忆？',
    message: `「${esc(memory.title)}」将从长期记忆和之后的对话上下文中移除。`,
    confirmText: '删除',
    danger: true,
    onConfirm: async () => {
      await apiDelete(`/api/memory/${id}`);
      closeModal();
      await loadMemory();
      renderSidebar();
      renderView();
      toast('记忆已删除', 'ok');
    },
  });
}

function openAgentModal() {
  const agent = app.memory?.agent || {};
  openModal(`${modalHead('编辑我的智能体', '这些内容会作为身份设定，注入之后的所有对话。')}
    <form id="agent-form">
      <div class="field"><label>名称</label><input id="ag-name" maxlength="60" value="${esc(
        agent.name || ''
      )}" placeholder="我的智能体" /></div>
      <div class="field"><label>角色</label><textarea id="ag-role" rows="2" placeholder="你是一个务实的软件搭档…">${esc(
        agent.role || ''
      )}</textarea></div>
      <div class="field"><label>语气</label><textarea id="ag-tone" rows="2" placeholder="简洁、直接，先结论后细节">${esc(
        agent.tone || ''
      )}</textarea></div>
      <div class="field"><label>原则</label><textarea id="ag-principles" rows="3" placeholder="先澄清再动手；不编造…">${esc(
        agent.principles || ''
      )}</textarea></div>
      <div class="field"><label>偏好</label><textarea id="ag-preferences" rows="3" placeholder="默认中文；零依赖…">${esc(
        agent.preferences || ''
      )}</textarea></div>
      <div class="inline-result" id="ag-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="ag-submit">保存画像</button>
      </div>
    </form>`);
}

async function submitAgentForm(form) {
  const button = $('#ag-submit');
  const error = $('#ag-error');
  button.disabled = true;
  button.textContent = '保存中…';
  try {
    await apiPost('/api/agent', {
      name: $('#ag-name').value,
      role: $('#ag-role').value,
      tone: $('#ag-tone').value,
      principles: $('#ag-principles').value,
      preferences: $('#ag-preferences').value,
    });
    closeModal();
    await loadMemory();
    renderView();
    toast('智能体画像已更新', 'ok');
  } catch (err) {
    error.className = 'inline-result show bad';
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = '保存画像';
  }
}

function openExtractModal() {
  const conversations = app.memory?.conversations || [];
  if (!conversations.length) {
    toast('还没有可提取的项目或任务对话', 'bad');
    return;
  }
  const options = conversations
    .map(
      (conversation) =>
        `<option value="${conversation.kind}:${conversation.id}">${
          conversation.kind === 'task' ? '任务' : '项目'
        } · ${esc(conversation.name)}（${conversation.messageCount} 条）</option>`
    )
    .join('');
  openModal(`${modalHead('从对话提取记忆', '会读取最近的对话，提取偏好、决定和项目事实。未配置 API Key 时，演示模式只提取最后一条用户消息。')}
    <form id="extract-form">
      <div class="field"><label>选择对话</label><select id="ex-conversation">${options}</select></div>
      <div class="inline-result" id="ex-result"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="ex-submit">${icon('sparkles')}开始提取</button>
      </div>
    </form>`);
}

async function submitExtractForm(form) {
  const [kind, id] = $('#ex-conversation').value.split(':');
  const result = $('#ex-result');
  const button = $('#ex-submit');
  button.disabled = true;
  button.textContent = '提取中…';
  try {
    const data = await apiPost('/api/memory/extract', kind === 'task' ? { taskId: id } : { projectId: id });
    await loadMemory();
    renderSidebar();
    renderView();
    closeModal();
    toast(data.added?.length ? `提取了 ${data.added.length} 条记忆` : '没有发现新的长期记忆', data.added?.length ? 'ok' : '');
  } catch (err) {
    result.className = 'inline-result show bad';
    result.textContent = err.message;
    button.disabled = false;
    button.textContent = '开始提取';
  }
}

function openSkillModal(id) {
  const skill = (app.skillsData?.skills || []).find((item) => item.id === id);
  const isExtension = Boolean(skill?.extension);
  if (isExtension) {
    toast('扩展技能请在扩展文件中修改', 'bad');
    return;
  }
  openModal(`${modalHead(skill ? '编辑技能' : '新增技能', '技能会作为方法说明注入所有对话。写得越具体，越容易被稳定执行。')}
    <form id="skill-form">
      <input type="hidden" id="sf-id" value="${skill?.id || ''}" />
      <div class="field"><label>名称 <small>不超过 60 字</small></label><input id="sf-name" maxlength="60" value="${esc(
        skill?.name || ''
      )}" placeholder="例如：可运行原型" /></div>
      <div class="field"><label>一句话描述</label><input id="sf-desc" maxlength="400" value="${esc(
        skill?.description || ''
      )}" placeholder="什么时候应该使用这个技能？" /></div>
      <div class="field"><label>具体指令</label><textarea id="sf-instructions" rows="7" placeholder="写清楚步骤、约束和输出要求…">${esc(
        skill?.instructions || ''
      )}</textarea></div>
      <div class="field"><label>标签 <small>用逗号分隔</small></label><input id="sf-tags" value="${esc(
        (skill?.tags || []).join(', ')
      )}" placeholder="前端, 原型" /></div>
      <label class="pin-filter" style="margin-top:14px"><input type="checkbox" id="sf-enabled" ${
        skill?.enabled !== false ? 'checked' : ''
      } />启用这个技能</label>
      <div class="inline-result" id="sf-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="sf-submit">保存技能</button>
      </div>
    </form>`);
}

async function submitSkillForm(form) {
  const id = $('#sf-id')?.value;
  const error = $('#sf-error');
  const button = $('#sf-submit');
  const payload = {
    id: id || undefined,
    name: $('#sf-name').value.trim(),
    description: $('#sf-desc').value.trim(),
    instructions: $('#sf-instructions').value.trim(),
    tags: $('#sf-tags').value,
    enabled: $('#sf-enabled').checked,
  };
  if (!payload.name) {
    error.className = 'inline-result show bad';
    error.textContent = '请填写技能名称';
    return;
  }
  button.disabled = true;
  button.textContent = '保存中…';
  try {
    await apiPost('/api/skills', payload);
    closeModal();
    await loadSkillsData();
    renderSidebar();
    renderView();
    toast(id ? '技能已更新' : '技能已添加', 'ok');
  } catch (err) {
    error.className = 'inline-result show bad';
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = '保存技能';
  }
}

async function toggleSkill(id, enabled) {
  try {
    await apiPost('/api/skills', { id, enabled });
    await loadSkillsData();
    renderSidebar();
    renderView();
  } catch (err) {
    toast(err.message, 'bad');
    await loadSkillsData();
    renderView();
  }
}

function deleteSkillFlow(id) {
  const skill = (app.skillsData?.skills || []).find((item) => item.id === id);
  if (!skill) return;
  confirmModal({
    title: '删除这个技能？',
    message: `「${esc(skill.name)}」将从技能库移除，之后不再注入对话。`,
    confirmText: '删除',
    danger: true,
    onConfirm: async () => {
      await apiDelete(`/api/skills/${id}`);
      closeModal();
      await loadSkillsData();
      renderSidebar();
      renderView();
      toast('技能已删除', 'ok');
    },
  });
}

function openToolModal(id) {
  const tool = (app.toolsData?.tools || []).find((item) => item.id === id);
  if (tool?.extension) {
    toast('扩展工具请在扩展文件中修改', 'bad');
    return;
  }
  const isBuiltin = Boolean(tool?.builtin);
  const type = tool?.type || 'http';
  const config = tool?.config || {};
  const headers =
    typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers || {}, null, 2);
  openModal(`${modalHead(tool ? '编辑工具' : '新增工具', isBuiltin ? '内置工具只允许调整名称、描述和启用状态。' : 'HTTP 工具支持 {{参数}} 占位符；命令工具在本机执行，请只添加可信内容。')}
    <form id="tool-form">
      <input type="hidden" id="tf-id" value="${tool?.id || ''}" />
      <div class="field"><label>工具名 <small>英文、数字、下划线</small></label><input id="tf-name" maxlength="41" value="${esc(
        tool?.name || ''
      )}" ${isBuiltin ? 'disabled' : ''} placeholder="fetch_weather" /></div>
      <div class="field"><label>显示名称</label><input id="tf-label" maxlength="60" value="${esc(
        tool?.label || ''
      )}" placeholder="抓取天气" /></div>
      <div class="field"><label>描述 <small>模型据此决定何时调用</small></label><textarea id="tf-desc" rows="2" placeholder="返回指定城市的天气…">${esc(
        tool?.description || ''
      )}</textarea></div>
      ${
        isBuiltin
          ? ''
          : `<div class="field"><label>类型</label><select id="tf-type">
              <option value="http" ${type === 'http' ? 'selected' : ''}>HTTP 请求</option>
              <option value="command" ${type === 'command' ? 'selected' : ''}>本机命令</option>
            </select></div>
          <div id="tf-http-fields" style="display:${type === 'http' ? 'block' : 'none'}">
            <div class="field"><label>URL</label><input id="tf-url" value="${esc(
              config.url || ''
            )}" placeholder="https://api.example.com/weather?city={{city}}" /></div>
            <div class="field"><label>Method</label><select id="tf-method">${['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
              .map((method) => `<option ${String(config.method || 'GET').toUpperCase() === method ? 'selected' : ''}>${method}</option>`)
              .join('')}</select></div>
            <div class="field"><label>Headers <small>JSON</small></label><textarea id="tf-headers" rows="3">${esc(
              headers
            )}</textarea></div>
            <div class="field"><label>Body <small>支持 {{参数}}，留空则发送参数 JSON</small></label><textarea id="tf-body" rows="3">${esc(
              config.body || ''
            )}</textarea></div>
          </div>
          <div id="tf-command-fields" style="display:${type === 'command' ? 'block' : 'none'}">
            <div class="field"><label>命令 <small>在项目目录执行，支持 {{参数}}</small></label><textarea id="tf-command" rows="3" placeholder="node --version">${esc(
              config.command || ''
            )}</textarea></div>
            <div class="inline-result show bad">命令工具会在本机真实执行，请只添加你信任的命令。</div>
          </div>`
      }
      <div class="field"><label>参数 Schema <small>JSON</small></label><textarea id="tf-schema" rows="3" ${
        isBuiltin ? 'disabled' : ''
      }>${esc(tool?.schema || '{"type":"object","properties":{}}')}</textarea></div>
      <div class="field"><label>超时（毫秒）</label><input id="tf-timeout" type="number" value="${
        config.timeout || 20000
      }" /></div>
      <label class="pin-filter" style="margin-top:14px"><input type="checkbox" id="tf-enabled" ${
        tool?.enabled !== false ? 'checked' : ''
      } />启用这个工具</label>
      <div class="inline-result" id="tf-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">取消</button>
        <button type="submit" class="btn primary" id="tf-submit">保存工具</button>
      </div>
    </form>`);

  const typeSelect = $('#tf-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const isHttp = typeSelect.value === 'http';
      if ($('#tf-http-fields')) $('#tf-http-fields').style.display = isHttp ? 'block' : 'none';
      if ($('#tf-command-fields')) $('#tf-command-fields').style.display = isHttp ? 'none' : 'block';
    });
  }
}

async function submitToolForm(form) {
  const id = $('#tf-id')?.value;
  const isBuiltin = Boolean((app.toolsData?.tools || []).find((tool) => tool.id === id)?.builtin);
  const payload = {
    id: id || undefined,
    label: $('#tf-label').value.trim(),
    description: $('#tf-desc').value.trim(),
    enabled: $('#tf-enabled').checked,
  };
  if (!isBuiltin) {
    payload.name = $('#tf-name').value.trim();
    payload.type = $('#tf-type').value;
    payload.schema = $('#tf-schema').value.trim();
    let headers = {};
    try {
      headers = JSON.parse($('#tf-headers')?.value || '{}');
    } catch {
      headers = {};
    }
    payload.config = {
      url: $('#tf-url')?.value.trim() || '',
      method: $('#tf-method')?.value || 'GET',
      headers,
      body: $('#tf-body')?.value || '',
      command: $('#tf-command')?.value || '',
      timeout: Number($('#tf-timeout')?.value) || 20000,
    };
  }
  const error = $('#tf-error');
  const button = $('#tf-submit');
  button.disabled = true;
  button.textContent = '保存中…';
  try {
    await apiPost('/api/tools', payload);
    closeModal();
    await loadSkillsData();
    renderSidebar();
    renderView();
    toast(id ? '工具已更新' : '工具已添加', 'ok');
  } catch (err) {
    error.className = 'inline-result show bad';
    error.textContent = err.message;
    button.disabled = false;
    button.textContent = '保存工具';
  }
}

async function toggleTool(id, enabled) {
  try {
    await apiPost('/api/tools', { id, enabled });
    await loadSkillsData();
    renderSidebar();
    renderView();
  } catch (err) {
    toast(err.message, 'bad');
    await loadSkillsData();
    renderView();
  }
}

function deleteToolFlow(id) {
  const tool = (app.toolsData?.tools || []).find((item) => item.id === id);
  if (!tool) return;
  confirmModal({
    title: '删除这个工具？',
    message: `「${esc(tool.label || tool.name)}」将被移除，模型之后无法再请求它。`,
    confirmText: '删除',
    danger: true,
    onConfirm: async () => {
      await apiDelete(`/api/tools/${id}`);
      closeModal();
      await loadSkillsData();
      renderSidebar();
      renderView();
      toast('工具已删除', 'ok');
    },
  });
}

function toolContextOptions(selected) {
  const projects = app.state.projects || [];
  const tasks = app.state.tasks || [];
  const options = [];
  for (const project of projects) {
    options.push({
      value: `project:${project.id}`,
      label: `项目 · ${project.name}`,
    });
  }
  for (const task of tasks) {
    options.push({ value: `task:${task.id}`, label: `任务 · ${task.title}` });
  }
  options.push({ value: 'self', label: '控制台源码目录（只读工具）' });
  return options
    .map(
      (option) =>
        `<option value="${esc(option.value)}" ${option.value === selected ? 'selected' : ''}>${esc(option.label)}</option>`
    )
    .join('');
}

function defaultToolContext(scope) {
  if (scope === 'self') return 'self';
  if (app.route.name === 'task' && app.task) return `task:${app.task.id}`;
  if (app.project) return `project:${app.project.id}`;
  if ((app.state.projects || []).length) return `project:${app.state.projects[0].id}`;
  return 'self';
}

function openToolRunModal(name, presetArgs, presetScope) {
  const tool = (app.toolsData?.tools || []).find((item) => item.name === name);
  const args = presetArgs ? JSON.stringify(presetArgs, null, 2) : '{}';
  openModal(`${modalHead(`运行工具 · ${tool?.label || name}`, tool?.description || '工具会在本机执行，请确认参数后运行。')}
    <form id="tool-run-form" data-name="${esc(name)}">
      <div class="field"><label>参数 JSON</label><textarea id="tr-args" rows="7">${esc(args)}</textarea></div>
      <div class="field"><label>工作目录</label><select id="tr-context">${toolContextOptions(
        defaultToolContext(presetScope)
      )}</select></div>
      <div class="inline-result" id="tr-status"></div>
      <pre class="tool-result" id="tr-result" hidden></pre>
      <div class="modal-actions">
        <button type="button" class="btn" data-action="close-modal">关闭</button>
        <button type="submit" class="btn primary" id="tr-submit">${icon('play')}运行</button>
      </div>
    </form>`);
}

async function submitToolRun(form) {
  const name = form.dataset.name;
  const argsText = $('#tr-args').value.trim() || '{}';
  let args;
  try {
    args = JSON.parse(argsText);
  } catch {
    const status = $('#tr-status');
    status.className = 'inline-result show bad';
    status.textContent = '参数必须是合法 JSON';
    return;
  }
  const [kind, id] = $('#tr-context').value.split(':');
  const button = $('#tr-submit');
  const status = $('#tr-status');
  button.disabled = true;
  button.textContent = '运行中…';
  try {
    const data = await apiPost('/api/tools/run', {
      name,
      args,
      projectId: kind === 'project' ? id : null,
      taskId: kind === 'task' ? id : null,
      scope: kind === 'self' ? 'self' : null,
    });
    app.lastToolOutput = data.run.output;
    const result = $('#tr-result');
    result.hidden = false;
    result.textContent = data.run.output;
    result.style.borderColor = data.run.ok ? 'rgba(61,220,151,.22)' : 'rgba(255,107,129,.24)';
    status.className = `inline-result show ${data.run.ok ? 'ok' : 'bad'}`;
    status.textContent = `${data.run.ok ? '执行成功' : '执行失败'} · ${data.run.durationMs} ms · 输出 ${data.run.output.length} 字符`;
    await loadSkillsData();
    renderView();
  } catch (err) {
    status.className = 'inline-result show bad';
    status.textContent = err.message;
  } finally {
    button.disabled = false;
    button.innerHTML = `${icon('play')}运行`;
  }
}

function runToolFromCard(name, argsJson, scope) {
  let args = {};
  try {
    args = JSON.parse(argsJson || '{}');
  } catch {
    args = {};
  }
  openToolRunModal(name, args, scope);
}

function openStagedPreview(path) {
  openModal(
    `<div class="preview-head"><span class="doc-glyph" style="display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:rgba(109,139,255,.1);color:#aebdff">${icon(
      'file'
    )}</span><div class="file-meta"><strong>${esc(path)}</strong><small>暂存在 data/self-updates/current</small></div><button class="icon-btn" data-action="close-modal">${icon(
      'x'
    )}</button></div><div class="boot" style="min-height:200px"><div class="boot-orbit"><span></span></div></div>`,
    { wide: true }
  );
  apiGet(`/api/management/file?path=${encodeURIComponent(path)}`)
    .then((data) => {
      const lines = data.content.split('\n');
      const limited = lines.slice(0, 5000);
      app.lastPreview = data.content;
      openModal(
        `<div class="preview-head"><span class="doc-glyph" style="display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:rgba(109,139,255,.1);color:#aebdff">${icon(
          'file'
        )}</span><div class="file-meta"><strong>${esc(data.path)}</strong><small>${fmtBytes(
          data.size
        )} · 暂存改动，应用后生效</small></div><button class="btn sm" data-action="copy-preview">${icon(
          'copy'
        )}复制</button><button class="icon-btn" data-action="close-modal">${icon('x')}</button></div>
        <div class="code-view"><div class="code-gutter">${limited
          .map((_, index) => index + 1)
          .join('\n')}</div><pre>${escapeHtml(limited.join('\n'))}</pre></div>`,
        { wide: true }
      );
    })
    .catch((err) => toast(err.message, 'bad'));
}

function applyUpdateFlow() {
  const staged = app.management?.management?.staged || [];
  if (!staged.length) {
    toast('暂存区为空');
    return;
  }
  confirmModal({
    title: '应用这些改动？',
    message: `将把暂存的 ${staged.length} 个文件写入控制台源码，原文件会备份到数据目录。应用后需要重启应用才能生效。<br><br><span style="color:#7f8aa3;font-family:var(--mono);font-size:10px">${staged
      .map((file) => esc(file.path))
      .join('<br>')}</span>`,
    confirmText: '应用更新',
    onConfirm: async () => {
      const data = await apiPost('/api/management/apply', {});
      closeModal();
      await loadManagementData();
      renderTopbar();
      renderView();
      if (data.errors?.length) {
        toast(`已应用 ${data.applied.length} 个文件，${data.errors.length} 个失败`, 'bad');
      } else {
        toast('更新已应用，请重启应用生效', 'ok');
      }
    },
  });
}

function discardUpdateFlow() {
  confirmModal({
    title: '放弃暂存改动？',
    message: '暂存文件会被删除，运行中的控制台不会发生变化。',
    confirmText: '放弃改动',
    danger: true,
    onConfirm: async () => {
      await apiPost('/api/management/discard', {});
      closeModal();
      await loadManagementData();
      renderTopbar();
      renderView();
      toast('暂存改动已放弃', 'ok');
    },
  });
}

async function reloadExtensions() {
  try {
    await apiPost('/api/extensions', {});
    await loadSkillsData();
    renderSidebar();
    renderView();
    toast('扩展已重新加载', 'ok');
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function openExtensionsFolder() {
  try {
    await apiPost('/api/extensions/open-folder', {});
    toast('已请求打开扩展目录', 'ok');
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function openExtensionDocs() {
  try {
    const data = await apiGet('/api/docs/extending');
    openModal(
      `<div class="preview-head"><div class="file-meta"><strong>扩展与二次开发接口</strong><small>docs/EXTENDING.md</small></div><button class="icon-btn" data-action="close-modal">${icon(
        'x'
      )}</button></div><div class="doc-body"><div class="md">${renderMarkdown(data.markdown)}</div></div>`,
      { wide: true }
    );
  } catch (err) {
    toast(err.message, 'bad');
  }
}



/* --------------------------------------------------------------------------
   clipboard / download / files
   -------------------------------------------------------------------------- */

async function copyText(text, okMessage = '已复制') {
  const value = String(text == null ? '' : text);
  try {
    await navigator.clipboard.writeText(value);
    toast(okMessage, 'ok');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      toast(okMessage, 'ok');
    } catch {
      toast('复制失败，请手动选择', 'bad');
    }
    textarea.remove();
  }
}

function downloadDoc() {
  const project = app.project;
  if (!project?.doc) return;
  const blob = new Blob([project.doc.markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugPreview(project.name) || 'project'}-REQUIREMENTS-v${project.doc.version}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('需求文档已下载', 'ok');
}

async function openFolder() {
  const isTask = app.route.name === 'task';
  const id = isTask ? app.task?.id : app.project?.id;
  if (!id) return;
  const url = isTask ? `/api/tasks/${id}/open-folder` : `/api/projects/${id}/open-folder`;
  try {
    await apiPost(url, {});
    toast('已请求打开文件夹', 'ok');
  } catch (err) {
    toast(err.message, 'bad');
  }
}

async function deleteProjectFlow() {
  const project = app.project;
  if (!project) return;
  confirmModal({
    title: project.kind === 'folder' ? '移除这个文件夹？' : '移除这个项目？',
    message:
      project.kind === 'folder'
        ? '文件夹会从控制台移除，里面的子项会自动移到它的上级，文件和对话记录都会保留。'
        : `项目会从控制台移除，但磁盘上的文件夹会保留：<br><span style="color:#7f8aa3;font-family:var(--mono);font-size:10px">${esc(
            project.dir
          )}</span>`,
    confirmText: '移除',
    danger: true,
    onConfirm: async () => {
      const data = await apiDelete(`/api/projects/${project.id}`);
      await loadState();
      closeModal();
      app.project = null;
      location.hash = '#/projects';
      toast(
        `已移除${data.movedChildren ? `，${data.movedChildren} 个子项已移到上级` : ''}，磁盘文件保留`,
        'ok'
      );
    },
  });
}

async function deleteTaskFlow() {
  const task = app.task;
  if (!task) return;
  confirmModal({
    title: '移除这个任务？',
    message: `任务会从控制台移除，磁盘上的任务目录会保留：<br><span style="color:#7f8aa3;font-family:var(--mono);font-size:10px">${esc(
      task.dir
    )}</span>`,
    confirmText: '移除任务',
    danger: true,
    onConfirm: async () => {
      await apiDelete(`/api/tasks/${task.id}`);
      app.state.tasks = app.state.tasks.filter((item) => item.id !== task.id);
      closeModal();
      app.task = null;
      location.hash = '#/tasks';
      toast('任务已移除，磁盘文件保留', 'ok');
    },
  });
}

/* --------------------------------------------------------------------------
   toasts / chrome
   -------------------------------------------------------------------------- */

function toast(message, kind = '') {
  const root = $('#toast-root');
  if (!root) return;
  while (root.children.length >= 3) root.firstElementChild.remove();
  const element = document.createElement('div');
  element.className = `toast ${kind}`;
  element.innerHTML = `<span class="toast-dot"></span><span>${esc(message)}</span>`;
  root.appendChild(element);
  setTimeout(() => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(6px)';
    element.style.transition = '0.2s ease';
    setTimeout(() => element.remove(), 220);
  }, 3200);
}

function toggleSidebar(force) {
  const sidebar = $('#sidebar');
  const scrim = $('#sidebar-scrim');
  if (!sidebar) return;
  const next = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', next);
  scrim?.classList.toggle('show', next);
}

/* --------------------------------------------------------------------------
   events
   -------------------------------------------------------------------------- */

function attachEvents() {
  document.addEventListener('click', async (event) => {
    const quick = event.target.closest('[data-quick]');
    if (quick) {
      const input = $('#composer-input');
      if (input) {
        input.value = quick.dataset.quick;
        growTextarea(input);
        input.focus();
        updateComposerState();
      }
      return;
    }

    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'modal-backdrop') {
      if (event.target === actionEl) closeModal();
      return;
    }
    if (action === 'close-modal') {
      closeModal();
      return;
    }

    switch (action) {
      case 'new-project':
        toggleSidebar(false);
        openNewProjectModal({
          parentId: actionEl.dataset.parent !== undefined ? actionEl.dataset.parent : undefined,
          kind: actionEl.dataset.kind,
        });
        break;
      case 'new-folder':
        toggleSidebar(false);
        openNewProjectModal({
          parentId: actionEl.dataset.parent !== undefined ? actionEl.dataset.parent : undefined,
          kind: 'folder',
        });
        break;
      case 'portfolio-select':
        portfolioSelect(actionEl.dataset.id || '');
        break;
      case 'portfolio-refresh':
        loadPortfolio(app.portfolioId).then(() => {
          renderSidebar();
          renderTopbar();
          renderView();
          toast('项目总览已刷新', 'ok');
        }).catch((err) => toast(err.message, 'bad'));
        break;
      case 'portfolio-rename':
        portfolioRename(actionEl.dataset.id);
        break;
      case 'portfolio-move':
        portfolioMove(actionEl.dataset.id);
        break;
      case 'portfolio-delete':
        portfolioDelete(actionEl.dataset.id);
        break;
      case 'new-task':
        toggleSidebar(false);
        openNewTaskModal();
        break;
      case 'settings':
        openSettingsModal();
        break;
      case 'set-mode': {
        const mode = actionEl.dataset.mode;
        toggleSidebar(false);
        if (app.mode === mode && app.route.name === 'home') {
          renderSidebar();
          renderView();
          return;
        }
        app.mode = mode;
        location.hash = mode === 'projects' ? '#/projects' : '#/tasks';
        break;
      }
      case 'toggle-sidebar':
        toggleSidebar();
        break;
      case 'toggle-doc':
        togglePane('doc');
        break;
      case 'toggle-files':
        togglePane('files');
        break;
      case 'generate-doc':
        generateDoc();
        break;
      case 'start-build':
        startBuildFlow();
        break;
      case 'view-doc':
        openDocModal();
        break;
      case 'copy-doc':
        copyText(app.project?.doc?.markdown || '', '需求文档已复制');
        break;
      case 'download-doc':
        downloadDoc();
        break;
      case 'copy-path':
        copyText(actionEl.dataset.path || '', '路径已复制');
        break;
      case 'copy-code': {
        const code = actionEl.closest('.md-code')?.querySelector('code')?.textContent || '';
        copyText(code, '代码已复制');
        break;
      }
      case 'copy-preview':
        copyText(app.lastPreview || '', '文件内容已复制');
        break;
      case 'open-file':
        openFilePreview(actionEl.dataset.path || '');
        break;
      case 'refresh-files':
        await refreshFiles(app.route.name === 'task' ? 'task' : 'project');
        renderView();
        toast('文件列表已刷新', 'ok');
        break;
      case 'open-folder':
        openFolder();
        break;
      case 'open-workspace':
        try {
          await apiPost('/api/workspace/open', {});
          toast('已请求打开工作区', 'ok');
        } catch (err) {
          toast(err.message, 'bad');
        }
        break;
      case 'delete-project':
        deleteProjectFlow();
        break;
      case 'delete-task':
        deleteTaskFlow();
        break;
      case 'stop':
        app.busy?.controller?.abort();
        break;
      case 'test-connection':
        testConnection();
        break;
      case 'new-memory':
        openMemoryModal();
        break;
      case 'edit-memory':
        openMemoryModal(actionEl.dataset.id);
        break;
      case 'delete-memory':
        deleteMemoryFlow(actionEl.dataset.id);
        break;
      case 'toggle-pin':
        toggleMemoryPin(actionEl.dataset.id);
        break;
      case 'edit-agent':
        openAgentModal();
        break;
      case 'extract-memory':
        openExtractModal();
        break;
      case 'skill-tab':
        app.skillTab = actionEl.dataset.tab || 'skills';
        renderTopbar();
        renderView();
        break;
      case 'new-skill':
        openSkillModal();
        break;
      case 'edit-skill':
        openSkillModal(actionEl.dataset.id);
        break;
      case 'delete-skill':
        deleteSkillFlow(actionEl.dataset.id);
        break;
      case 'new-tool':
        openToolModal();
        break;
      case 'edit-tool':
        openToolModal(actionEl.dataset.id);
        break;
      case 'delete-tool':
        deleteToolFlow(actionEl.dataset.id);
        break;
      case 'run-tool-page':
        openToolRunModal(actionEl.dataset.name);
        break;
      case 'run-tool':
        runToolFromCard(actionEl.dataset.name, actionEl.dataset.args, actionEl.dataset.scope);
        break;
      case 'open-staged-file':
        openStagedPreview(actionEl.dataset.path);
        break;
      case 'apply-update':
        applyUpdateFlow();
        break;
      case 'discard-update':
        discardUpdateFlow();
        break;
      case 'toggle-system':
        togglePane('system');
        break;
      case 'reload-extensions':
        reloadExtensions();
        break;
      case 'open-extensions-folder':
        openExtensionsFolder();
        break;
      case 'view-extension-docs':
        openExtensionDocs();
        break;
      default:
        break;
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (form.id === 'composer') {
      event.preventDefault();
      sendCurrentMessage();
    } else if (form.id === 'new-project-form') {
      event.preventDefault();
      submitNewProject(form);
    } else if (form.id === 'new-task-form') {
      event.preventDefault();
      submitNewTask(form);
    } else if (form.id === 'settings-form') {
      event.preventDefault();
      saveSettings(form);
    } else if (form.id === 'portfolio-rename-form') {
      event.preventDefault();
      const id = form.dataset.id;
      const name = $('#pr-name')?.value.trim();
      const result = $('#pr-error');
      try {
        await apiPost(`/api/projects/${id}/rename`, { name });
        await loadState();
        closeModal();
        await loadPortfolio(app.portfolioId);
        route({ initial: true });
        toast('名称已更新', 'ok');
      } catch (err) {
        if (result) {
          result.className = 'inline-result show bad';
          result.textContent = err.message;
        }
      }
    } else if (form.id === 'portfolio-move-form') {
      event.preventDefault();
      const id = form.dataset.id;
      const parentId = $('#pm-parent')?.value || null;
      const result = $('#pm-error');
      try {
        await apiPost(`/api/projects/${id}/move`, { parentId });
        await loadState();
        closeModal();
        await loadPortfolio(app.portfolioId);
        route({ initial: true });
        toast('已移动', 'ok');
      } catch (err) {
        if (result) {
          result.className = 'inline-result show bad';
          result.textContent = err.message;
        }
      }
    } else if (form.id === 'memory-form') {
      event.preventDefault();
      submitMemoryForm(form);
    } else if (form.id === 'agent-form') {
      event.preventDefault();
      submitAgentForm(form);
    } else if (form.id === 'extract-form') {
      event.preventDefault();
      submitExtractForm(form);
    } else if (form.id === 'skill-form') {
      event.preventDefault();
      submitSkillForm(form);
    } else if (form.id === 'tool-form') {
      event.preventDefault();
      submitToolForm(form);
    } else if (form.id === 'tool-run-form') {
      event.preventDefault();
      submitToolRun(form);
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-skill-toggle]')) {
      toggleSkill(event.target.dataset.skillToggle, event.target.checked);
    } else if (event.target.matches('[data-tool-toggle]')) {
      toggleTool(event.target.dataset.toolToggle, event.target.checked);
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'composer-input') {
      growTextarea(event.target);
      updateComposerState();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.id === 'composer-input' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!app.busy) sendCurrentMessage();
      return;
    }
    if (event.key === 'Escape') {
      if ($('#modal-root')?.children.length) {
        closeModal();
        return;
      }
      toggleSidebar(false);
    }
  });

  document.addEventListener('dragstart', (event) => {
    const item = event.target.closest?.('[data-project-id]');
    if (!item) return;
    event.dataTransfer.setData('text/plain', item.dataset.projectId);
    event.dataTransfer.effectAllowed = 'move';
    item.classList.add('dragging');
  });

  document.addEventListener('dragend', () => {
    $$('.dragging, .drop-target').forEach((node) => node.classList.remove('dragging', 'drop-target'));
  });

  document.addEventListener('dragover', (event) => {
    const folder = event.target.closest?.('[data-folder-id]');
    if (!folder) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    folder.classList.add('drop-target');
  });

  document.addEventListener('dragleave', (event) => {
    const folder = event.target.closest?.('[data-folder-id]');
    if (folder) folder.classList.remove('drop-target');
  });

  document.addEventListener('drop', async (event) => {
    const folder = event.target.closest?.('[data-folder-id]');
    if (!folder) return;
    event.preventDefault();
    folder.classList.remove('drop-target');
    const projectId = event.dataTransfer.getData('text/plain');
    const folderId = folder.dataset.folderId;
    if (!projectId || !folderId || projectId === folderId) return;
    try {
      await apiPost(`/api/projects/${projectId}/move`, { parentId: folderId });
      await loadState();
      if (app.project?.id === projectId) await loadProject(projectId);
      if (app.route.name === 'portfolio') await loadPortfolio(app.portfolioId);
      renderSidebar();
      renderTopbar();
      renderView();
      toast('已移动到文件夹', 'ok');
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  window.addEventListener('hashchange', () => {
    route();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 840) toggleSidebar(false);
  });
}

/* --------------------------------------------------------------------------
   boot
   -------------------------------------------------------------------------- */

async function boot() {
  attachEvents();
  try {
    await loadState();
  } catch (err) {
    const view = $('#view');
    if (view) {
      view.innerHTML = `<div class="empty-view"><div class="blocked-card"><div class="glyph">${icon(
        'alert'
      )}</div><h2>无法连接控制台服务</h2><p>${esc(err.message)}<br>请确认服务已启动：在项目目录运行 <code>npm start</code>。</p></div></div>`;
    }
    return;
  }
  app.route = parseHash();
  await route({ initial: true });
}

boot();
