# Markdown 渲染详解

> 作者：Yardon | 覆盖 marked.js + highlight.js + KaTeX + Mermaid

## 库依赖

```html
<!-- 核心 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/marked.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

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
  breaks: true,       // 单换行 → <br>
  gfm: true,          // GitHub Flavored Markdown
  headerIds: false    // 不生成 header id（避免冲突）
});
```

## 完整渲染函数

```javascript
function renderMarkdown(text) {
  if (!text) return '';

  // 1. 过滤工具调用输出
  text = cleanToolOutput(text);

  // 2. Markdown → HTML
  const html = marked.parse(text);
  const container = document.createElement('div');
  container.innerHTML = html;

  // 3. 代码块：添加语言标签 + 复制按钮
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

  // 4. 代码高亮（延迟执行）
  setTimeout(() => {
    container.querySelectorAll('pre code').forEach(block => {
      if (typeof hljs !== 'undefined') hljs.highlightElement(block);
    });
  }, 50);

  // 5. KaTeX 公式
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
  }

  // 6. Mermaid 图表（异步）
  if (typeof mermaid !== 'undefined') {
    setTimeout(() => renderMermaidCharts(container), 100);
  }

  return container;
}
```

## 流式更新时的渲染

```javascript
function updateAssistantBubble(el, fullText, startTime) {
  if (thinkingTimer) { clearInterval(thinkingTimer); thinkingTimer = null; }

  const bubble = el.querySelector('.bubble');
  const md = renderMarkdown(cleanToolOutput(fullText));
  bubble.innerHTML = '';
  bubble.appendChild(md);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const tt = document.createElement('div');
  tt.className = 'thinking-time';
  tt.textContent = '思考耗时 ' + elapsed + 's';
  bubble.appendChild(tt);
}
```

## 消息操作按钮

```javascript
function addMessageActions(bubble) {
  if (bubble.querySelector('.msg-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML = `
    <button onclick="copyMessage(this)" title="复制">📋</button>
    <button onclick="regenerateMessage(this)" title="重新生成">🔄</button>
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

## DOMPurify XSS 防护

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
```

```javascript
// 在渲染前净化
const clean = DOMPurify.sanitize(marked.parse(text), {
  ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
    'strong','em','del','a','code','pre','blockquote','table','thead',
    'tbody','tr','th','td','img','span','div'],
  ALLOWED_ATTR: ['href','src','class','id','target']
});
```
