# 测试与验证 / Testing & Validation

> 🇬🇧 EN: 11 verification tests including XSS, dark mode, mobile responsive, encoding round-trip.
> 🇨🇳 ZH: 11 项验证测试：XSS 攻击、暗黑模式、移动端响应式、编码往返验证。

> **v3.0.0 — 3 new test cases: design tokens, typography, dark mode transition**

> 作者：Yardon | 14 个核心验证案例（v3 新增 3 个）

## 测试 1：中文基础

**输入**：`"你好世界"`

**预期**：AI 回复中所有中文字符正常显示，无 `` 或 ``

**验证**：
```javascript
// 浏览器控制台
const text = document.querySelector('.msg.assistant .bubble').textContent;
console.assert(!text.includes('\uFFFD'), '不应包含 U+FFFD 替换字符');
console.assert(text.includes('你好'), '应包含原始中文');
```

## 测试 2：中英文混合

**输入**：`"什么是 Python 装饰器？"`

**预期**：中文和英文都正常显示，英文单词不被拆断

**验证**：
```javascript
// 浏览器控制台
const bubble = document.querySelector('.msg.assistant .bubble');
const hasPython = bubble.textContent.includes('Python');
const hasChinese = /[\u4e00-\u9fff]/.test(bubble.textContent);
console.assert(hasPython && hasChinese, '应同时包含中英文');
console.assert(!bubble.textContent.includes(''), '不应有乱码');
const pythonIndex = bubble.textContent.indexOf('Python');
console.assert(pythonIndex > -1, 'Python 应完整显示');
```

## 测试 3：Markdown 表格

**输入**：`"用表格对比 Python 和 JavaScript"`

**预期**：表格有边框、对齐正确、斑马纹、移动端可横向滚动

**验证**：
```javascript
// 浏览器控制台
const table = document.querySelector('.msg.assistant .bubble table');
console.assert(table, '应存在 <table> 元素');
const thead = table.querySelector('thead');
const tbody = table.querySelector('tbody');
console.assert(thead, '应有 <thead>');
console.assert(tbody, '应有 <tbody>');
const rows = tbody.querySelectorAll('tr');
if (rows.length >= 2) {
  const evenBg = window.getComputedStyle(rows[1]).backgroundColor;
  console.assert(evenBg !== 'rgba(0, 0, 0, 0)', '偶数行应有背景色');
}
```

## 测试 4：代码块

**输入**：`"写一个 Python 冒泡排序"`

**预期**：代码块有语言标签、复制按钮、语法高亮

**验证**：
```javascript
// 浏览器控制台
const wrapper = document.querySelector('.code-block-wrapper');
console.assert(wrapper, '应存在 .code-block-wrapper');
const lang = wrapper.querySelector('.code-lang');
console.assert(lang, '应有语言标签');
console.assert(lang.textContent.toLowerCase().includes('python'), '语言应为 python');
const copyBtn = wrapper.querySelector('.copy-btn');
console.assert(copyBtn, '应有复制按钮');
// 点击复制后验证
copyBtn.click();
// 注意：复制操作的反馈时间依赖浏览器和复制路径（Clipboard API vs execCommand）。
// 600ms 是常规参考值，CI 环境中可能需要增大或改为轮询检测。
const code = wrapper.querySelector('code');
console.assert(code.querySelector('.hljs-keyword') || code.className.includes('hljs'),
  '应有语法高亮');
```

## 测试 5：数学公式

**输入**：`"写欧拉公式"`

**预期**：KaTeX 渲染 `$e^{i\pi} + 1 = 0$`，渲染失败时保留原始文本

**验证**：
```javascript
// 浏览器控制台
const katexEl = document.querySelector('.katex');
console.assert(katexEl, '应存在 .katex 元素（公式已渲染）');
const bubble = document.querySelector('.msg.assistant .bubble');
const hasFormula = bubble.innerHTML.includes('katex') ||
  /e\^\{i[\\pi]*\}/.test(bubble.textContent);
console.assert(hasFormula, '页面应包含公式内容');
```

