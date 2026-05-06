# 浏览器兼容性与 CDN / Browser Compatibility & CDN

> 🇬🇧 EN: Browser support matrix, CDN availability, fallback strategies, domestic mirror recommendations.
> 🇨🇳 ZH: 浏览器兼容矩阵、CDN 可用性、渐进增强降级策略、国内镜像推荐。


> 作者：Yardon | 兼容性矩阵与已知限制

## 最低版本要求

| 浏览器 | 最低版本 | 发布年份 | 关键特性支持 |
|:-------|:--------:|:--------:|:------------|
| **Chrome** | 90+ | 2021 | ReadableStream, Clipboard API, AbortController, CSS variables |
| **Firefox** | 88+ | 2021 | ReadableStream, AbortController, CSS variables |
| **Safari** | 14+ | 2020 | CSS variables, AbortController；ReadableStream 15.4+ |
| **Edge** | 90+ | 2021 | 与 Chrome 一致（Chromium 内核） |

> 推荐使用近 2 年内发布的浏览器版本以确保最佳体验。

## 特性依赖表

| 功能 | Chrome | Firefox | Safari | 备注 |
|:-----|:------:|:-------:|:------:|:-----|
| `ReadableStream` + `getReader()` | ✅ 90+ | ✅ 102+ | ⚠️ 15.4+ | 流式消费核心，Safari 需稍高版本 |
| `TextDecoder('utf-8', {stream})` | ✅ 90+ | ✅ 88+ | ✅ 14+ | 无重大兼容问题 |
| `AbortController` | ✅ 90+ | ✅ 88+ | ✅ 14+ | 全局支持良好 |
| `navigator.clipboard.writeText()` | ✅ 90+ | ✅ 90+ | ⚠️ 13.1+ | Safari < 13.1 用 fallback |
| `DOMPurify` | ✅ | ✅ | ✅ | 纯 JS 库，理论全兼容 |
| `marked.js` | ✅ | ✅ | ✅ | 同上 |
| `highlight.js` | ✅ | ✅ | ✅ | 同上 |
| `KaTeX` | ✅ | ✅ | ✅ | 同上 |
| `Mermaid` | ✅ | ✅ | ✅ | 同上 |
| CSS `@media (prefers-color-scheme)` | ✅ 76+ | ✅ 67+ | ✅ 12.1+ | 所有主流支持 |
| CSS Variables | ✅ 49+ | ✅ 31+ | ✅ 9.1+ | 广泛支持 |
| `fetch()` + streaming body | ✅ 90+ | ✅ 88+ | ⚠️ 15.4+ | 见下方 Safari 说明 |

## 各浏览器已知限制

### Safari

| 限制 | 影响 | 解决方案 |
|:-----|:-----|:---------|
| `ReadableStream` 仅 Safari 15.4+ 支持 | 旧版 Safari 无法消费 SSE 流 | polyfill 或降级到轮询 |
| `navigator.clipboard` 需要用户手势 | 自动复制失败 | 已实现 `execCommand('copy')` fallback |
| `<input type="color">` 行为差异 | 暗黑模式颜色选择器 | 不影响核心功能 |
| WebP 图片支持需要 Safari 14+ | 图片可能不显示 | 使用 JPEG/PNG fallback |

### Firefox

| 限制 | 影响 | 解决方案 |
|:-----|:-----|:---------|
| `ReadableStream` 部分支持（FF 102+ 完整） | FF 88-101 SSE 可能异常 | 建议升级至 102+ |
| `:has()` 选择器需要 FF 121+ | CSS 中 `:has()` 不生效 | 避免使用 `:has()` |
| 事件处理器中 `event` 全局变量弃用 | 旧代码 `.onclick="fn(event)"` 可能失效 | 使用 `(e) =>` 或事件监听器 |

### Chrome / Edge

无明显限制。Chrome 最早实现 ReadableStream（v43+），是所有功能的最佳运行环境。

## 移动端浏览器

| 浏览器 | 版本要求 | 特殊说明 |
|:-------|:--------:|:---------|
| **iOS Safari** | 14+ | ReadableStream 需要 15.4+；PWA 模式下无浏览器 UI |
| **Android Chrome** | 90+ | 与桌面 Chrome 一致 |
| **Samsung Internet** | 15+ | 基于 Chromium，兼容性好 |
| **UC Browser** | — | ⚠️ 不推荐，内核过旧，缺少诸多 API |
| **WeChat 内置浏览器** | — | ⚠️ 基于系统 WebView（iOS 用 WKWebView，Android 用 Chromium），体验依赖系统版本 |

## CDN 可用性

| CDN 资源 | 域名 | 国内访问 | 建议 |
|:---------|:-----|:--------:|:-----|
| marked.js | cdnjs.cloudflare.com | ⚠️ 不稳定 | 国内部署用 BootCDN 或自建 |
| highlight.js | cdnjs.cloudflare.com | ⚠️ 不稳定 | 同上 |
| DOMPurify | cdnjs.cloudflare.com | ⚠️ 不稳定 | 同上 |
| KaTeX | cdn.jsdelivr.net | ⚠️ 不稳定 | 可用 npm 安装或 CN 镜像 |
| Mermaid | cdn.jsdelivr.net | ⚠️ 不稳定 | 同上 |

> 国内用户建议将所有 CDN 依赖替换为国内镜像（如 BootCDN、Staticfile CDN）或自托管，避免加载超时。已实现 CDN 降级检测：3 秒后未加载完成显示提示。

## 浏览器检测（可选）

```javascript
const ua = navigator.userAgent;
const browser = {
  chrome: /Chrome\/(\d+)/.exec(ua),
  firefox: /Firefox\/(\d+)/.exec(ua),
  safari: /Version\/(\d+).*Safari/.exec(ua),
  edge: /Edg\/(\d+)/.exec(ua),
};

function checkCompatible() {
  const minVersions = { chrome: 90, firefox: 88, safari: 15.4, edge: 90 };
  for (const [b, v] of Object.entries(minVersions)) {
    if (browser[b] && parseInt(browser[b][1]) < v) {
      console.warn(`${b} ${browser[b][1]} 低于推荐的 ${v}，部分功能可能异常`);
    }
  }
}
```

## 渐进增强策略

```
优先级 1（核心）：标记渲染 + 代码高亮 → 所有浏览器必须支持
优先级 2（重要）：SSE 流式 + 暗黑模式 → 不支持时降级显示
优先级 3（增强）：KaTeX + Mermaid → 不支持时保留原始文本
优先级 4（辅助）：Clipboard API → 不支持时用 fallback
```
