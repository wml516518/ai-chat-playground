import json
from collections.abc import AsyncIterator

import httpx

from app.schemas import ChatRequest
from app.settings import Settings


class ChatUpstreamError(Exception):
    pass


async def stream_chat_completion(request: ChatRequest, settings: Settings) -> AsyncIterator[str]:
    if not settings.openai_api_key:
        yield "event: error\n"
        yield 'data: {"message":"OPENAI_API_KEY is not configured on the backend."}\n\n'
        return

    payload = {
        "model": settings.openai_model,
        "messages": [message.model_dump() for message in request.messages],
        "temperature": request.temperature,
        "max_tokens": request.max_tokens,
        "stream": True,
    }

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code >= 400:
                    detail = await response.aread()
                    raise ChatUpstreamError(detail.decode("utf-8", errors="ignore"))

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line.removeprefix("data: ").strip()
                    if data == "[DONE]":
                        yield "event: done\n"
                        yield "data: {}\n\n"
                        return
                    try:
                        parsed = json.loads(data)
                        delta = parsed["choices"][0].get("delta", {}).get("content", "")
                    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
                        continue
                    if delta:
                        yield "event: token\n"
                        yield f"data: {json.dumps({'content': delta})}\n\n"
    except Exception as exc:
        message = str(exc) or "Upstream chat completion failed."
        yield "event: error\n"
        yield f"data: {json.dumps({'message': message})}\n\n"