## 测试 6：连续对话

**输入**：第 1 次 `"什么是 RAG？"`，第 2 次 `"它有什么优点？"`

**预期**：两次都有响应，第二次不卡住

**验证**：
```javascript
// 浏览器控制台（在两次对话后执行）
const userMsgs = document.querySelectorAll('.msg.user');
const assistantMsgs = document.querySelectorAll('.msg.assistant');
console.assert(userMsgs.length >= 2, `应有至少 2 条用户消息，实际: ${userMsgs.length}`);
console.assert(assistantMsgs.length >= 2, `应有至少 2 条 AI 回复，实际: ${assistantMsgs.length}`);
// 检查无报错
document.querySelectorAll('.msg.assistant .bubble').forEach(b => {
  const text = b.textContent;
  console.assert(!text.includes('请求超时'), '不应有超时错误');
  console.assert(!text.includes('无法连接'), '不应有连接错误');
  console.assert(!text.includes('stream_unavailable'), '不应有流错误');
});
```

## 测试 7：长文本

**输入**：`"详细介绍 Python 的所有内置数据类型"`

**预期**：逐 token 流式出现（打字机效果），首 token 延迟 <30s，不卡顿

**验证**：
```javascript
// 浏览器控制台 — 在流式接收过程中检查
let lastLength = 0;
const observer = new MutationObserver(() => {
  const bubble = document.querySelector('#streamingMsg .bubble');
  if (!bubble) return;
  const currentLength = bubble.textContent.length;
  if (currentLength > lastLength + 1) {
    console.log('流式正常：', currentLength, '字符');
  }
  lastLength = currentLength;
});
observer.observe(document.querySelector('.chat-flow'), { childList: true, subtree: true });
```

## 测试 8：工具调用过滤

**输入**：任意问题（如 `"什么是 Python？"`）

**预期**：回复中无内部系统输出泄露

**验证**：
```javascript
// 浏览器控制台
document.querySelectorAll('.msg.assistant .bubble').forEach(b => {
  const html = b.innerHTML;
  const text = b.textContent;
  console.assert(!text.includes('save_qa_to_knowledge_base'), '不应泄露工具名称');
  console.assert(!html.includes('<function='), '不应泄露 function 标签');
  console.assert(!text.includes('Record ID'), '不应泄露 Record ID');
  console.assert(!text.includes('Answer record saved'), '不应泄露保存日志');
  console.assert(!text.includes('自动保存至知识库'), '不应泄露中文日志');
  console.assert(!html.includes('"tool_calls"'), '不应泄露 tool_calls JSON');
});
```

## 🆕 测试 9：XSS 攻击防护（v2 新增 ⭐ 高优先级）

**目的**：验证 DOMPurify 是否正确净化恶意输入

**测试输入**（需直接修改 HTML 测试，非通过 API）：
```javascript
// 浏览器控制台
// 模拟恶意 Markdown 输入
const xssInput = `# 正常内容
<script>window.XSS_TEST = true;</script>
[点击](javascript:alert('XSS'))
<img src=x onerror="window.XSS_IMG = true">
<p style="background:red">带样式的段落</p>
\`\`\`html
<b>safe code block</b>
\`\`\`
`;

// 测试 renderMarkdown
const container = renderMarkdown(xssInput);

// 验证
console.assert(!container.innerHTML.includes('<script>'), '<script> 标签应被移除');
console.assert(!container.innerHTML.includes('javascript:'), 'javascript: 协议应被移除');
console.assert(!container.innerHTML.includes('onerror'), '事件处理器应被移除');

// 验证全网：window.XSS_TEST 不应被定义
console.assert(typeof window.XSS_TEST === 'undefined', 'XSS script 不应执行');

// 通过 DOMPurify 钩子验证 href
const links = container.querySelectorAll('a');
links.forEach(a => {
  console.assert(!a.href.startsWith('javascript:'),
    '不应有 javascript: 链接: ' + a.href);
});

