'use strict';

// Test double for `dsh headless --json`: emits the same newline-delimited
// event vocabulary without needing DSH credentials or network access.

const lines = [
  { type: 'session', sessionId: 'session-fake' },
  { type: 'status', phase: 'turn_start', turn: 1 },
  { type: 'thinking', text: '正在理解任务。' },
  { type: 'text', text: '这是来自已安装 DeepSeek Harness 的回复。' },
  { type: 'status', phase: 'turn_end', turn: 1 },
  { type: 'final', text: '这是来自已安装 DeepSeek Harness 的回复。' },
];

process.stdout.write(lines.map((line) => `${JSON.stringify(line)}\n`).join(''));
setTimeout(() => process.exit(0), 10);
