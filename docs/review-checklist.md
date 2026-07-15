# Review checklist

Use this checklist for the next joint Codex and Claude Code review.

## Product path

- Fresh start explains how to install and launch Ollama.
- A user can create, resume, rename, export and delete a conversation.
- Streaming can be stopped without losing the partial answer.
- The selected model survives a restart.
- Empty, loading, offline and error states are understandable.

## Local-first guarantees

- The default bind address remains `127.0.0.1`.
- No analytics, CDN, remote font, remote image or cloud request is introduced.
- Conversation data stays under `data/` and is excluded from Git.
- A configured remote token protects every API route.
- No shell or filesystem workspace tool is exposed in this milestone.

## Engineering

- All API inputs have size and shape limits.
- Conversation writes are atomic and malformed data cannot crash startup.
- Streaming cancellation releases upstream resources.
- Narrow mobile layout, keyboard navigation and reduced motion are checked.
- `npm.cmd test` and `git diff --check` pass.

## Claude Code handoff

Read `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `SECURITY.md` and this checklist. Review independently before proposing edits. Record findings in `docs/claude-review.md` with severity, evidence and a concrete fix.
