# Aster Local — Product brief

## Promise

**Votre IA, vos fichiers, votre machine — accessible partout quand vous le décidez.**

Aster Local is an open-source, local-first AI workspace. It starts as a fast private chat for Gemma 4 through Ollama, then grows into a permissioned project assistant inspired by the best habits of ChatGPT and Codex.

## Users and job

People who want a capable everyday assistant without sending conversations or project files to a third party. Their first job is to install Aster in under ten minutes, see that it is local, and get a streamed answer from their chosen model.

## Principles

1. Local and private by default; remote access is explicit.
2. Aster account for identity and profiles; local content and no telemetry by default.
3. One responsive product before separate native clients.
4. Model and inference-provider agnostic.
5. Every tool, folder and network capability is permissioned.
6. Great defaults, reversible actions, transparent state.

## MVP

- Responsive installable PWA.
- Ollama detection and model selection.
- Streaming chat with local browser history.
- Gemma 4 12B default, configurable.
- Loopback-only server; optional bearer token foundation.
- No command execution or filesystem access in v0.1.

## Not yet

Native mobile apps, autonomous agents, cloud sync, public port exposure, unsandboxed shell, plugins, voice and collaboration.

## Planned household and admin layer

- Up to three authenticated accounts per installation, with up to four administrator, personal, work, child or guest profiles per account.
- Separate histories, rules, allowed skills, model policies and optional PIN locks.
- Cloud identity is required in the consumer release, but conversation content remains local by default.
- Administrator-controlled model catalogue with storage impact visible before download.
- Per-application network routes for the future desktop client: direct by default, optional Proton VPN, an existing system VPN, a user-provided VPN/proxy, or Tor SOCKS5.
- Never install, activate or recommend a VPN as mandatory. Proton is an optional convenience, not a product dependency.
- Never market Tor or VPN routing as “traceless”; DNS leaks and application bypasses must be tested and blocked.
