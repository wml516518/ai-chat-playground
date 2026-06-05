from fastapi.testclient import TestClient

from app.main import app


def test_chat_rejects_empty_messages():
    client = TestClient(app)

    response = client.post("/api/chat", json={"messages": []})

    assert response.status_code == 422


def test_chat_streams_friendly_error_without_api_key():
    client = TestClient(app)

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "temperature": 0.7,
            "max_tokens": 800,
        },
    )

    assert response.status_code == 200
    assert "OPENAI_API_KEY is not configured" in response.text
