from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=800, ge=64, le=4096)
    preset: str = Field(default="general", max_length=80)


class HealthResponse(BaseModel):
    status: str
    model: str
