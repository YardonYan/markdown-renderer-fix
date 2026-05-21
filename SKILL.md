---
name: markdown-renderer-fix
description: |
  [v3.0.0] [EN] Mandatory trigger for Markdown rendering, SSE streaming, Chinese garbled text,
  code highlighting, Mermaid diagrams, KaTeX formulas, and tool-call output filtering.
  Do NOT guess parameters from memory — always load this skill.

  [ZH] 【强制触发·最高优先级·前后端编码问题】凡是涉及 Markdown 渲染、SSE 流式输出、
  中文乱码、代码块高亮、Mermaid 图表、KaTeX 公式、工具调用过滤等前端展示问题，
  必须读取本 skill，严禁凭记忆猜测参数。

  ## 为什么强制

  中文乱码表面简单，实际涉及前后端**数据流依次经过 8 个阶段**。凭经验只改一处往往无法根治：
  1. 后端 tiktoken 解码 → 2. Python str → 3. json.dumps 转义 → 4. `.encode('utf-8')`
  5. HTTP 传输 → 6. 前端 `reader.read()` → 7. `TextDecoder` → 8. `marked.parse()`
  任一环节出错即乱码。本 skill 基于多次实战修复经验，提供系统排查方案。

  ## 触发场景（满足任一即触发，无豁免）

  1. 中文显示为 `���` 或 `�` 等乱码字符
  2. SSE 流式输出异常（不流式、中断、重复输出）
  3. Markdown 格式未正确渲染（标题、表格、列表、代码块等）
  4. 代码块无复制按钮或无语法高亮
  5. 数学公式（KaTeX）或 Mermaid 图表未渲染
  6. 连续对话第二次无响应
  7. 工具调用输出（如 `save_qa_to_knowledge_base`）泄露到用户界面

metadata:
  openclaw:
    emoji: "📝"
od:
  mode: tool
  platform: all
  scenario: encoding-rendering
  triggers:
    - "Markdown rendering"
    - "SSE streaming"
    - "Chinese garbled text"
    - "code highlighting"
    - "Mermaid diagrams"
    - "KaTeX formulas"
    - "tool-call output filtering"
    - "encoding fix"
    - "乱码"
    - "渲染"
    - "高亮"
    - "公式"
---

# Markdown 渲染与中文乱码修复
# Markdown Rendering & Chinese Encoding Fix

> 🇨🇳 **中文** | 🇬🇧 **English** — 本 Skill 全文档提供中英双语。
> This skill provides bilingual documentation throughout.

> 作者：Yardon | 基于多次实战修复经验

## 决策树

```
看到乱码？
├─ 是 ��� 型？（1 汉字 → 3 个 �）
│  └─ → 方向 A：SSE 流式解码 + tiktoken 单 token 解码
│     详见 references/encoding_fix.md
├─ 是 锟斤拷 型？
│  └─ → 方向 B：GBK/UTF-8 混用
│     详见 references/encoding_fix.md
└─ 不是乱码，但格式有问题？
   ├─ Markdown 未渲染    → references/markdown_render.md
   ├─ 代码块无高亮       → references/markdown_render.md
   ├─ 公式/图表不显示    → references/markdown_render.md
   ├─ SSE 流不工作       → references/backend_sse.md + frontend_sse.md
   ├─ 连续对话无响应     → references/frontend_sse.md
   └─ 性能卡顿          → references/performance.md

框架项目？
├─ React    → references/framework_adaptation.md
├─ Vue      → references/framework_adaptation.md
├─ Angular  → references/framework_adaptation.md
└─ Svelte   → references/framework_adaptation.md
```

## 8 方向快速修复

| # | 现象 | 快速修复 | 详细文档 |
|---|------|---------|---------|
| A | `���` 乱码 | `new TextDecoder('utf-8')` + 后端全量解码 | encoding_fix.md |
| B | SSE 不流式 | 后端 `charset=utf-8` + `json.dumps` | backend_sse.md |
| C | Markdown 未渲染 | 检查 `marked.parse()` 输入是否已乱码 | markdown_render.md |
| D | 代码块无高亮 | `hljs.highlightElement()` | markdown_render.md |
| E | 连续对话无响应 | 清理 `#streamingMsg` ID + 重置 abortCtl | frontend_sse.md |
| F | 工具调用泄露 | `cleanToolOutput()` 正则过滤 | markdown_render.md |
| G | 公式/图表不显示 | 检查 KaTeX delimiters / Mermaid init | markdown_render.md |
| H | 性能卡顿 | debounce 50ms / rAF 节流 | performance.md |

