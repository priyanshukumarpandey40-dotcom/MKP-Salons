# MKP-Salons — Website AI Chatbot

This project provides a starter chatbot for business websites:

1. Ingest a website URL.
2. Extract on-page text/headings.
3. Let customers ask questions answered from that site content.

## Quick start

```bash
npm install
cp .env.example .env
# set OPENAI_API_KEY in .env
npm start
```

Open `http://localhost:3000`.

## API

### `POST /api/ingest`

```json
{ "url": "https://example.com" }
```

### `POST /api/chat`

```json
{ "url": "https://example.com", "question": "What services do you provide?" }
```

## Notes

- This is a lightweight starter implementation.
- Data is stored in memory (`Map`), so restart clears ingested pages.
- For production, add persistence, stronger crawling, and auth/rate limiting.
