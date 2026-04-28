# 前端 SSE 消费指南

> 作者：Yardon | JavaScript 原生实现 + 框架适配

## 完整消费函数

```javascript
async function consumeSSE(response, { onPing, onToken, onDone, onError }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let partialLine = '', fullText = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = (partialLine + chunk).split('\n');
      partialLine = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        switch (true) {
          case data === '[DONE]':
            onDone(fullText); return;
          case data === '[PING]':
            onPing?.(); continue;
          case data.startsWith('[ERROR]'):
            onError(data.slice(7).trim()); return;
          case data.startsWith('['):
            continue;
          default:
            // json.dumps 配对解析
            const text = JSON.parse(data);
            fullText += text; onToken(fullText);
        }
      }
    }
  } finally {
    reader.releaseLock();
    decoder.decode(); // 刷新缓冲区
  }
}
```

## TextDecoder 关键点

```javascript
// ❌ 错误
const decoder = new TextDecoder();          // 虽然默认 utf-8，但不显式
const text = decoder.decode(value);         // 缺少 { stream: true }

// ✅ 正确
const decoder = new TextDecoder('utf-8');
// 循环中
const chunk = decoder.decode(value, { stream: true });
// 循环后刷新
const final = decoder.decode();
```

## 超时管理

```javascript
const FIRST_CONTENT_TIMEOUT = 25000; // 25s（后端每 15s ping 一次）
let hasPing = false;

while (!done) {
  let readResult;
  if (!hasPing) {
    readResult = await Promise.race([
      reader.read(),
      new Promise(r => setTimeout(() => r({ timeout: true }), FIRST_CONTENT_TIMEOUT))
    ]);
    if (readResult.timeout) throw new Error('timeout');
  } else {
    readResult = await reader.read();
  }

  // ... parse
  if (data === '[PING]') hasPing = true; // 收到 ping → 取消超时
}
```

## AbortController 最佳实践

```javascript
let abortCtl = null;

function send() {
  abortCtl = new AbortController();

  const res = await fetch('/api/chat/stream', {
    signal: abortCtl.signal,
    // ...
  });

  // 用户取消
  // abortCtl.abort() → fetch 抛出 AbortError
}

function cancel() {
  abortCtl?.abort();
  abortCtl = null;
}

// 清理时
function cleanup() {
  abortCtl = null;
  // 防止旧 abortCtl 影响下次请求
  const oldEl = document.getElementById('streamingMsg');
  if (oldEl) oldEl.removeAttribute('id');
}
```

## 重连机制

```javascript
async function sendWithRetry(payload, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await sendMessage(payload);
      return; // 成功
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // 等待后重试
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}
```

## 错误处理矩阵

| 错误 | `err.name` | 用户提示 | 操作 |
|------|-----------|---------|------|
| 用户取消 | `AbortError` | "已取消生成" | 不重试 |
| SSE 超时 | `Error('timeout')` | "响应较慢，正在切换..." | 降级到非流式 |
| 网络断开 | `TypeError` | "无法连接到后端服务" | 提示检查服务 |
| 服务器错误 | `Error('stream error')` | 具体错误信息 | 重试 1 次 |
