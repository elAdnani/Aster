# ✦ Aster Local

Your AI, your files, your machine — available everywhere only when you decide.

Aster Local is an open-source, local-first AI workspace inspired by the ease of ChatGPT and the project mindset of Codex. Version 0.1 is a deliberately safe vertical slice: a polished installable web app, streamed conversations, persistent local history and an Ollama adapter with `gemma4:12b` as the default.

## Run it

Requirements: Node.js 20+, [Ollama](https://ollama.com/) and enough memory for the model you choose.

```powershell
ollama pull gemma4:12b
npm.cmd start
```

Open `http://127.0.0.1:4317`. No package installation is required for this MVP.

## Privacy and remote access

The server binds to `127.0.0.1` by default. Conversation history is stored in `data/conversations.json`, with browser storage as an offline fallback. Aster has no analytics and makes no cloud request; only the configured Ollama endpoint is contacted.

The interface supports renaming and deleting conversations, stopping a generation, importing/exporting JSON, selecting a model and installing itself as a PWA. `data/` is ignored by Git.

Do not expose the port directly to the Internet. For remote use, prefer a private network such as Tailscale and set a strong `ASTER_REMOTE_TOKEN`. A guided, audited remote-access flow is planned before this feature is advertised as production-ready.

## Roadmap

- v0.1: local chat, streaming, PWA, model selection, privacy foundation.
- v0.2: encrypted SQLite migration, attachments and conversation search.
- v0.3: workspace-scoped read/edit with diffs and explicit approvals.
- v0.4: sandboxed commands, action log and reversible checkpoints.
- v0.5: desktop shell and guided authenticated private-network access.

See [PRODUCT.md](./PRODUCT.md), [SECURITY.md](./SECURITY.md), and [CONTRIBUTING.md](./CONTRIBUTING.md).

Installation and privacy contracts: [docs/installation.md](./docs/installation.md) and [RULES.md](./RULES.md).

Account hierarchy, admin catalogs and hardware capacity presets are specified in [docs/accounts-and-capacity.md](./docs/accounts-and-capacity.md).

## License

Apache License 2.0. Model weights have their own terms and are never bundled.