> 💡 更多参考：
> - 浏览器兼容性矩阵 → [browser_support.md](references/browser_support.md)
> - 无障碍访问（ARIA、键盘快捷键、色对比度）→ [accessibility.md](references/accessibility.md)
> - 修复后验证（11 个测试案例）→ [test_cases.md](references/test_cases.md)

## Fix Pattern Catalog / 修复模式目录

> Each pattern follows: **Symptom → Root Cause → Fix (1-liner) → Reference**
> 每种模式遵循：**症状 → 根因 → 一行修复 → 参考文档**

### Pattern A: tiktoken U+FFFD Fix / tiktoken U+FFFD 修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | Chinese characters display as `���` (1 Chinese char → 3 �) |
| **Root Cause / 根因** | tiktoken decodes tokens one-by-one, splitting multi-byte UTF-8 sequences — incomplete byte sequences get replaced with U+FFFD |
| **Fix (1-liner)** | `text = enc.decode(all_tokens)` — decode all tokens at once instead of one-by-one |
| **Reference / 参考** | [encoding_fix.md](references/encoding_fix.md) |

### Pattern B: SSE Non-Streaming Fix / SSE 非流式修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | SSE endpoint waits and returns full response at once instead of streaming |
| **Root Cause / 根因** | Missing `charset=utf-8` in Content-Type, reverse proxy buffering, or `json.dumps` without `ensure_ascii=False` |
| **Fix (1-liner)** | Set `Content-Type: text/event-stream; charset=utf-8` + disable proxy buffering |
| **Reference / 参考** | [backend_sse.md](references/backend_sse.md) |

### Pattern C: Markdown Not Rendering Fix / Markdown 未渲染修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | Raw Markdown syntax visible (`# Title`, `**bold**`, `- list`) instead of formatted HTML |
| **Root Cause / 根因** | Input to `marked.parse()` is already garbled or `marked.parse()` not called at all |
| **Fix (1-liner)** | Verify `marked.parse(input)` receives clean UTF-8 text; call `marked.parse()` after DOM insertion |
| **Reference / 参考** | [markdown_render.md](references/markdown_render.md) |

### Pattern D: Code Block No Highlighting Fix / 代码块无高亮修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | Code blocks render but without syntax colors |
| **Root Cause / 根因** | `hljs.highlightElement()` not called after Markdown rendering, or Highlight.js not loaded |
| **Fix (1-liner)** | `document.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el))` |
| **Reference / 参考** | [markdown_render.md](references/markdown_render.md) |

### Pattern E: Consecutive Chat No Response Fix / 连续对话无响应修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | First message works fine; second message stuck with no response |
| **Root Cause / 根因** | `#streamingMsg` element ID not cleaned after first completion; AbortController not reset |
| **Fix (1-liner)** | `el.removeAttribute('id')` after stream ends + `abortCtl = new AbortController()` |
| **Reference / 参考** | [frontend_sse.md](references/frontend_sse.md) |

### Pattern F: Tool Call Output Leak Fix / 工具调用输出泄露修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | Raw tool call output (e.g., `</function>`, `save_qa_to_knowledge_base`) visible in chat UI |
| **Root Cause / 根因** | Backend tool-call responses not filtered before sending to client |
| **Fix (1-liner)** | `cleanToolOutput(text)` — regex filter with case-insensitive matching on tool call patterns |
| **Reference / 参考** | [markdown_render.md](references/markdown_render.md) |

### Pattern G: Formula/Diagram Not Displaying Fix / 公式/图表不显示修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | KaTeX formulas show raw LaTeX; Mermaid diagrams show raw code |
| **Root Cause / 根因** | KaTeX delimiters not configured or render not triggered; Mermaid `mermaid.run()` not called after DOM update |
| **Fix (1-liner)** | KaTeX: `renderMathInElement(el, {delimiters: [...]})`; Mermaid: `await mermaid.run({querySelector: '.mermaid'})` |
| **Reference / 参考** | [markdown_render.md](references/markdown_render.md) |

### Pattern H: Performance Stuttering Fix / 性能卡顿修复

