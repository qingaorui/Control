'use strict';

const dsh = require('./dsh');
const deepseek = require('./deepseek');
const { getConfig } = require('./config');

function backendFor(config) {
  const cfg = config || getConfig();
  const requested = String(cfg.chatProvider || 'auto').toLowerCase();
  if (requested === 'dsh') return 'dsh';
  if (requested === 'api') return cfg.apiKey ? 'api' : 'demo';
  if (dsh.available() && dsh.hasCredentials()) return 'dsh';
  return cfg.apiKey ? 'api' : 'demo';
}

function isDemo(config) {
  return backendFor(config) === 'demo';
}

function chatStream(args) {
  const cfg = args.config || getConfig();
  const backend = backendFor(cfg);
  if (backend === 'dsh') return dsh.streamChat(args);
  if (backend === 'api') return deepseek.streamChat(args);
  throw new Error('当前没有可用的对话后端');
}

async function chatOnce(args) {
  const cfg = args.config || getConfig();
  const backend = backendFor(cfg);
  if (backend === 'dsh') {
    let text = '';
    for await (const event of dsh.streamChat(args)) {
      if (event.type === 'content') text += event.text;
    }
    return text;
  }
  if (backend === 'api') return deepseek.chatOnce(args);
  return '';
}

async function testConnection(args = {}) {
  const cfg = getConfig();
  const requested = String(args.chatProvider || cfg.chatProvider || 'auto').toLowerCase();
  if (requested === 'dsh' || (requested === 'auto' && dsh.available() && dsh.hasCredentials())) {
    const result = dsh.status();
    return { ...result, backend: 'dsh' };
  }
  const result = await deepseek.testConnection({
    apiKey: args.apiKey || cfg.apiKey,
    baseUrl: args.baseUrl || cfg.baseUrl,
    model: args.model || cfg.model,
  });
  return { ...result, backend: 'api' };
}

module.exports = {
  backendFor,
  isDemo,
  chatStream,
  chatOnce,
  testConnection,
  dsh,
};
