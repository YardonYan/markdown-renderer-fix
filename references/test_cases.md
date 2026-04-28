# 测试案例

> 作者：Yardon | 8 个核心验证案例

## 测试 1：中文基础

**输入**：`"你好世界"`

**预期**：AI 回复中所有中文字符正常显示，无 `���` 或 `�`

**验证**：
```bash
# 后端检查：SSE 输出中不应有 U+FFFD
curl -s -N -X POST http://127.0.0.1:18765/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"你好世界","session_id":"test1"}' \
  --max-time 30 2>&1 | grep -o '\\ufffd' | wc -l
# 输出应为 0

# 前端检查：浏览器控制台
const text = document.querySelector('.msg.assistant .bubble').textContent;
console.assert(!text.includes('�'), '不应包含 U+FFFD');
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
const hasChinese = /[一-鿿]/.test(bubble.textContent);
console.assert(hasPython && hasChinese, '应同时包含中英文');
console.assert(!bubble.textContent.includes('�'), '不应有乱码');
// 检查英文单词完整性（不应出现 "Pyt hon" 这种断裂）
const pythonIndex = bubble.textContent.indexOf('Python');
console.assert(pythonIndex > -1, 'Python 应完整显示');
```

## 测试 3：Markdown 表格

**输入**：`"用表格对比 Python 和 JavaScript"`

**预期**：表格有边框、对齐正确、斑马纹

**验证**：
```javascript
// 浏览器控制台
const table = document.querySelector('.msg.assistant .bubble table');
console.assert(table, '应存在 <table> 元素');
const thead = table.querySelector('thead');
const tbody = table.querySelector('tbody');
console.assert(thead, '应有 <thead>');
console.assert(tbody, '应有 <tbody>');
// 检查斑马纹（偶数行应有背景色）
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
// 测试复制功能
copyBtn.click();
setTimeout(async () => {
  const clipboard = await navigator.clipboard.readText();
  console.assert(clipboard.trim().length > 0, '剪贴板应有内容');
  console.assert(copyBtn.textContent.includes('已复制'), '按钮应变为已复制');
}, 500);
// 检查语法高亮
const code = wrapper.querySelector('code');
console.assert(code.querySelector('.hljs-keyword') || code.className.includes('hljs'),
  '应有语法高亮');
```

## 测试 5：数学公式

**输入**：`"写欧拉公式"`

**预期**：KaTeX 渲染 `$e^{i\pi} + 1 = 0$`

**验证**：
```javascript
// 浏览器控制台
const katexEl = document.querySelector('.katex');
console.assert(katexEl, '应存在 .katex 元素（公式已渲染）');
// 或者检查公式文本存在于页面中
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
const messages = document.querySelectorAll('.msg');
const userMsgs = document.querySelectorAll('.msg.user');
const assistantMsgs = document.querySelectorAll('.msg.assistant');
console.assert(userMsgs.length >= 2, `应有至少 2 条用户消息，实际: ${userMsgs.length}`);
console.assert(assistantMsgs.length >= 2, `应有至少 2 条 AI 回复，实际: ${assistantMsgs.length}`);
// 检查无报错
const bubbles = document.querySelectorAll('.msg.assistant .bubble');
bubbles.forEach(b => {
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
// 1. 打字机效果：消息内容应在增加
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

// 2. 完成后检查
// const finalText = document.querySelector('.msg.assistant:last-child .bubble').textContent;
// console.assert(finalText.length > 100, `长文本应 >100 字，实际: ${finalText.length}`);
// 3. 检查无卡顿（页面未冻结）
// console.assert(document.visibilityState === 'visible', '页面应可交互');
```

## 测试 8：工具调用过滤

**输入**：任意问题（如 `"什么是 Python？"`）

**预期**：回复中无内部系统输出泄露

**验证**：
```javascript
// 浏览器控制台
const allBubbles = document.querySelectorAll('.msg.assistant .bubble');
allBubbles.forEach(b => {
  const html = b.innerHTML;
  const text = b.textContent;
  console.assert(!text.includes('save_qa_to_knowledge_base'), '不应泄露工具名称');
  console.assert(!html.includes('<function='), '不应泄露 function 标签');
  console.assert(!text.includes('Record ID'), '不应泄露 Record ID');
  console.assert(!text.includes('Answer record saved'), '不应泄露保存日志');
  console.assert(!text.includes('自动保存至知识库'), '不应泄露中文日志');
  console.assert(!text.includes('Supabase'), '不应泄露数据库名称');
  // 检查 JSON 工具调用块被过滤
  console.assert(!html.includes('"tool_calls"'), '不应泄露 tool_calls JSON');
});
// 额外验证：打开 F12 Network → 查看 /api/chat/stream 的 Response
// 确认原始 SSE 数据中也不包含以上内容
```