| Item | Detail |
|------|--------|
| **Symptom / 现象** | UI freezes or stutters during fast SSE streaming (>50 tokens/sec) |
| **Root Cause / 根因** | Every token triggers full re-render (DOM update + Markdown parse + highlight) |
| **Fix (1-liner)** | Debounce 50ms or throttle via `requestAnimationFrame`; render in batches of 80+ chars |
| **Reference / 参考** | [performance.md](references/performance.md) |

## 常见错误速查

| 现象 | 根因 | 修复 | 参考 |
|------|------|------|------|
| `���单来说` | tiktoken 单 token 解码不完整 UTF-8 | `enc.decode(all_tokens)` 一次性解码 | encoding_fix.md |
| `</function>` 泄露 | 前端过滤遗漏 | `cleanToolOutput()` 大小写不敏感匹配 | markdown_render.md |
| 第二次提问卡住 | `#streamingMsg` ID 未清理 | `removeAttribute('id')` | frontend_sse.md |
| SSE 超时 | 后端未定期 ping | 每 15s `yield b"data: [PING]\n\n"` | backend_sse.md |
| 代码块无复制 | 未生成 `.copy-btn` | `renderMarkdown` 中自动注入 | markdown_render.md |
| 移动端布局溢出 | 表格无横向滚动容器 | `.table-wrapper { overflow-x: auto }` | browser_support.md |
| 屏幕阅读器无反馈 | 缺少 ARIA live regions | `role="log"` + `aria-live="polite"` | accessibility.md |
| CDN 资源加载失败 | 国内网络限制 | 替换为 BootCDN / Staticfile 镜像 | browser_support.md |

## Quality Checklist / 质量检查清单

> Use this checklist to audit any chat UI template or Markdown renderer implementation.
> 使用此检查清单审计任何聊天 UI 模板或 Markdown 渲染实现。

### P0 — Must Pass / 必须通过

- [ ] **Charset declarations**: `<meta charset="UTF-8">` in HTML head, `Content-Type: text/event-stream; charset=utf-8` in SSE response headers
- [ ] **TextDecoder utf-8**: `new TextDecoder('utf-8')` explicitly declared (not default-reliant)
- [ ] **DOMPurify enabled**: All `innerHTML` assignments pass through `DOMPurify.sanitize()`
- [ ] **Tool output filtered**: `cleanToolOutput()` applied to all streaming content before rendering
- [ ] **StreamingMsg ID cleaned**: `#streamingMsg` element has its `id` attribute removed after each stream completion
- [ ] **No raw innerHTML**: No direct `element.innerHTML = userContent` calls without sanitization

### P1 — Should Pass / 应该通过

- [ ] **CDN fallback configured**: Multiple CDN mirrors configured for Highlight.js, KaTeX, Mermaid, Marked (BootCDN / Staticfile / cdnjs fallback chain)
- [ ] **Mobile responsive**: All layouts adapt to viewport; table wrappers use `overflow-x: auto`; font sizes scale
- [ ] **Keyboard shortcuts**: Enter to send, Shift+Enter for newline, Ctrl+Enter for send, Escape to cancel/focus
- [ ] **ARIA live regions**: Chat message container has `role="log"` and `aria-live="polite"` for screen reader streaming
- [ ] **Lazy loading**: Images use `loading="lazy"` and `decoding="async"` attributes

### P2 — Nice to Have / 锦上添花

- [ ] **Dark mode**: System-preference dark mode via `prefers-color-scheme` media query with manual toggle
- [ ] **Virtual scrolling**: For chat histories >50 messages, use virtual list rendering to maintain performance
- [ ] **CSP headers**: Content-Security-Policy headers configured to restrict inline scripts and external resources

## Anti-Patterns / 反模式

> Common mistakes and their correct alternatives. Each "Don't" is a real-world bug we've encountered.
> 常见错误及其正确替代方案。每个"不要"都是我们遇到过的真实 Bug。

