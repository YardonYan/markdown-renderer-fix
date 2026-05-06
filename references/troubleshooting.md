# 问题排查手册 / Troubleshooting Manual

> 🇬🇧 EN: 6-step escalation flow, common error patterns, diagnostic commands.
> 🇨🇳 ZH: 6 步逐层排查流程、常见错误模式、诊断命令。


> 作者：Yardon | 6 步骤逐层排查

## 快速诊断

```bash
# 1. 测试 SSE 原始输出
curl -N -X POST http://127.0.0.1:18765/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","session_id":"debug"}' \
  --max-time 30 2>&1 | head -30

# 2. 检查是否有 �
curl ... | grep -o '\\\\ufffd' | wc -l

# 3. 运行编码诊断
python scripts/diagnose_encoding.py --test-text "你好世界"
```

## 逐步骤排查

### Step 1: 定位乱码源头

```
curl 输出中有 �？
├─ 是 → 问题在后端（tiktoken/Agent/SSE 编码），继续 Step 2
└─ 否 → 问题在前端（TextDecoder/Markdown/渲染），跳到 Step 4
```

### Step 2: 后端 — tiktoken 排查

```python
# 在 _token_stream 中添加调试日志
import json as _json
tokens = enc.encode_ordinary(text)
full = enc.decode(tokens)
_logger.debug(f"[SSE-DEBUG] tokens={len(tokens)}, full={repr(full[:100])}")

# 检查是否有 �
if '�' in full:
    _logger.error("[SSE-DEBUG] ❌ 全量解码包含 U+FFFD！")

# 检查逐个解码
for tid in tokens[:10]:
    single = enc.decode([tid])
    if '�' in single:
        _logger.error(f"[SSE-DEBUG] ❌ 单 token {tid} 解码包含 U+FFFD: {repr(single)}")
```

### Step 3: 后端 — json.dumps 排查

```python
# 验证 json.dumps 往返
chunk = "你好世界"
encoded = json.dumps(chunk)
decoded = json.loads(encoded)
assert chunk == decoded, f"Mismatch: {repr(chunk)} != {repr(decoded)}"
```

### Step 4: 前端 — 检查 SSE 解码

```javascript
// 在浏览器控制台
const decoder = new TextDecoder('utf-8');

// ✅ 推荐：使用 TextEncoder 构建测试字节（语言无关）
const testText = '你好';  // 替换为任意 Unicode 文本（日语: あ, 韩语: 한）
console.log(decoder.decode(new TextEncoder().encode(testText))); // → '你好'

// 备用：硬编码中文 UTF-8 字节
const testBytes = new Uint8Array([0xE4, 0xBD, 0xA0, 0xE5, 0xA5, 0xBD]);
console.log(decoder.decode(testBytes)); // 应输出 "你好"
```

### Step 5: 前端 — 检查 JSON.parse 链路

```javascript
// 模拟后端 json.dumps("你好")
const sseData = '"\\u4f60\\u597d"'; // 或 '"你好"'
console.log(JSON.parse(sseData)); // 应输出 "你好"
```

### Step 6: 前端 — 检查 Markdown 渲染

```javascript
// 在 marked.parse 之前打印
console.log('Before marked:', repr(text));
// 如果 text 包含乱码 → 问题在上游（SSE 解码）
// 如果 text 正常 → 问题在 marked 或渲染
```

## 常见错误及修复

### 错误 1: "编解码往返不一致"
```
➜ 问题：json.dumps + JSON.parse 后的文本与原始不同
➜ 修复：检查中间是否有额外的 encode/decode 操作
```

### 错误 2: "单 token 解码产生 U+FFFD"
```
➜ 问题：enc.decode([tok_id]) 返回包含 � 的文本
➜ 修复：改为 enc.decode(all_tokens) 一次性解码
➜ 文件：app_fastapi.py → _token_stream 函数
```

### 错误 3: "SSE 帧被截断"
```
➜ 问题：前端收到的 data: 行不完整
➜ 修复：检查 json.dumps 是否正确处理 \n、\r、\" 等字符
➜ 确保 media_type 包含 charset=utf-8
```

### 错误 4: "控制事件被当作文本显示"
```
➜ 问题：[DONE]、[PING] 显示在用户界面上
➜ 修复：前端 data.startsWith('[') 判断在 JSON.parse 之前
```

### 错误 5: "连续对话第二个请求无响应"
```
➜ 问题：第二次提问没反应
➜ 检查：isSending 是否被正确重置
➜ 检查：#streamingMsg 的 id 属性是否被清理
➜ 检查：streamAbortCtl 是否被重置为 null
```
