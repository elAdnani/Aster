# Architecture

```text
Browser / installed PWA
        │ same-origin HTTP + streamed NDJSON
        ▼
Aster local server (127.0.0.1 by default)
        │ Ollama native chat API
        ▼
Ollama → Gemma 4 12B or another local model
```

The local server owns canonical conversation persistence in `data/conversations.json`; writes use a temporary file and atomic rename. Browser storage is a resilience fallback when the conversation API cannot be reached. The server also acts as the narrow same-origin adapter to Ollama.

Later versions may migrate the store to encrypted SQLite and add workspace tools behind a capability boundary. The UI must never call inference engines, shells or filesystem APIs directly. Every sensitive capability belongs behind a permission check, workspace boundary and audit event.
