# Markdown 渲染详解 / Markdown Rendering Details

> 🇬🇧 EN: Marked.js configuration, render pipeline, tool-output filtering, language-adaptive strategies.
> 🇨🇳 ZH: Marked.js 配置、渲染管道、工具调用过滤、多语言适配策略。


> ⚠️ **权威实现以 [chat_template.html](../assets/chat_template.html) 为准**。本文档为 API 说明与配置参考。

> 作者：Yardon | 覆盖 marked.js + DOMPurify + highlight.js + KaTeX + Mermaid

## 库依赖

```html
<!-- 核心 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/marked.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<!-- 安全 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>

<!-- 按需：数学公式 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

<!-- 按需：图表 -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
```

## marked.js 配置

```javascript
marked.setOptions({
  breaks: true,       // 单换行 → <br>（⚠️ 非标准 CommonMark 行为，见下方说明）
  gfm: true,          // GitHub Flavored Markdown
  headerIds: false    // 不生成 header id（避免冲突）
});
```

> ⚠️ `breaks: true` 改变了标准 Markdown 行为：
> 单个换行符在渲染时被转换为 `<br>`（HTML 换行），而非标准 CommonMark 的空格合并。
> 这意味着 Markdown 源文本中的行内换行在页面上会产生视觉换行效果。
> 如果你希望严格遵循 CommonMark 规范（单换行合并为空格，连续两个换行才创建新段落），
> 请设置 `breaks: false`。
>
> 该选项对 GFM 表格、代码块、列表等块级元素无影响，仅影响段落内的普通文本行。

## 完整渲染函数（v2）

```javascript
/* ── 全局状态 ── */
let lastRenderedLength = 0;     // 增量渲染追踪
const RENDER_THRESHOLD = 80;    // 字符增量阈值
let renderCleanupFn = null;     // AbortController 式 setTimeout 清理

function renderMarkdown(text, opts = {}) {
  const { incremental = false } = opts;
  text = cleanToolOutput(text);

  // 清理上一次渲染的延迟任务
  if (renderCleanupFn) { renderCleanupFn(); renderCleanupFn = null; }

  // 增量渲染：未达到阈值跳过
  if (incremental && text.length - lastRenderedLength < RENDER_THRESHOLD && lastRenderedLength > 0) {
    return null;
  }
  lastRenderedLength = text.length;

  // 1. Markdown → HTML
  const html = marked.parse(text);

  // 2. DOMPurify 净化 + javascript: 过滤
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
      'strong','em','del','a','code','pre','blockquote','table','thead',
      'tbody','tr','th','td','img','span','div','hr','sup','sub','input'], // v3: 添加 input 支持任务列表
    ALLOWED_ATTR: ['href','src','class','id','target','alt','title','type','checked','disabled'], // v3: 任务列表属性
    ALLOW_DATA_ATTR: false
  });

  const container = document.createElement('div');
  container.innerHTML = clean;

  // 3. 响应式表格包裹
  container.querySelectorAll('table').forEach(table => {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  // 4. 代码块：语言标签 + 复制按钮
  container.querySelectorAll('pre code').forEach(block => {
    const pre = block.parentElement;
    const lang = (block.className.match(/language-(\w+)/) || [])[1] || 'text';
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `<span class="code-lang">${lang}</span>
      <button class="copy-btn" onclick="copyCode(this)">📋 复制</button>`;
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header); wrapper.appendChild(pre);
  });

  // 5. 代码高亮 + KaTeX + Mermaid（AbortController 管理）
  const abortCtl = new AbortController();
  const signal = abortCtl.signal;

  const hlTimer = setTimeout(() => {
    if (signal.aborted) return;
    container.querySelectorAll('pre code').forEach(block => {
      if (typeof hljs !== 'undefined') {
        try { hljs.highlightElement(block); } catch(e) {}
      }
    });
  }, 50);

  const katexTimer = setTimeout(() => {
    if (signal.aborted) return;
    if (typeof renderMathInElement !== 'undefined') {
      try {
        renderMathInElement(container, {
          delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],
          throwOnError: false
        });
      } catch(e) { /* 公式渲染失败，保留原始文本 */ }
    }
  }, 100);

  const mermaidTimer = setTimeout(() => {
    if (signal.aborted) return;
    if (typeof mermaid !== 'undefined') {
      try {
        const blocks = container.querySelectorAll('.language-mermaid');
        blocks.forEach(b => {
          const div = document.createElement('div');
          div.className = 'mermaid'; div.textContent = b.textContent;
          b.parentElement.parentNode.replaceChild(div, b.parentElement);
        });
        mermaid.run({ nodes: container.querySelectorAll('.mermaid') }).catch(() => {});
      } catch(e) {}
    }
  }, 200);

  renderCleanupFn = () => {
    abortCtl.abort();
    clearTimeout(hlTimer);
    clearTimeout(katexTimer);
    clearTimeout(mermaidTimer);
    renderCleanupFn = null;
  };

  return container;
}
```

