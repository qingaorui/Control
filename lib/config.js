'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeBaseUrl } = require('./util');
const dsh = require('./dsh');

const APP_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DSH_DATA_DIR
  ? path.resolve(process.env.DSH_DATA_DIR)
  : path.join(APP_ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  apiKey: '',
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com',
  projectRoot: 'D:\\dscontrol',
  temperature: 0.7,
  autoMemory: true,
  chatProvider: 'auto',
  dialogWindow: 'browser',
};

let cached = null;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  ensureDataDir();
  let disk = {};
  try {
    disk = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    disk = {};
  }
  cached = { ...DEFAULT_CONFIG, ...disk };
  if (cached.projectRoot === 'D:\\DeepSeekHarness') {
    cached.projectRoot = DEFAULT_CONFIG.projectRoot;
  }
  return cached;
}

function getConfig() {
  if (!cached) loadConfig();
  const apiKey = (process.env.DEEPSEEK_API_KEY || cached.apiKey || '').trim();
  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL || cached.baseUrl);
  const projectRoot =
    process.env.DSH_PROJECT_ROOT || cached.projectRoot || DEFAULT_CONFIG.projectRoot;
  const chatProvider = String(
    process.env.DSH_CHAT_PROVIDER || cached.chatProvider || DEFAULT_CONFIG.chatProvider
  ).toLowerCase();
  const dialogWindow = String(cached.dialogWindow || DEFAULT_CONFIG.dialogWindow).toLowerCase();
  return {
    ...cached,
    apiKey,
    baseUrl,
    projectRoot,
    chatProvider: ['auto', 'dsh', 'api'].includes(chatProvider) ? chatProvider : 'auto',
    dialogWindow: ['app', 'browser'].includes(dialogWindow) ? dialogWindow : 'browser',
    model: cached.model || DEFAULT_CONFIG.model,
    temperature: Number.isFinite(Number(cached.temperature)) ? Number(cached.temperature) : 0.7,
  };
}

function updateConfig(patch = {}) {
  if (!cached) loadConfig();
  const next = { ...cached };

  if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) {
    next.apiKey = patch.apiKey.trim();
  }
  if (patch.clearKey === true) next.apiKey = '';
  if (typeof patch.model === 'string' && patch.model.trim()) {
    next.model = patch.model.trim();
  }
  if (typeof patch.baseUrl === 'string' && patch.baseUrl.trim()) {
    next.baseUrl = normalizeBaseUrl(patch.baseUrl);
  }
  if (typeof patch.projectRoot === 'string' && patch.projectRoot.trim()) {
    next.projectRoot = path.resolve(patch.projectRoot.trim());
  }
  if (patch.temperature !== undefined) {
    const t = Number(patch.temperature);
    if (Number.isFinite(t)) next.temperature = Math.min(1.5, Math.max(0, t));
  }
  if (patch.autoMemory !== undefined) next.autoMemory = Boolean(patch.autoMemory);
  if (patch.chatProvider !== undefined) {
    const provider = String(patch.chatProvider).toLowerCase();
    if (['auto', 'dsh', 'api'].includes(provider)) next.chatProvider = provider;
  }
  if (patch.dialogWindow !== undefined) {
    const mode = String(patch.dialogWindow).toLowerCase();
    if (['app', 'browser'].includes(mode)) next.dialogWindow = mode;
  }

  ensureDataDir();
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_FILE);
  cached = next;
  return getConfig();
}

function publicConfig() {
  const cfg = getConfig();
  const key = cfg.apiKey;
  const dshInfo = dsh.describe();
  const dshReady = dshInfo.available && dshInfo.credentials;
  const chatBackend =
    cfg.chatProvider === 'dsh'
      ? 'dsh'
      : cfg.chatProvider === 'api'
      ? key
        ? 'api'
        : 'demo'
      : dshReady
      ? 'dsh'
      : key
      ? 'api'
      : 'demo';
  return {
    hasKey: Boolean(key),
    apiKeyMasked: key ? `••••••••${key.slice(-4)}` : '',
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    projectRoot: cfg.projectRoot,
    temperature: cfg.temperature,
    autoMemory: cfg.autoMemory !== false,
    chatProvider: cfg.chatProvider,
    chatBackend,
    dialogWindow: cfg.dialogWindow,
    dshAvailable: dshInfo.available,
    dshAuthenticated: dshInfo.credentials,
    dshPath: dshInfo.bin,
    demo: chatBackend === 'demo',
    dataDir: DATA_DIR,
  };
}

function effectiveKey() {
  return getConfig().apiKey;
}

module.exports = {
  APP_ROOT,
  DATA_DIR,
  CONFIG_FILE,
  DEFAULT_CONFIG,
  getConfig,
  updateConfig,
  publicConfig,
  effectiveKey,
};
