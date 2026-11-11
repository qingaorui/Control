'use strict';

const { getConfig } = require('./config');

function friendlyError(status, body) {
  let detail = '';
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message || parsed?.message || '';
  } catch {
    detail = String(body || '').slice(0, 300);
  }
  const hints = {
    400: '请求格式有误',
    401: 'API Key 无效或已过期，请在设置中检查',
    402: '账户余额不足，请前往 DeepSeek 平台充值',
    403: '该 API Key 没有访问权限',
    404: '接口地址不存在，请检查 API Base',
    422: '请求参数有误',
    429: '请求过于频繁或额度受限，请稍后重试',
    500: 'DeepSeek 服务端错误，请稍后重试',
    502: 'DeepSeek 网关错误，请稍后重试',
    503: 'DeepSeek 服务繁忙，请稍后重试',
  };
  const hint = hints[status] || `请求失败（HTTP ${status}）`;
  return detail ? `${hint}：${detail}` : hint;
}

async function* streamChat({ config, messages, signal, temperature }) {
  const cfg = config || getConfig();
  if (!cfg.apiKey) throw new Error('尚未配置 DeepSeek API Key');

  const body = {
    model: cfg.model,
    messages,
    stream: true,
  };
  if (!String(cfg.model).includes('reasoner')) {
    body.temperature = temperature ?? cfg.temperature ?? 0.7;
  }

  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error(`无法连接到 DeepSeek（${url}）：${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(friendlyError(res.status, text));
  }
  if (!res.body) throw new Error('DeepSeek 返回了空响应');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finished = false;

  try {
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') {
          finished = true;
          break;
        }
        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        if (json.error) throw new Error(json.error.message || 'DeepSeek 返回错误');
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.reasoning_content) {
          yield { type: 'reasoning', text: delta.reasoning_content };
        }
        if (delta.content) {
          yield { type: 'content', text: delta.content };
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

async function chatOnce({ config, messages, temperature, maxTokens, signal }) {
  const cfg = config || getConfig();
  if (!cfg.apiKey) throw new Error('尚未配置 DeepSeek API Key');
  const body = {
    model: cfg.model,
    messages,
    stream: false,
  };
  if (!String(cfg.model).includes('reasoner')) {
    body.temperature = temperature === undefined ? 0.3 : temperature;
  }
  if (maxTokens) body.max_tokens = maxTokens;
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: signal || AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new Error(`无法连接到 DeepSeek：${err.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(friendlyError(res.status, text));
  }
  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  return message?.content || '';
}

async function testConnection({ apiKey, baseUrl, model }) {
  if (!apiKey) return { ok: false, demo: true, message: '尚未配置 API Key，当前为演示模式' };
  const base = String(baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, message: friendlyError(res.status, text) };
    }
    const data = await res.json().catch(() => ({}));
    const models = Array.isArray(data?.data) ? data.data.map((m) => m.id).filter(Boolean) : [];
    return {
      ok: true,
      message: models.length ? `连接成功，可用模型：${models.slice(0, 4).join('、')}` : '连接成功',
      models,
      model,
    };
  } catch (err) {
    return { ok: false, message: `连接失败：${err.message}` };
  }
}

module.exports = { streamChat, chatOnce, testConnection, friendlyError };
