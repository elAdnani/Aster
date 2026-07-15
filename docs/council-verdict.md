# Product council verdict — 2026-07-15

## Agreement

The five intended surfaces are one product, not five codebases: a local service plus a responsive installable PWA. Model names must be configurable. Remote access and local tools are the highest-risk capabilities and cannot ship casually.

## Tension

Feature parity with ChatGPT/Codex is attractive, but a shallow clone would undermine trust. The product should first make private local conversation exceptionally easy, then add project actions only with scoped permissions and visible diffs.

## Recommendation

Ship a dependable chat vertical slice around Ollama and Gemma 4 12B. Bind to loopback, keep remote access opt-in, and postpone shell/filesystem actions until a security model and sandbox exist.

## First action

Make clone → model → first streamed response work in under ten minutes.
