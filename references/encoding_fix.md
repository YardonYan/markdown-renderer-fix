# 中文乱码专项修复 / Chinese Encoding Fix Guide

> 🇬🇧 EN: tiktoken root cause, GBK/UTF-8 mixing, tokenizer compatibility matrix, diagnostic code insertion guide.
> 🇨🇳 ZH: tiktoken 根因分析、GBK/UTF-8 混用、Tokenizer 兼容矩阵、诊断代码插入指引。


> 作者：Yardon | 基于实战修复经验编写

## 快速诊断

```bash
curl -N -X POST http://127.0.0.1:18765/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","session_id":"debug"}' --max-time 30 2>&1 | grep -a -o $'\xef\xbf\xbd' | wc -l
# 输出 > 0 → 后端编码问题，继续排查
# 输出 = 0 → 前端渲染问题
```

## 8 点排查清单

| # | 检查点 | 具体操作 | 修复 |
|---|--------|---------|------|
| 1 | 前端 TextDecoder | 搜索 `new TextDecoder` | `new TextDecoder('utf-8')` |
| 2 | 后端 SSE Content-Type | 检查 FastAPI StreamingResponse | `media_type="text/event-stream; charset=utf-8"` |
| 3 | HTML charset 声明 | 检查 `<head>` | `<meta charset="UTF-8">` |
| 4 | JS 字符串处理 | 搜索 `btoa`/`Blob`/`ArrayBuffer` | 避免用于中文，或添加 UTF-8 解码 |
| 5 | localStorage | 检查存取逻辑 | 直接 `JSON.stringify`/`parse` |     
| 6 | Markdown 输入 | `marked.parse()` 前打 log | 如果输入已乱码，问题在上游 |
| 7 | **后端 Agent 输出** | 打印后端 `repr(chunk)` | **最常见根因** — 见下方 Step 7 详解 |
| 8 | Windows 环境 | `sys.stdout.encoding` | `PYTHONIOENCODING=utf-8` |

### Step 7 详细操作指引

Step 7（最常见根因）需要在后端 Agent 输出处插入诊断代码：

**文件**：`app_fastapi.py`（或等效的后端 SSE 处理文件）
**函数**：`event_generator()` 中的字符分块循环

```python
# ① 分块前：打印完整回答的 repr
answer = _extract_answer(agent_task.result())
print(f"[DIAGNOSE] len={len(answer)}, first80={repr(answer[:80])}")

# ② 每个分块：打印 repr
for i in range(0, len(answer), 24):
    chunk = answer[i:i+24]
    print(f"[DIAGNOSE] chunk [{i}] {repr(chunk)}")  # ← 插入这行
    encoded = json.dumps(chunk)
    yield f"data: {encoded}\n\n".encode("utf-8")
```

**判断标准**：
- `repr(chunk)` 含 `\ufffd` → tiktoken 根因（见下方章节）
- `repr(chunk)` 含 `\\x` 字节序列 → GBK/UTF-8 混用（见 GBK 章节）
- `repr(chunk)` 正常但前端乱码 → TextDecoder / SSE 帧格式问题

## GBK/UTF-8 混用乱码（"锟斤拷" 型）

### 特征
每个汉字显示为 "锟斤拷" 或 "拷斤锟" 等固定汉字组合（而非 ``）。

### 根因
GBK 编码的文本被错误地用 UTF-8 解码。GBK 双字节序列恰好映射到
Unicode CJK 扩展区，呈现出看似有意义的乱码汉字。

```
"你好" (GBK: C4 E3 BA C3)
  UTF-8 误解码 → C4 E3 非合法首字节 → 替换/错位 → "锟斤拷"
```

### 排查
1. 源文件编码：VS Code 状态栏或 `file -i app.py`
2. HTTP Content-Type 是否声明 `charset=gbk` 而非 `utf-8`
3. Python `open()` 是否缺少 `encoding='utf-8'`
4. BeautifulSoup / requests `.text` 是否用错编码推断
5. 数据库 `charset=utf8mb4` 确认

### 修复
- HTML: `<meta charset="UTF-8">`（chat_template.html 已设置）
- SSE: `media_type="text/event-stream; charset=utf-8"`（backend_sse.md 已说明）
- Python I/O: `open(f, 'r', encoding='utf-8')`

## 根因：tiktoken 单 token 解码

### 日韩语同样受影响

日语平假名（U+3040–309F）、片假名（U+30A0–30FF）和韩语谚文（U+AC00–D7AF）
在 UTF-8 中均为 3 字节编码，与中文完全相同。
在 tiktoken 的字节级 BPE 分词下，这些字符同样可能被跨 token 拆分，
导致单个 token 解码为不完整 UTF-8 序列 → U+FFFD。

