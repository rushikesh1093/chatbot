# Agrofarm Chatbot Frontend

React + Vite client for multilingual chat, speech-to-text, and text-to-speech.

## Features

- Multi-language chat UI
- Voice input (speech recognition)
- Voice output (speech synthesis)
- Backend-driven RAG chat responses

## Environment

Create or update `.env` in this folder:

```env
VITE_API_BASE_URL=http://localhost:9000
```

## Run Frontend

```bash
npm install
npm run dev
```

The frontend calls `POST /chat` on the backend configured through `VITE_API_BASE_URL`.

For backend setup and ingestion steps, see `../Backend/README.md`.
