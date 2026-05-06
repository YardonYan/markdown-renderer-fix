# 性能优化 / Performance Optimization

> 🇬🇧 EN: Incremental rendering, requestAnimationFrame throttling, virtual scrolling, Web Worker offloading.
> 🇨🇳 ZH: 增量渲染、rAF 节流、虚拟滚动、Web Worker 离线解析。


> ⚠️ **权威实现以 [chat_template.html](../assets/chat_template.html) 为准**。本文档为方案对比与选型参考。

> 作者：Yardon | 大文本渲染 / 流式更新性能

## 问题场景

| 文本长度 | 现象 | 原因 |
|---------|------|------|
| <2000 字 | 流畅 | `innerHTML` 重渲染足够快 |
| 2000-5000 字 | 轻微卡顿 | DOM 重建开销增大 |
| >5000 字 | 明显卡顿 | 每次重渲染全量重建 |
| >10000 字 | 严重卡顿/页面冻结 | 单次渲染 >100ms |

## 方案对比

| 方案 | 适用场景 | 复杂度 | 兼容性 |
|------|---------|--------|--------|
| 增量渲染（推荐） | 流式 SSE | 低 | 全部浏览器 |
| requestAnimationFrame 节流 | 高频更新 | 低 | 全部浏览器 |
| 虚拟滚动 | 历史消息列表 | 中 | 全部浏览器 |
| Web Worker | 离线解析 | 高 | 需要适配 |

## 方案 1：增量渲染（推荐，已集成在模板中）

`chat_template.html` v3 内置实现：在 SSE 流式消费过程中，仅当文本增量 ≥ 80 字符时才重建 DOM。

```javascript
// 全局状态
let lastRenderedLength = 0;
const RENDER_THRESHOLD = 80;
let renderCleanupFn = null;

function renderMarkdown(text, opts = {}) {
  const { incremental = false } = opts;
  text = cleanToolOutput(text);

  // 清理上一次的延迟渲染任务（AbortController 模式）
  if (renderCleanupFn) { renderCleanupFn(); renderCleanupFn = null; }

  // 增量渲染：未达到阈值跳过
  if (incremental && text.length - lastRenderedLength < RENDER_THRESHOLD && lastRenderedLength > 0) {
    return null;
  }
  lastRenderedLength = text.length;

  // 全量重建 DOM → 返回 container 元素
  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(marked.parse(text), { /* ... */ });
  // ... 代码块包装、高亮调度（AbortController 管理）...
  return container;
}

// SSE 流式消费中调用
const md = renderMarkdown(fullText, { incremental: true });
if (md) {
  bubble.innerHTML = '';
  bubble.appendChild(md);
}
```

> **关键设计**：<80 字符增量不做渲染，>80 字符时做全量 `innerHTML` 替换而非追加。
> 这样既避免了高频 DOM 操作，又保证了 Markdown 块级元素（表格/代码块）的正确重新解析。

## 方案 2：requestAnimationFrame 节流

```javascript
let pendingUpdate = null;

function updateAssistantBubbleThrottled(el, fullText) {
  if (pendingUpdate) cancelAnimationFrame(pendingUpdate);
  pendingUpdate = requestAnimationFrame(() => {
    updateAssistantBubble(el, fullText);
    pendingUpdate = null;
  });
}
```

## 方案 3：debounce 合并更新

```javascript
function debounce(fn, ms = 50) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const updateAssistantBubbleDebounced = debounce(updateAssistantBubble, 50);
```

## 方案 4：大历史消息列表 — 虚拟滚动

```html
<script src="https://cdn.jsdelivr.net/npm/@tanstack/virtual-core@3"></script>
```

```javascript
// 只渲染可视区域内的消息
// 适用于超过 50 条历史消息的场景
```

## 性能检查清单

- [ ] 是否使用了增量渲染（阈值 80 字符）？  ← 见方案 1
- [ ] 是否避免了每次收到 token 都重建 DOM？
- [ ] 代码高亮是否通过 AbortController 管理（可随时取消）？
- [ ] SSE 流结束后是否执行了一次全量最终渲染？
- [ ] Mermaid 渲染是否在 try/catch 边界内（失败保留原始代码）？
- [ ] KaTeX 渲染是否设置了 `throwOnError: false`？
