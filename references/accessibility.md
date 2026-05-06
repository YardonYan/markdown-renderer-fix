# 无障碍访问指南 / Accessibility Guide

> 🇬🇧 EN: WCAG compliance, ARIA attributes, keyboard shortcuts, color contrast, screen reader support.
> 🇨🇳 ZH: WCAG 合规、ARIA 属性、键盘快捷键、颜色对比度、屏幕阅读器支持。


> 作者：Yardon | Accessibility (A11y) 支持

## ARIA Live Regions

流式内容播报需要 ARIA live regions 让屏幕阅读器感知内容更新。

### 基础实现

```html
<!-- 聊天区域：polite 模式（不打断当前阅读） -->
<div class="chat-flow" role="log" aria-live="polite" aria-atomic="false" aria-label="聊天消息"></div>

<!-- 流式消息：assertive 模式（即时播报新 token） -->
<div id="streamingMsg" role="status" aria-live="assertive" aria-atomic="false">
  <div class="bubble">...</div>
</div>
```

### 优化：避免朗读所有内容

流式更新时，`aria-atomic="false"` 确保屏幕阅读器只朗读新增部分。但 `innerHTML` 全量替换会导致重复朗读。

```javascript
// 增量文本播报方案
let lastAnnouncedLength = 0;

function updateStreamingBubble(el, fullText) {
  // 1. 视觉更新（全量）
  renderMarkdown(el, fullText);

  // 2. ARIA 播报（仅新增部分）
  const newText = fullText.slice(lastAnnouncedLength).trim();
  if (newText.length > 0) {
    const announcer = document.getElementById('ariaAnnouncer');
    announcer.textContent = '';  // 清空后重新赋值触发播报
    setTimeout(() => { announcer.textContent = newText; }, 50);
    lastAnnouncedLength = fullText.length;
  }
}
```

```html
<!-- 隐藏的 ARIA 播报器 -->
<div id="ariaAnnouncer" class="sr-only" role="status" aria-live="polite"></div>
```

## 屏幕阅读器专用样式

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}
```

## 键盘快捷键

| 快捷键 | 操作 | 备注 |
|:-------|:-----|:-----|
| `Enter` | 发送消息 | 输入框聚焦时生效 |
| `Shift + Enter` | 换行 | 多行输入 |
| `Esc` | 取消流式生成 | 终止 SSE 请求 |
| `Tab` | 聚焦下一个控件 | 标准导航 |
| `Ctrl + Enter` | 发送消息 | 备用方案（不要求 Shift） |

### 键盘事件处理

```javascript
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelGeneration();
  }
});
```

## 焦点管理

```javascript
// 发送后自动聚焦输入框
function afterSend() {
  const input = document.getElementById('chatInput');
  input.focus();

  // 错误发生时，焦点移到错误消息
  // errorEl.focus();
}
```

## 语义化 HTML

```html
<!-- 聊天容器 -->
<main role="main" aria-label="AI 聊天界面">
  <!-- 消息列表 -->
  <section role="log" aria-label="对话历史" aria-live="polite">
    <article role="article" aria-label="用户消息">...</article>
    <article role="article" aria-label="AI 回复">...</article>
  </section>

  <!-- 输入区域 -->
  <footer role="contentinfo">
    <form role="form" aria-label="输入消息">
      <label for="chatInput" class="sr-only">输入消息</label>
      <textarea id="chatInput" aria-describedby="inputHint"></textarea>
      <span id="inputHint" class="sr-only">按 Enter 发送，Shift+Enter 换行</span>
      <button type="submit" aria-label="发送消息">发送</button>
    </form>
  </footer>
</main>
```

## 颜色对比度

确保文本与背景对比度满足 WCAG 2.1 AA 标准：

| 元素 | 前景色 | 背景色 | 对比度 | 标准 |
|:-----|:-------|:-------|:------:|:----:|
| 正文 | `#2C2C2C` | `#F5F0EB` | 12.3:1 | ✅ AAA |
| 正文 | `#e0e0e0` | `#1a1a2e` | 9.8:1 | ✅ AAA |
| 链接 | `#7BA7A6` | `#F5F0EB` | 3.2:1 | ⚠️ 仅 AA Large |
| 正文（暗黑） | `#999` | `#2a2a3e` | 3.8:1 | ⚠️ 仅 AA Large |

> ⚠️ 链接色 `#7BA7A6` 在亮色背景上对比度不足 AAA。若需要严格遵守，建议加深至 `#5E8E8D`。

## 动画与动效

> `prefers-reduced-motion: reduce` 媒体查询

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 无障碍检查清单

- [ ] 消息列表使用 `role="log"` + `aria-live="polite"`
- [ ] 流式消息使用 `role="status"` + `aria-live="assertive"`
- [ ] 输入框有 `<label>`（可用 `.sr-only` 隐藏）
- [ ] 按钮有 `aria-label` 描述功能
- [ ] 键盘快捷键已实现（Enter / Shift+Enter / Esc）
- [ ] 焦点在发送后自动回到输入框
- [ ] 颜色对比度满足 WCAG AA
- [ ] 支持 `prefers-reduced-motion`
- [ ] 屏幕阅读器可访问错误提示