## DOMPurify javascript: 过滤钩子

```javascript
// 全局注册（应用初始化时执行一次）
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href').trim().toLowerCase();
    if (href.startsWith('javascript:') || href.startsWith('data:') ||
        href.startsWith('vbscript:')) {
      node.removeAttribute('href');
    }
  }
});
```

## Clipboard API fallback

```javascript
function copyToClipboard(text, onSuccess, onError) {
  // 现代 Clipboard API（需要安全上下文）
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy());
  } else {
    fallbackCopy();
  }
  function fallbackCopy() {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) onSuccess(); else if (onError) onError();
  }
}
```

## CDN 降级检测

```html
<script src="marked.min.js" onerror="window.MARKED_FAIL=1"></script>
```

```javascript
// 页面加载 3 秒后检测
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const missing = [];
    if (!window.marked) missing.push('marked.js');
    if (!window.hljs) missing.push('highlight.js');
    if (!window.DOMPurify) missing.push('DOMPurify');
    if (missing.length > 0) {
      document.getElementById('cdnBanner').style.display = 'block';
    }
  }, 3000);
});
```

## 流式更新时的增量渲染

```javascript
function updateAssistantBubble(el, fullText, startTime) {
  if (thinkingTimer /* 全局变量，在文件顶部定义 */) { clearInterval(thinkingTimer /* 全局变量，在文件顶部定义 */); thinkingTimer /* 全局变量，在文件顶部定义 */ = null; }

  const bubble = el.querySelector('.bubble');
  // incremental: true → 仅文本增量 ≥80 字符时才重渲染
  const md = renderMarkdown(cleanToolOutput(fullText), { incremental: true });
  if (md) {
    bubble.innerHTML = '';
    bubble.appendChild(md);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const tt = document.createElement('div');
  tt.className = 'thinking-time';
  tt.textContent = '思考耗时 ' + elapsed + 's';
  bubble.appendChild(tt);
}
```

## 消息完成后的最终渲染

```javascript
// SSE 结束后执行一次全量渲染，确保增量残余被正确显示
const bubble = assistEl.querySelector('.bubble');
const md = renderMarkdown(fullText); // 不传 incremental，强制全量渲染
bubble.innerHTML = '';
bubble.appendChild(md);
```

## 消息操作按钮

```javascript
function addMessageActions(bubble) {
  if (bubble.querySelector('.msg-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML = `
    <button onclick="copyMsg(this)" title="复制">📋</button>
    <button onclick="regenerateMsg(this)" title="重新生成">🔄</button>
    <button onclick="thumbsUp(this)" title="有用">👍</button>
    <button onclick="thumbsDown(this)" title="无用">👎</button>
  `;
  bubble.appendChild(actions);
}
```

```css
.msg-actions {
  display: flex; gap: 8px; margin-top: 8px; padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.05);
  opacity: 0; transition: opacity 0.2s;
}
.msg.assistant:hover .msg-actions { opacity: 1; }
.msg-actions button {
  background: none; border: none; cursor: pointer;
  font-size: 14px; padding: 4px 8px; border-radius: 4px; opacity: 0.6;
}
.msg-actions button:hover { opacity: 1; background: rgba(0,0,0,0.05); }
```

## 输入框占位符

```css
#chatInput { text-align: center; padding: 6px 8px 6px 24px; }
#chatInput:not(:placeholder-shown) { text-align: left; }
#chatInput::placeholder { color: #999; }
```

## 工具调用输出过滤

```javascript
function cleanToolOutput(text) {
  if (!text) return '';
  let out = text;

  // JSON tool_calls 块
  out = out.replace(/\{[^{}]*"tool_calls"\s*:\s*\[[\s\S]*?\][^{}]*\}/g, '');

  // 函数调用标签（大小写不敏感）
  out = out.replace(/<\/?function[^>]*>/gi, '');
  out = out.replace(/<function=[^>]+>/gi, '');

  // 系统输出模式
  out = out.replace(/Answer record saved successfully[\s\S]*?(?=\n\n|\n#|$)/gi, '');
  out = out.replace(/.*(?:已保存|自动保存).*(?:知识库|记录)[\s\S]*?(?=\n\n|\n#|$)/g, '');
  out = out.replace(/save_qa_to_knowledge_base\s*\([\s\S]*?\)/g, '');

  return out.trim();
}
```