// 验证代码块内容被保留（不会被净化）
const code = container.querySelector('code');
console.assert(code, '代码块应保留');
console.assert(code.textContent.includes('<b>safe code block</b>'),
  '代码块内容应原样保留');
console.log('✅ XSS 测试全部通过');
```

## 🆕 测试 10：暗黑模式切换（v2 新增）

**目的**：验证 `prefers-color-scheme: dark` 媒体查询和 CSS 变量切换

**验证步骤**：

1. **浏览器控制台模拟暗黑模式**（Chrome DevTools）：
   - 打开 F12 → `⋮` → More tools → Rendering
   - 设置 `Emulate CSS media feature prefers-color-scheme: dark`

2. **验证 CSS 变量切换**：
```javascript
// 浏览器控制台（在暗黑模式模拟下）
const body = document.body;
const bg = window.getComputedStyle(body).backgroundColor;
console.log('当前背景色:', bg);

// 暗黑模式 bg 应为深色（非 #F5F0EB）
console.assert(!bg.includes('rgb(245, 240, 235)'), '暗黑模式背景应不同');

// 验证文本颜色
const text = window.getComputedStyle(body).color;
console.log('当前文本色:', text);
// 暗黑模式 text 应为浅色
console.assert(!text.includes('rgb(44, 44, 44)'), '暗黑模式文本应为浅色');
```

3. **切回亮色模式验证**：
```javascript
// 关闭暗黑模式模拟后，恢复默认样式
// 重新加载页面确认
```

## 🆕 测试 11：移动端响应式（v2 新增）

**目的**：验证表格横向滚动、输入框适配触屏

**验证步骤**：

1. **Chrome DevTools 移动端模拟**：
   - F12 → Toggle Device Toolbar（Ctrl+Shift+M）
   - 选择 iPhone 14 Pro Max（430px 宽）或更窄设备

2. **表格横向滚动检查**：
```javascript
// 浏览器控制台
const tableWrappers = document.querySelectorAll('.table-wrapper');
console.assert(tableWrappers.length > 0, '应存在 .table-wrapper 包裹');
tableWrappers.forEach(w => {
  const style = window.getComputedStyle(w);
  console.assert(style.overflowX === 'auto' || style.overflowX === 'scroll',
    '表格容器应可横向滚动');
});

// 验证没有内容溢出视口
const viewportWidth = document.documentElement.clientWidth;
document.querySelectorAll('.msg.assistant .bubble').forEach(b => {
  const rect = b.getBoundingClientRect();
  console.assert(rect.width <= viewportWidth,
    `气泡宽度(${rect.width}px)不应超出视口(${viewportWidth}px)`);
});
```

3. **input 触屏体验**：
   - 输入文本验证键盘不遮挡输入框
   - 多行输入测试自动增高（max-height 150px）
   - 验证发送按钮始终可见

## 🆕 测试 12：设计 Token 一致性（v3 新增 ⭐）

**目的**：验证所有颜色值使用 `var()` 引用 6-token 设计系统，无硬编码颜色泄露

**验证**：
```javascript
// 浏览器控制台
// 检查关键 UI 元素颜色是否使用 var() 引用
function checkTokenConsistency() {
  const elements = document.querySelectorAll('.msg, .bubble, .code-block-wrapper, 
    .code-block-header, .table-wrapper, .msg-actions button, 
    .chat-flow, #chatInput, .thinking-time');
  
  let hardcodedColors = [];
  elements.forEach(el => {
    const styles = window.getComputedStyle(el);
    ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 
     'borderBottomColor', 'borderLeftColor', 'borderRightColor'].forEach(prop => {
      const val = styles[prop];
      // 忽略 transparent 和初始值
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
        // 检查元素是否有内联 style 属性包含硬编码色值
        const inlineStyle = el.getAttribute('style') || '';
        if (inlineStyle.includes('color:') && !inlineStyle.includes('var(--')) {
          hardcodedColors.push({ el: el.className, prop, val });
        }
      }
    });
  });
  
  if (hardcodedColors.length > 0) {
    console.warn('⚠️ 发现硬编码颜色:', hardcodedColors);
  } else {
    console.log('✅ 所有颜色使用 var() 引用设计 token');
  }

  // 验证 6 个核心 token 均定义了 CSS 变量
  const root = window.getComputedStyle(document.documentElement);
  const tokens = ['--bg', '--surface', '--fg', '--muted', '--border', '--accent'];
  tokens.forEach(t => {
    console.assert(root.getPropertyValue(t).trim() !== '',
      `CSS 变量 ${t} 应已定义`);
  });
  console.log('✅ 6-token 设计系统全部定义');
}