```
日语「あ」(UTF-8: E3 81 82)
  enc.decode([不含 82 的 token]) → 不完整序列 → ''

韩语「한」(UTF-8: ED 95 9C)
  enc.decode([不含 9C 的 token]) → 不完整序列 → ''
```

修复方案与中文完全一致：`enc.decode(all_tokens)` 一次性解码。
无需为不同语言编写不同的处理逻辑。

### 为什么

cl100k_base 是**字节级** BPE tokenizer。单个 token 可能只包含 1-2 个 UTF-8 字节（半个汉字），
单独解码产生不完整 UTF-8 序列 → Python 返回 `�`（U+FFFD）。

```
"简" (UTF-8: E7 AE 80, 3 bytes)
  tokenizer → [tok_a(E7 AE), tok_b(80)]
  enc.decode([tok_a]) → 不完整序列 → '�'   ← 这是乱码！
  enc.decode([tok_a, tok_b]) → E7 AE 80 → '简'  ← 正确的做法
```

### 错误代码（修复前）

```python
# ❌ 逐个 token 解码
for tok_id in tokens:
    decoded = enc.decode([tok_id])  # → '�'
    batch.append(decoded)
```

### 正确代码（修复后）

```python
# ✅ 一次性解码全部 token，再按字符分块
token_ids = enc.encode_ordinary(text)
full_decoded = enc.decode(token_ids)  # 完整 UTF-8
for i in range(0, len(full_decoded), 24):
    chunk = json.dumps(full_decoded[i:i+24])  # json.dumps 转义特殊字符
    yield f"data: {chunk}\n\n".encode("utf-8")
```

## SSE 编码传输规范

### 为什么用 `json.dumps` 而不是手动转义

| 输入 | 手动转义 | `json.dumps` |
|------|---------|-------------|
| `"hello"` | OK | OK |
| `"line1\nline2"` | 需要 `\\n` | 自动（`"line1\\nline2"`） |
| `'say "hi"'` | 引号破坏帧 | 自动（`"say \\"hi\\""`） |
| `"C:\\path"` | 双重转义 | 自动（`"C:\\\\path"`） |
| `"你好"` | 需单独处理 | 自动（`"\\u4f60\\u597d"`） |

### 后端完整示例

> 完整的 FastAPI / Django / Flask 三框架 SSE 端点实现（含保活信号、超时处理、
> `_extract_answer` 接口定义）详见 **[backend_sse.md](backend_sse.md)**。
>
> 此处仅展示与编码直接相关的核心步骤：

```python
# 一次性解码全部 token（避免逐 token 解码的 U+FFFD）
token_ids = enc.encode_ordinary(text)
answer = enc.decode(token_ids)

# 按字符分块 + json.dumps 转义
for i in range(0, len(answer), 24):
    yield f"data: {json.dumps(answer[i:i+24])}\n\n".encode("utf-8")
```

> 📖 完整端点代码 → [backend_sse.md](backend_sse.md)

## Windows 环境编码强制

```python
import sys, io

# 在启动文件开头
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 或在启动命令中
# PYTHONIOENCODING=utf-8 python app_fastapi.py
```

## Python 文件头编码声明

```python
# -*- coding: utf-8 -*-
```

> 注：Python 3 默认 UTF-8，此声明可省略。但显式声明有助于编辑器正确识别。

## 前端 TextDecoder 关键点

```javascript
// ✅ 正确：显式指定 utf-8 + stream 模式
const decoder = new TextDecoder('utf-8');

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // 处理 chunk...
}

const final = decoder.decode(); // 刷新缓冲区
```

---

## Tokenizer 兼容性说明

本 Skill 的修复方案基于 **tiktoken（cl100k_base）** 字节级 BPE。
不同 tokenizer 的适用性：

| Tokenizer | 代表模型 | 适用性 |
|:----------|:---------|:------|
| cl100k_base / o200k_base | GPT-4/GPT-4o/mini | ✅ 完全适用 |
| Claude BPE (Anthropic) | Claude 3/4 | ⚠️ 原理相似，API 不同 |
| SentencePiece | Gemini 1.5/2.0 | ⚠️ 较少跨 token 拆分 |
| HF tokenizers (BPE) | Llama/Qwen/DeepSeek | ✅ 需适配 API |

**验证方法**：
```python
tokens = tokenizer.encode("你好")
print(repr(tokenizer.decode([tokens[0]])))  # → '\ufffd' 则受影响
```
