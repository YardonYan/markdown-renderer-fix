# 后端 SSE 实现指南 / Backend SSE Implementation Guide

> 🇬🇧 EN: FastAPI/Django/Flask SSE endpoints, ping/keep-alive, reverse proxy configs (nginx/Caddy/Traefik/HAProxy/AWS/Cloudflare).
> 🇨🇳 ZH: FastAPI/Django/Flask SSE 端点、保活心跳、反向代理配置（nginx/Caddy/Traefik/HAProxy/AWS/Cloudflare 六方）。


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
        # 每个 chunk 24 字符：流式流畅度与网络包数量之间的平衡点。
        # 24 字符 ≈ 平均 3 个 token（cl100k_base 约 8 字符/token）。
        # 输出较快的模型可增大到 48-64；较慢的思考型模型建议保持 24。
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
        # 同 FastAPI 示例，24 字符分块在流畅度与包数间取平衡
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
        for i in range(0, len(answer), 24):  # 同 FastAPI 注释
            chunk = json.dumps(answer[i:i+24])
            yield f"data: {chunk}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"

    return Response(
        stream_with_context(event_generator()),
        mimetype="text/event-stream; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

> ⚠️ 生产环境建议使用 Gunicorn + gevent/eventlet worker，而非 threading。

### Flask（原始版本 — 仅示意）

```python
from flask import Response, stream_with_context
import json

@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    result_queue = queue.Queue()

    def run_agent():
        try:
            answer = _extract_answer(agent_invoke_blocking())
            result_queue.put(("ok", answer))
        except Exception as e:
            result_queue.put(("error", str(e)))

    thread = threading.Thread(target=run_agent, daemon=True)
    thread.start()

    def event_generator():
        yield b"data: [PING]\n\n"
        while thread.is_alive():
            thread.join(timeout=15.0)
            if thread.is_alive():
                yield b"data: [PING]\n\n"
        try:
            status, data = result_queue.get_nowait()
            if status == "error":
                yield f"data: [ERROR] {data}\n\n".encode("utf-8")
                return
            answer = data
        except queue.Empty:
            yield b"data: [ERROR] 回答生成失败\n\n"
            return
        for i in range(0, len(answer), 24):  # 同 FastAPI 注释
            chunk = json.dumps(answer[i:i+24])
            yield f"data: {chunk}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"

    return Response(
        stream_with_context(event_generator()),
        mimetype="text/event-stream; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

> ⚠️ 生产环境建议使用 Gunicorn + gevent/eventlet worker，而非 threading。

### Flask（原始版本 — 仅示意）

```python
from flask import Response, stream_with_context
import json

## 保活信号的三个作用

1. 防止代理/负载均衡器因无活动关闭连接（nginx 默认 60s 超时）
2. 前端收到后重置超时计时器（防止误判超时）
3. 确认连接存活，用户知道系统在工作

## 反向代理/负载均衡器 SSE 兼容性

### nginx
```nginx
location /api/chat/stream {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;           # ← 禁用缓冲（SSE 核心配置）
    proxy_cache off;
    proxy_read_timeout 180s;       # 长连接超时
    chunked_transfer_encoding on;
}
```
> `X-Accel-Buffering: no` 响应头作为补充（见各框架示例）。

### Caddy
SSE 默认兼容。Caddy 不缓冲流式响应，无需额外配置。
若使用 reverse_proxy，确认超时足够：
```caddy
reverse_proxy localhost:8000 {
    transport http {
        read_timeout 180s
    }
}
```

### Traefik
```yaml
# docker-compose labels
labels:
  - "traefik.http.middlewares.sse-buffering.buffering.maxRequestBodyBytes=0"
  - "traefik.http.routers.api.middlewares=sse-buffering"
```

### HAProxy
```haproxy
backend sse_backend
    option http-buffer-request   # 仅缓冲请求，不缓冲响应
    timeout server 180s
    timeout tunnel 3600s
```

### AWS ALB
- 默认不缓冲 HTTP/1.1 分块响应 → ✅ 兼容
- Idle timeout 默认 60s → 需要后端每 <60s 发送 `[PING]`
- 建议将 target group 的 deregistration_delay.timeout_seconds 设为 ≥180s

### Cloudflare
- **Free/Pro 计划**：代理模式下默认缓冲 SSE → ❌ 不兼容
- **Enterprise 计划**：可联系支持开启 `real-time communication`
- **解决方案**：将 SSE 端点设为 DNS-only（灰色云朵，绕过代理）

### GCP Cloud Run / Cloud Functions
- 响应流式需要 `--allow-unauthenticated` 或正确的 IAM
- Cloud Run 最大请求超时 3600s（v2）→ ✅ 兼容

## 多 worker 环境注意事项

- **Gunicorn/Uvicorn workers > 1**：SSE 连接可能落在不同 worker，确保无状态（用 Redis 等共享存储）
- **建议**：SSE 端点用单个 worker 处理，或使用 `--worker-class uvicorn.workers.UvicornWorker`

## _extract_answer 接口说明

`_extract_answer(agent_result)` 将 Agent/CrewAI 返回结果转换为纯文本回答。
该函数需要开发者根据实际 Agent 框架实现。

```python
def _extract_answer(agent_result) -> str:
    """从 Agent 执行结果中提取文本回答。

    Args:
        agent_result: Agent 任务返回值。格式取决于使用的 Agent 框架。
    Returns:
        str: 纯文本回答内容，将用于 SSE 流式输出。

    CrewAI 示例:
        return agent_result.raw if hasattr(agent_result, 'raw') else str(agent_result)

    OpenAI Agent SDK 示例:
        return agent_result.final_output if hasattr(agent_result, 'final_output') else str(agent_result)

    兜底:
        return str(agent_result)
    """
    return str(agent_result)
```

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
