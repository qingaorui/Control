'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { safeResolve, truncate } = require('./util');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  '.cache',
  '.idea',
  '.vscode',
]);

const TEXT_EXT = new Set([
  '.md', '.txt', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss',
  '.less', '.html', '.htm', '.svg', '.xml', '.yml', '.yaml', '.toml', '.ini', '.env',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.c', '.h', '.cpp', '.hpp', '.cs', '.php',
  '.sh', '.bat', '.ps1', '.sql', '.vue', '.svelte', '.astro', '.gitignore', '.editorconfig',
  '.prisma', '.graphql', '.lock', '.csv', '.log', '',
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function writeProjectFile(root, relPath, content) {
  if (typeof content !== 'string') throw new Error('文件内容必须是文本');
  if (content.length > 400_000) throw new Error('单个文件超过 400KB，已跳过');
  const abs = safeResolve(root, relPath);
  ensureDir(path.dirname(abs));
  await fs.promises.writeFile(abs, content, 'utf8');
  const stat = await fs.promises.stat(abs);
  return { path: relPath.replace(/\\/g, '/'), bytes: stat.size };
}

async function listTree(root, { maxEntries = 500 } = {}) {
  const out = [];
  async function walk(dir, rel, depth) {
    if (out.length >= maxEntries || depth > 10) return;
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
    for (const entry of entries) {
      if (out.length >= maxEntries) return;
      if (entry.name === '.dsh-console.json') continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.git')) continue;
        out.push({ path: childRel, name: entry.name, type: 'dir', size: 0, mtime: null });
        await walk(path.join(dir, entry.name), childRel, depth + 1);
      } else if (entry.isFile()) {
        let stat = null;
        try {
          stat = await fs.promises.stat(path.join(dir, entry.name));
        } catch {
          /* ignore */
        }
        out.push({
          path: childRel,
          name: entry.name,
          type: 'file',
          size: stat ? stat.size : 0,
          mtime: stat ? stat.mtime.toISOString() : null,
        });
      }
    }
  }
  await walk(root, '', 0);
  return out;
}

async function countFiles(root) {
  const entries = await listTree(root, { maxEntries: 1000 });
  return entries.filter((e) => e.type === 'file').length;
}

function looksBinary(buffer) {
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

async function readTextFile(root, relPath, { maxBytes = 300_000 } = {}) {
  const abs = safeResolve(root, relPath);
  const stat = await fs.promises.stat(abs);
  if (!stat.isFile()) throw new Error('目标不是文件');
  const size = stat.size;
  const fd = await fs.promises.open(abs, 'r');
  let buffer;
  try {
    const length = Math.min(size, maxBytes + 1);
    buffer = Buffer.alloc(length);
    await fd.read(buffer, 0, length, 0);
  } finally {
    await fd.close();
  }
  const binary = looksBinary(buffer);
  const slice = buffer.subarray(0, Math.min(buffer.length, maxBytes));
  const content = binary ? '' : slice.toString('utf8');
  return {
    path: relPath.replace(/\\/g, '/'),
    size,
    truncated: size > maxBytes,
    binary,
    content,
  };
}

function languageFor(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  const map = {
    '.js': 'js', '.mjs': 'js', '.cjs': 'js', '.ts': 'ts', '.tsx': 'tsx', '.jsx': 'jsx',
    '.css': 'css', '.html': 'html', '.htm': 'html', '.json': 'json', '.md': 'md',
    '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.sh': 'bash',
    '.bat': 'bat', '.ps1': 'powershell', '.sql': 'sql', '.yml': 'yaml', '.yaml': 'yaml',
    '.toml': 'toml', '.xml': 'xml', '.svg': 'xml', '.vue': 'vue',
  };
  return map[ext] || '';
}

const FILE_BLOCK_RE = /<<<FILE\s+path\s*=\s*["']([^"']+)["']\s*>>>\r?\n?([\s\S]*?)<<<END\s*FILE\s*>>>/g;

function stripFileBlocks(text) {
  return String(text || '')
    .replace(FILE_BLOCK_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseFileBlocks(raw) {
  const text = String(raw || '');
  const files = [];
  let match;
  const re = new RegExp(FILE_BLOCK_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    const filePath = match[1].trim();
    let content = match[2];
    if (content.startsWith('\r\n')) content = content.slice(2);
    else if (content.startsWith('\n')) content = content.slice(1);
    files.push({ path: filePath, content });
  }
  return { display: stripFileBlocks(text), files };
}

/**
 * Removes FILE / TOOL blocks from a live token stream without leaking
 * half-written markers into the chat UI.
 */
class FileBlockFilter {
  constructor() {
    this.buffer = '';
    this.inBlock = false;
    this.endMarker = '';
    this.guard = 0;
  }

  push(chunk) {
    this.buffer += chunk;
    this.guard += chunk.length;
    if (this.guard > 8_000_000) {
      this.buffer = '';
      this.guard = 0;
      return '';
    }
    let out = '';
    for (;;) {
      if (!this.inBlock) {
        const fileIdx = this.buffer.indexOf('<<<FILE');
        const toolIdx = this.buffer.indexOf('<<<TOOL');
        let idx = -1;
        if (fileIdx !== -1 && toolIdx !== -1) idx = Math.min(fileIdx, toolIdx);
        else idx = Math.max(fileIdx, toolIdx);
        if (idx === -1) {
          if (this.buffer.length > 32) {
            out += this.buffer.slice(0, -32);
            this.buffer = this.buffer.slice(-32);
          }
          break;
        }
        out += this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx);
        const isFile = this.buffer.startsWith('<<<FILE');
        const startRe = isFile
          ? /<<<FILE\s+path\s*=\s*["'][^"']+["']\s*>>>/
          : /<<<TOOL\s+name\s*=\s*["'][^"']+["']\s*>>>/;
        const startMatch = this.buffer.match(startRe);
        if (!startMatch) {
          if (this.buffer.length > 500) {
            out += this.buffer.slice(0, 1);
            this.buffer = this.buffer.slice(1);
            continue;
          }
          break;
        }
        this.buffer = this.buffer.slice(startMatch[0].length);
        this.inBlock = true;
        this.endMarker = isFile ? '<<<END FILE>>>' : '<<<END TOOL>>>';
      } else {
        const endIdx = this.buffer.indexOf(this.endMarker);
        if (endIdx === -1) break;
        this.buffer = this.buffer.slice(endIdx + this.endMarker.length);
        this.inBlock = false;
        this.endMarker = '';
      }
    }
    return out;
  }

  finish() {
    let out = '';
    if (!this.inBlock && this.buffer) out = this.buffer;
    this.buffer = '';
    this.inBlock = false;
    this.endMarker = '';
    return out;
  }
}

async function buildSnapshot(root, { maxFiles = 40, maxChars = 60_000 } = {}) {
  if (!root || !fs.existsSync(root)) return '';
  const entries = await listTree(root, { maxEntries: 800 });
  const files = entries.filter((e) => e.type === 'file').slice(0, maxFiles);
  const chunks = [];
  let used = 0;
  for (const file of files) {
    if (file.path === 'REQUIREMENTS.md') continue;
    const ext = path.extname(file.name).toLowerCase();
    if (!TEXT_EXT.has(ext) && ext !== '') continue;
    if (file.size > 120_000) {
      chunks.push(`### ${file.path}\n（文件较大，${file.size} 字节，未包含内容）`);
      continue;
    }
    let content;
    try {
      const result = await readTextFile(root, file.path, { maxBytes: 120_000 });
      if (result.binary) continue;
      content = result.content;
    } catch {
      continue;
    }
    const block = `### ${file.path}\n\`\`\`${languageFor(file.path)}\n${content}\n\`\`\``;
    if (used + block.length > maxChars) {
      chunks.push(`### ${file.path}\n（因上下文长度限制未包含内容，共 ${file.size} 字节）`);
      continue;
    }
    used += block.length;
    chunks.push(block);
  }
  if (!chunks.length) return '';
  return `以下是项目目录中已有的文件（共 ${files.length} 个文件，内容为当前磁盘快照）：\n\n${chunks.join('\n\n')}`;
}

async function writeRequirementsDoc(root, markdown) {
  return writeProjectFile(root, 'REQUIREMENTS.md', markdown);
}

async function writeMeta(root, meta) {
  return writeProjectFile(root, '.dsh-console.json', `${JSON.stringify(meta, null, 2)}\n`);
}

module.exports = {
  ensureDir,
  writeProjectFile,
  listTree,
  countFiles,
  readTextFile,
  parseFileBlocks,
  stripFileBlocks,
  FileBlockFilter,
  buildSnapshot,
  writeRequirementsDoc,
  writeMeta,
  languageFor,
  IGNORED_DIRS,
  truncate,
};
