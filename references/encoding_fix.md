# 中文乱码专项修复指南

> 作者：Yardon | 基于实战修复经验编写

## 快速诊断

```bash
curl -N -X POST http://127.0.0.1:18765/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","session_id":"debug"}' --max-time 30 2>&1 | grep -o '\\ufffd' | wc -l
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
| 7 | **后端 Agent 输出** | 打印后端 `repr(chunk)` | **最常见根因** |
| 8 | Windows 环境 | `sys.stdout.encoding` | `PYTHONIOENCODING=utf-8` |

## 根因：tiktoken 单 token 解码

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

```python
import json
from fastapi.responses import StreamingResponse

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    async def event_generator():
        yield b"data: [PING]\n\n"

        agent_task = asyncio.create_task(_agent_invoke(messages, session_id))
        while not agent_task.done():
            done, _ = await asyncio.wait({agent_task}, timeout=15.0)
            if not agent_task.done():
                yield b"data: [PING]\n\n"

        answer = extract_answer(agent_task.result())
        for i in range(0, len(answer), 24):
            chunk = json.dumps(answer[i:i+24])
            yield f"data: {chunk}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream; charset=utf-8",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive",
                 "X-Accel-Buffering": "no"},
    )
```

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
