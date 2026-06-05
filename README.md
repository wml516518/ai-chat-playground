# AI Chat Playground

A full-stack AI chat playground built with React, Vite, TypeScript, Python, and FastAPI.

## Features

- Streaming chat responses
- Prompt presets
- Temperature and max-token controls
- Local conversation persistence
- FastAPI backend proxy for OpenAI-compatible APIs
- Netlify frontend deployment
- Render backend deployment

## Default Model

The backend defaults to an OpenAI-compatible DeepSeek configuration:

```env
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-V4-flash
```

Set `OPENAI_API_KEY` on Render. Do not expose it in the frontend.

## Local Development

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Deployment

Frontend goes to Netlify from `frontend/`.

Backend goes to Render from `backend/`.
