# 性能优化

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

## 方案 1：增量渲染（推荐）

只追加新增部分，不重建整个 DOM：

```javascript
let lastRenderedLength = 0;

function updateAssistantBubbleIncremental(el, fullText) {
  const newPart = fullText.slice(lastRenderedLength);
  if (!newPart) return;

  const bubble = el.querySelector('.bubble');
  const rendered = renderMarkdown(newPart);

  // 追加到现有内容
  bubble.querySelector('.markdown-body').appendChild(rendered);
  lastRenderedLength = fullText.length;
}
```

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

- [ ] 是否使用了 `requestAnimationFrame` 或 `debounce` 限制渲染频率？
- [ ] 是否避免了 `innerHTML` 全量重写长文本？
- [ ] 代码高亮是否延迟执行（`setTimeout` 50ms）？
- [ ] Mermaid 渲染是否异步（`await mermaid.render`）？
- [ ] KaTeX 渲染是否按需（只渲染新内容）？
