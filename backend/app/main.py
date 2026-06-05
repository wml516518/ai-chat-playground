from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.openai_client import stream_chat_completion
from app.schemas import ChatRequest, HealthResponse
from app.settings import Settings, get_settings


def create_app() -> FastAPI:
    app = FastAPI(title="AI Chat Playground API")
    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins or ["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", response_model=HealthResponse)
    async def health(current: Settings = Depends(get_settings)) -> HealthResponse:
        return HealthResponse(status="ok", model=current.openai_model)

    @app.post("/api/chat")
    async def chat(request: ChatRequest, current: Settings = Depends(get_settings)) -> StreamingResponse:
        return StreamingResponse(
            stream_chat_completion(request, current),
            media_type="text/event-stream",
        )

    return app


app = create_app()
