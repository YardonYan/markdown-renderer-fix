# 后端 SSE 实现指南

> 作者：Yardon | FastAPI / Django / Flask 三框架适配

## FastAPI（推荐）

```python
import json, asyncio
from fastapi.responses import StreamingResponse

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    if not req.session_id:
        req.session_id = str(uuid.uuid4())

    agent_task = asyncio.create_task(_agent_invoke(req.message, req.session_id))

    async def event_generator():
        yield b"data: [PING]\n\n"  # 立即保活

        max_wait, waited = 180.0, 0.0
        while not agent_task.done() and waited < max_wait:
            done, _ = await asyncio.wait({agent_task}, timeout=15.0)
            waited += 15.0
            if not agent_task.done():
                yield b"data: [PING]\n\n"

        if not agent_task.done():
            agent_task.cancel()
            yield b"data: [ERROR] 回答生成超时\n\n"
            return

        answer = _extract_answer(agent_task.result())
        for i in range(0, len(answer), 24):
            chunk = json.dumps(answer[i:i+24])
            yield f"data: {chunk}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
        },
    )
```

## Django

```python
from django.http import StreamingHttpResponse
import json

def chat_stream(request):
    def event_generator():
        yield b"data: [PING]\n\n"
        # ... agent logic ...
        for i in range(0, len(answer), 24):
            chunk = json.dumps(answer[i:i+24])
            yield f"data: {chunk}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"

    return StreamingHttpResponse(
        event_generator(),
        content_type="text/event-stream; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

## Flask

```python
from flask import Response, stream_with_context
import json

@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    def event_generator():
        yield b"data: [PING]\n\n"
        # ... agent logic (use threading for non-blocking) ...
        for i in range(0, len(answer), 24):
            chunk = json.dumps(answer[i:i+24])
            yield f"data: {chunk}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"

    return Response(
        stream_with_context(event_generator()),
        mimetype="text/event-stream; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

## 保活信号的三个作用

1. 防止代理/负载均衡器因无活动关闭连接（nginx 默认 60s 超时）
2. 前端收到后重置超时计时器（防止误判超时）
3. 确认连接存活，用户知道系统在工作

## 多 worker 环境注意事项

- **Gunicorn/Uvicorn workers > 1**：SSE 连接可能落在不同 worker，确保无状态（用 Redis 等共享存储）
- **建议**：SSE 端点用单个 worker 处理，或使用 `--worker-class uvicorn.workers.UvicornWorker`

## json.dumps 编码规范

**为什么必须用**：SSE 帧以 `\n\n` 分隔。内容中的 `\n`、`"`、`\` 会破坏帧格式。
`json.dumps` 自动处理所有转义：

```python
>>> json.dumps("hello\nworld")
'"hello\\nworld"'        # \n 被正确转义
>>> json.dumps('say "hi"')
'"say \\"hi\\""'          # " 被正确转义
>>> json.dumps("你好")
'"\\u4f60\\u597d"'        # 中文 → \\uXXXX（ASCII-safe）
```