| ❌ Don't / 不要 | ✅ Do / 应该 | Why / 原因 |
|:----------------|:-------------|:-----------|
| `new TextDecoder()` without `'utf-8'` | `new TextDecoder('utf-8')` | Default encoding varies by browser; some default to windows-1252 |
| Decode tokens one-by-one | `enc.decode(all_tokens)` — batch decode | Single tokens split multi-byte UTF-8 sequences → U+FFFD (�) |
| `el.innerHTML = text` without DOMPurify | `el.innerHTML = DOMPurify.sanitize(text)` | XSS attack vector — user/AI content can contain malicious scripts |
| `TextDecoder.decode(chunk)` without `{stream: true}` | `decoder.decode(chunk, {stream: true})` | Without `stream: true`, incomplete multi-byte chars at chunk boundaries are lost |
| Leave `#streamingMsg` ID after completion | `el.removeAttribute('id')` after stream ends | Second message cannot find target element → no response |
| Display raw `tool_call` output to users | `cleanToolOutput(text)` filter before rendering | Tool call XML/JSON leaks into chat UI, confusing users |
| Use `file://` protocol for SSE | Serve via HTTP (`http://localhost` or HTTPS) | SSE requires HTTP protocol; file:// has no streaming support |
| Ignore `prefers-reduced-motion` | `@media (prefers-reduced-motion: reduce) { ... }` disable animations | Accessibility violation — users with motion sensitivity need reduced motion |

## Design System / 设计系统

> v3.0.0 introduces a 6-token design system for consistent visual identity across all templates.
> v3.0.0 引入 6 令牌设计系统，为所有模板提供一致的视觉识别。

### Color Tokens / 色彩标记

```css
:root {
  --bg:      #f8f9fb;  /* page background */
  --surface: #ffffff;  /* card/module surface */
  --fg:      #1a1a2e;  /* primary text */
  --muted:   #6b7280;  /* secondary text / captions */
  --border:  #e5e7eb;  /* subtle borders / dividers */
  --accent:  #4a90d9;  /* blue accent for tech/encoding context */
}
```

### Typography Scale / 字体层级

| Tier | Family | Usage | CSS |
|:-----|:-------|:------|:----|
| **Display** | Serif (`Georgia, "Noto Serif SC", serif`) | Hero titles, major headings | `font-family: Georgia, "Noto Serif SC", serif;` |
| **Body** | Sans (`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`) | Body text, messages, labels | `font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;` |
| **Mono** | Monospace (`"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace`) | Code blocks, inline code, technical data | `font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;` |

### Spacing Scale / 间距层级

```css
:root {
  --gap-xs:  6px;     /* 6px  — inline gaps */
  --gap-sm:  12px;    /* 12px — compact padding */
  --gap-md:  20px;    /* 20px — standard padding */
  --gap-lg:  32px;    /* 32px — section spacing */
  --gap-xl:  56px;    /* 56px — major section separation */
}
```

## Version History / 版本历史

| Version | Date | Highlights / 更新亮点 |
|:--------|:-----|:----------------------|
| **v3.0.0** | 2026-05 | Design system upgrade, Fix Pattern Catalog (8 numbered patterns), Quality Checklist (P0/P1/P2), Anti-Patterns documentation, Open Design integration |
| **v2.0.0** | 2026-05 | Initial public release — 11 reference docs, production chat template, demo gallery, cross-framework adapters, 6 reverse proxy configs |
| **v1.0.0** | 2026-05 | Internal release — core encoding fix patterns and diagnostic scripts |

## 快速诊断

> ⚠️ **演示与生产分离**：
> - `assets/index.html` 为纯前端示范页面，无需后端即可浏览
> - `assets/chat_template.html` 为生产级聊天模板（SSE 流式消费 + 会话管理），需要后端 SSE 端点
> 如需持久化对话历史：
> - **localStorage**：存储 `{sessionId, messages[]}`，刷新后恢复
> - **服务端会话管理**：用户登录后绑定 session_id，刷新后查询历史
> - **URL 参数**：`?session=xxx` 可跨标签页共享

```bash
# 测试 SSE 原始输出中是否有 � (U+FFFD) — Linux/macOS
curl -s -N -X POST http://127.0.0.1:18765/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","session_id":"debug"}' --max-time 30 2>&1 \
  | grep -a -o $'\xef\xbf\xbd' | wc -l

# Windows PowerShell 等价
(Invoke-WebRequest -Uri http://127.0.0.1:18765/api/chat/stream -Method POST `
  -Body '{"message":"hi","session_id":"debug"}' -ContentType "application/json").Content `
  | Select-String -Pattern "\ufffd" | Measure-Object | Select-Object -ExpandProperty Count

# 运行编码诊断脚本（跨平台）
python scripts/diagnose_encoding.py --test-text "你好世界"
```

## 参考文档索引

### 📚 阅读顺序建议

