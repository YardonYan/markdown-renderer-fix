# 安全提醒 / Security Advisory

> 🇬🇧 EN: XSS prevention, DOMPurify sanitization, CSP headers, dangerous protocol filtering.
> 🇨🇳 ZH: XSS 防护、DOMPurify 净化、CSP 配置、危险协议过滤。


> 作者：Yardon | Markdown 渲染安全
>
> ✅ **文档与代码已同步**（v3，2026-05-06）：以下所有防护方案均已在 `chat_template.html` 和 `demo.html` 中实现。

## XSS 风险

`marked.parse()` 默认允许 HTML 标签通过。恶意用户可能注入 `<script>` 或 `<img onerror>`。

```markdown
<!-- 攻击示例 -->
<script>alert('XSS')</script>
[click me](javascript:alert('XSS'))
<img src=x onerror="alert('XSS')">
```

## 防护方案

### 方案 A：DOMPurify（推荐）

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
```

**基础用法**：

```javascript
const raw = marked.parse(userInput);
const clean = DOMPurify.sanitize(raw, {
  ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
    'strong','em','del','a','code','pre','blockquote','table','thead',
    'tbody','tr','th','td','img','span','div','hr','input'], // v3: 添加 input 支持 Markdown 任务列表
  ALLOWED_ATTR: ['href','src','class','id','target','alt','title'],
  ALLOW_DATA_ATTR: false
});
container.innerHTML = clean;
```

**过滤 javascript: 协议链接** — 通过 DOMPurify 钩子移除危险协议：

```javascript
// 必须在初始化时注册，全局生效
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

**使用 ALLOWED_URI_REGEXP 限制协议**（推荐配置，当前模板未启用，可手动添加）：

```javascript
const clean = DOMPurify.sanitize(raw, {
  ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  // 仅允许 http: https: mailto: 等安全协议
  // 注意：此配置需与 afterSanitizeAttributes 钩子配合使用
```

### 方案 B：marked sanitize（已废弃，不推荐）

```javascript
// marked v0.x had sanitize: true — removed in v1+
// 不要依赖此选项
```

### 方案 C：框架内置

| 框架 | 防护机制 |
|------|---------|
| react-markdown | 默认不渲染 HTML，需显式启用 `rehype-raw` |
| vue-markdown-render | 默认转义 |
| Angular DomSanitizer | 自动净化 |

## CSP 策略

### 当前策略（含 `unsafe-inline`）

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
  script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net;
  img-src 'self' data:;
  connect-src 'self';
  font-src 'self' cdn.jsdelivr.net;">
```

### ⚠️ `unsafe-inline` 风险

| 风险等级 | 风险说明 |
|:--------:|:---------|
| 🔴 高 | `script-src 'unsafe-inline'` 允许内联 `<script>` 和事件处理器（`onclick=`），XSS 攻击者可注入恶意脚本 |
| 🟡 中 | `style-src 'unsafe-inline'` 允许内联 `<style>` 和 `style=` 属性，可能被用于 CSS 注入攻击（窃取数据、界面欺骗） |
| 🟢 低 | 如果已部署 DOMPurify 且正确配置，内联样式风险可控 |

### 迁移路径

#### 方案 A：使用 Nonce（需后端支持）

后端每个请求生成唯一 nonce，前端在 CSP 和 script/style 标签中使用。

```python
# 后端（FastAPI 示例）
import secrets
nonce = secrets.token_hex(16)
```

```html
<!-- CSP 头 -->
<meta content="script-src 'self' 'nonce-{nonce}' cdnjs.cloudflare.com cdn.jsdelivr.net;
               style-src 'self' 'nonce-{nonce}' cdnjs.cloudflare.com cdn.jsdelivr.net;">
<!-- 内联脚本使用 nonce -->
<script nonce="{nonce}">/* ... */</script>
<style nonce="{nonce}">/* ... */</style>
```

#### 方案 B：提取内联脚本为外部文件

```
assets/
  chat_template.html    → 仅 HTML 结构
  js/
    markdown_render.js  → renderMarkdown() 等
    sse_consumer.js     → SSE 流式消费
    message_actions.js  → 消息操作按钮
  css/
    chat_style.css      → 所有样式
```

修改后的 CSP（更安全）：

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
  script-src 'self' cdnjs.cloudflare.com cdn.jsdelivr.net;
  style-src 'self' cdnjs.cloudflare.com cdn.jsdelivr.net;
  img-src 'self' data:;
  connect-src 'self';
  font-src 'self' cdn.jsdelivr.net;">
```

### CSP 指令表

| 指令 | 作用 | 缺失后果 |
|------|------|---------|
| `connect-src 'self'` | 允许 fetch/SSE/WebSocket 连接本域 | SSE 流式请求被阻塞 |
| `font-src cdn.jsdelivr.net` | 允许加载 KaTeX 字体 | 公式字体不加载 |
| `script-src cdnjs.cloudflare.com cdn.jsdelivr.net` | 允许加载 marked/highlight.js/KaTeX/Mermaid | 所有 CDN 脚本被禁 |
| `style-src cdnjs.cloudflare.com cdn.jsdelivr.net` | 允许加载 highlight.js/KaTeX CSS | 高亮/公式样式丢失 |

## 安全检查清单

- [ ] 用户输入的 Markdown 是否经过 DOMPurify 净化？
- [ ] `innerHTML` 赋值前是否通过 DOMPurify.sanitize()？
- [ ] 是否注册了 afterSanitizeAttributes 钩子过滤 javascript: 协议？
- [ ] 是否配置了 ALLOWED_URI_REGEXP 限制链接协议？
- [ ] 是否禁用了 `data:` URI？
- [ ] 是否配置了 CSP 头？
- [ ] 是否规划了 `unsafe-inline` 的迁移路径（nonce 或外部文件）？
