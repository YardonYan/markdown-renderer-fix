# 安全提醒

> 作者：Yardon | Markdown 渲染安全

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

```javascript
const raw = marked.parse(userInput);
const clean = DOMPurify.sanitize(raw, {
  ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
    'strong','em','del','a','code','pre','blockquote','table','thead',
    'tbody','tr','th','td','img','span','div','hr'],
  ALLOWED_ATTR: ['href','src','class','id','target','alt','title'],
  ALLOW_DATA_ATTR: false
});
container.innerHTML = clean;
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

## CSP 策略建议

`connect-src` 是 SSE 流式输出必需的 — 浏览器默认会阻止非本域的 fetch/EventSource 连接。
缺少 `connect-src` 会导致 SSE 请求被 CSP 拦截，用户看到"网络错误"而非正常响应。

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
  script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com cdn.jsdelivr.net;
  img-src 'self' data:;
  connect-src 'self';
  font-src 'self' cdn.jsdelivr.net;">
```

| 指令 | 作用 | 缺失后果 |
|------|------|---------|
| `connect-src 'self'` | 允许 fetch/SSE/WebSocket 连接本域 | SSE 流式请求被阻塞 |
| `font-src cdn.jsdelivr.net` | 允许加载 KaTeX 字体 | 公式字体不加载 |
| `script-src cdnjs.cloudflare.com cdn.jsdelivr.net` | 允许加载 marked/highlight.js/KaTeX/Mermaid | 所有 CDN 脚本被禁 |
| `style-src cdnjs.cloudflare.com cdn.jsdelivr.net` | 允许加载 highlight.js/KaTeX CSS | 高亮/公式样式丢失 |

## 安全检查清单

- [ ] 用户输入的 Markdown 是否经过净化？
- [ ] `innerHTML` 赋值前是否通过 DOMPurify？
- [ ] 是否禁用了 `javascript:` 协议链接？
- [ ] 是否限制了 `data:` URI？
- [ ] 是否配置了 CSP 头？