```
新人入门：
  SKILL.md（你在这里）→ index.html（看示范效果）→ troubleshooting.md（学排查）

乱码排查：
  SKILL.md 决策树 → encoding_fix.md（tiktoken/GBK 双根因）→ backend_sse.md（端点实现）

功能实现：
  chat_template.html（生产级参考）→ markdown_render.md（API 说明）→ performance.md（优化）
  → frontend_sse.md（SSE 消费）→ security.md（上线前安全审计）

演示浏览：
  index.html（无需后端，直接打开浏览器查看 Markdown 渲染效果）

框架集成：
  framework_adaptation.md（React/Vue/Angular/Svelte 四选一）

质量保证：
  test_cases.md（11 个验证）→ accessibility.md（A11y）→ browser_support.md（兼容性矩阵）
```

> ⚠️ 内容冲突时以 **chat_template.html（生产代码）** 和 **backend_sse.md（后端示例）** 为准。
> 其余文档为说明和补充用途。

| 文档 | 内容 | 何时阅读 |
|------|------|---------|
| [encoding_fix.md](references/encoding_fix.md) | 中文乱码专项：8 点排查 + tiktoken 根因 | 看到 `�` 时 |
| [backend_sse.md](references/backend_sse.md) | 后端 SSE：FastAPI/Django/Flask | 开发 SSE 端点时 |
| [frontend_sse.md](references/frontend_sse.md) | 前端 SSE：消费 + 超时 + 重连 | 开发前端 SSE 时 |
| [markdown_render.md](references/markdown_render.md) | Markdown：渲染 + 过滤 + DOMPurify | 格式/html 问题时 |
| [framework_adaptation.md](references/framework_adaptation.md) | 框架适配：React/Vue/Angular/Svelte | 使用框架时 |
| [performance.md](references/performance.md) | 性能：增量渲染 + 节流 + 虚拟滚动 | >5000 字卡顿时 |
| [security.md](references/security.md) | 安全：XSS + DOMPurify + CSP | 上线前检查 |
| [test_cases.md](references/test_cases.md) | 11 个验证测试案例（含 XSS 和暗黑模式） | 修复后验证 |
| [troubleshooting.md](references/troubleshooting.md) | 6 步骤排查手册 | 所有方法无效时 |
| [accessibility.md](references/accessibility.md) | 无障碍访问：ARIA live regions + 键盘快捷键 | 提升可访问性时 |
| [browser_support.md](references/browser_support.md) | 浏览器兼容性矩阵与已知限制 | 部署前验收 |

## 完整模板

- [assets/chat_template.html](assets/chat_template.html) — 生产级聊天界面模板（含 SSE 流式消费）
- [assets/index.html](assets/index.html) — Markdown 渲染效果示范页面（卡片式画廊，点击展开）

## 安装与使用

### 安装

```bash
# 复制到 OpenClaw skills 目录（当前版本 v3.0.0）
cp -r markdown-renderer-fix ~/.qclaw/skills/
```

> 📦 **Current version: v3.0.0** — See [Version History / 版本历史](#version-history--版本历史) for details.

### 自动触发

当遇到 Markdown 渲染或中文乱码问题时，OpenClaw 根据 SKILL.md 的 description 自动加载本 Skill。

### 手动诊断

```bash
# 全面诊断（环境 + tiktoken + 框架 + 依赖 + 实际 SSE）
python scripts/diagnose_encoding.py --full

# 测试实际 SSE 端点
python scripts/diagnose_encoding.py --real-sse --endpoint http://127.0.0.1:18765/api/chat/stream

# 指定测试文本
python scripts/diagnose_encoding.py --test-text "你好世界" --full
```

### 快速修复检查清单

- [ ] 前端 `TextDecoder('utf-8')` 已配置 → 见 encoding_fix.md
- [ ] 后端 SSE `charset=utf-8` 已设置 → 见 backend_sse.md
- [ ] HTML `<meta charset="UTF-8">` 已声明 → 见 encoding_fix.md
- [ ] 后端 Agent 输出无 `�`（`print(repr(chunk))` 检查） → 见 encoding_fix.md
- [ ] `marked.parse()` 输入文本无乱码 → 见 markdown_render.md
- [ ] `#streamingMsg` ID 每次完成后清理 → 见 frontend_sse.md
- [ ] 工具调用输出被过滤 → 见 markdown_render.md
