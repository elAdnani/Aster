# Claude Code collaboration brief

You are reviewing **Aster Local**, an Apache-2.0 local-first AI workspace. Read `PRODUCT.md`, `DESIGN.md`, `SECURITY.md` and `README.md` before suggesting changes.
Also read `RULES.md`. Its profile isolation and anti-surveillance requirements are non-negotiable.

## Current objective

Protect the v0.1 vertical slice: responsive PWA, Ollama streaming, browser-local history, configurable Gemma model, loopback-only server. Do not add shell/filesystem tools or public networking without an explicit security design.

## Review lenses shared from the Codex workflow

- Load `.claude/skills/design-taste-frontend/SKILL.md` for frontend creation or redesign work.
- Contrarian: find scope, privacy and security failures.
- First principles: optimize for user control, not feature parity.
- Executor: prefer a tested end-to-end path over scaffolding.
- UI craft: strong defaults, responsive touch behavior, reduced motion, no decorative friction.
- Open source: easy first run, legible architecture, no bundled weights or telemetry.

When Claude Code becomes available, review the implementation independently, record findings in `docs/claude-review.md`, and make no destructive changes.
