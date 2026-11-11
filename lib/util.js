'use strict';

const crypto = require('node:crypto');
const path = require('node:path');

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

function shortId(bytes = 5) {
  return crypto.randomBytes(bytes).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(name) {
  const ascii = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  return ascii || `project-${shortId(3)}`;
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function safeResolve(root, relPath) {
  if (typeof relPath !== 'string' || !relPath.trim()) {
    throw new Error('文件路径不能为空');
  }
  const cleaned = relPath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (/^[a-zA-Z]:/.test(cleaned) || path.posix.isAbsolute(cleaned)) {
    throw new Error('只允许使用相对项目目录的路径');
  }
  const parts = cleaned.split('/').filter((p) => p && p !== '.');
  if (!parts.length) throw new Error('文件路径不能为空');
  if (parts.some((p) => p === '..')) {
    throw new Error('文件路径不能包含 ..');
  }
  for (const part of parts) {
    if (WINDOWS_RESERVED.test(part)) throw new Error(`非法文件名：${part}`);
    if (/[<>:"|?*\u0000-\u001f]/.test(part)) throw new Error(`文件名含有非法字符：${part}`);
  }
  const rootAbs = path.resolve(root);
  const abs = path.resolve(rootAbs, ...parts);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
    throw new Error('文件路径越出了项目目录');
  }
  return abs;
}

function truncate(text, max) {
  const s = String(text || '');
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…（已截断，共 ${s.length} 字符）`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(input) {
  const raw = String(input || '').trim() || 'https://api.deepseek.com';
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('API Base 不是合法的 URL');
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('API Base 只支持 http/https');
  return url.toString().replace(/\/+$/, '');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  shortId,
  nowIso,
  slugify,
  formatBytes,
  safeResolve,
  truncate,
  sleep,
  normalizeBaseUrl,
  WINDOWS_RESERVED,
  escapeRegExp,
};