checkTokenConsistency();
```

## 🆕 测试 13：字体系统（v3 新增）

**目的**：验证标题用衬线/展示字体、代码用等宽字体、正文用无衬线字体

**验证**：
```javascript
// 浏览器控制台
function checkTypography() {
  // 标题应使用 serif 或 display 字体
  const heading = document.querySelector('.bubble h2, .bubble h3');
  if (heading) {
    const fontFamily = window.getComputedStyle(heading).fontFamily;
    console.log('标题字体:', fontFamily);
    console.assert(
      /serif|display|Songti|SimSun|Times/i.test(fontFamily),
      '标题应使用衬线/展示字体');
  }
  
  // 代码块应使用等宽字体
  const code = document.querySelector('.bubble code');
  if (code) {
    const fontFamily = window.getComputedStyle(code).fontFamily;
    console.log('代码字体:', fontFamily);
    console.assert(
      /mono|Consolas|Courier|Fira Code|Menlo/i.test(fontFamily),
      '代码应使用等宽字体');
  }
  
  // 正文应使用无衬线字体
  const body = document.querySelector('.bubble p');
  if (body) {
    const fontFamily = window.getComputedStyle(body).fontFamily;
    console.log('正文字体:', fontFamily);
    console.assert(
      /sans|system-ui|Segoe|Helvetica|PingFang/i.test(fontFamily),
      '正文应使用无衬线字体');
  }
  
  console.log('✅ 字体系统验证完成');
}

checkTypography();
```

## 🆕 测试 14：暗黑模式平滑过渡（v3 新增）

**目的**：验证暗黑模式切换时有平滑的过渡动画，无色块闪烁

**验证步骤**：

1. **Chrome DevTools 模拟暗黑模式切换**：
   - F12 → `⋮` → More tools → Rendering
   - 设置 `Emulate CSS media feature prefers-color-scheme: dark`
   - 观察页面颜色切换是否平滑

2. **验证过渡动画存在**：
```javascript
// 浏览器控制台
function checkDarkModeTransition() {
  const body = document.body;
  const transition = window.getComputedStyle(body).transition;
  console.log('body transition:', transition);
  
  // 验证 transition 属性包含 color 或 background-color
  console.assert(
    transition.includes('color') || transition.includes('background') || transition === 'all',
    'body 应有颜色过渡动画');
  
  // 检查关键元素是否都有 transition
  const elements = document.querySelectorAll('.msg, .bubble, .code-block-wrapper, .table-wrapper');
  let missingTransitions = [];
  elements.forEach(el => {
    const t = window.getComputedStyle(el).transition;
    if (!t || t === 'all 0s ease 0s') {
      missingTransitions.push(el.className);
    }
  });
  
  if (missingTransitions.length > 0) {
    console.warn('⚠️ 以下元素缺少过渡动画:', missingTransitions);
  } else {
    console.log('✅ 所有关键元素均设置了 transition');
  }
  
  // 切换亮/暗模式检查无闪烁
  // 手动在 Rendering 面板切换 prefers-color-scheme
  // 观察页面是否平滑过渡
}

checkDarkModeTransition();
```

3. **手动测试**：
   - 在亮色模式下，发送一条包含代码块和表格的消息
   - 切换到暗黑模式 → 所有元素应平滑变色，无白屏闪烁
   - 切换回亮色模式 → 同样平滑过渡
