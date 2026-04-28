---
name: markdown-renderer-fix
description: |
  【强制触发·最高优先级·前后端编码问题】凡是涉及 Markdown 渲染、SSE 流式输出、
  中文乱码、代码块高亮、Mermaid 图表、KaTeX 公式、工具调用过滤等前端展示问题，
  必须读取本 skill，严禁凭记忆猜测参数。

  ## 为什么强制

  中文乱码表面简单，实际涉及前后端 **8 个编码转换点**。凭经验只改一处往往无法根治：
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
---

# Markdown 渲染与中文乱码修复

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

## 常见错误速查

| 现象 | 根因 | 修复 | 参考 |
|------|------|------|------|
| `���单来说` | tiktoken 单 token 解码不完整 UTF-8 | `enc.decode(all_tokens)` 一次性解码 | encoding_fix.md |
| `</function>` 泄露 | 前端过滤遗漏 | `cleanToolOutput()` 大小写不敏感匹配 | markdown_render.md |
| 第二次提问卡住 | `#streamingMsg` ID 未清理 | `removeAttribute('id')` | frontend_sse.md |
| SSE 超时 | 后端未定期 ping | 每 15s `yield b"data: [PING]\n\n"` | backend_sse.md |
| 代码块无复制 | 未生成 `.copy-btn` | `renderMarkdown` 中自动注入 | markdown_render.md |

## 快速诊断

```bash
# 测试 SSE 原始输出中是否有 � (U+FFFD)
curl -s -N -X POST http://127.0.0.1:18765/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","session_id":"debug"}' --max-time 30 2>&1 \
  | grep -o '\\\\ufffd' | wc -l

# 运行编码诊断脚本
python scripts/diagnose_encoding.py --test-text "你好世界"
```

## 参考文档索引

| 文档 | 内容 | 何时阅读 |
|------|------|---------|
| [encoding_fix.md](references/encoding_fix.md) | 中文乱码专项：8 点排查 + tiktoken 根因 | 看到 `�` 时 |
| [backend_sse.md](references/backend_sse.md) | 后端 SSE：FastAPI/Django/Flask | 开发 SSE 端点时 |
| [frontend_sse.md](references/frontend_sse.md) | 前端 SSE：消费 + 超时 + 重连 | 开发前端 SSE 时 |
| [markdown_render.md](references/markdown_render.md) | Markdown：渲染 + 过滤 + DOMPurify | 格式/html 问题时 |
| [framework_adaptation.md](references/framework_adaptation.md) | 框架适配：React/Vue/Angular/Svelte | 使用框架时 |
| [performance.md](references/performance.md) | 性能：增量渲染 + 节流 + 虚拟滚动 | >5000 字卡顿时 |
| [security.md](references/security.md) | 安全：XSS + DOMPurify + CSP | 上线前检查 |
| [test_cases.md](references/test_cases.md) | 8 个验证测试案例 | 修复后验证 |
| [troubleshooting.md](references/troubleshooting.md) | 6 步骤排查手册 | 所有方法无效时 |

## 完整模板

[assets/chat_template.html](assets/chat_template.html) — 包含所有修复的生产级聊天界面模板

## 安装与使用

### 安装

```bash
# 复制到 OpenClaw skills 目录
cp -r markdown-renderer-fix ~/.qclaw/skills/
```

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
