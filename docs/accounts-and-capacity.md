# Accounts, profiles and capacity

## Product hierarchy

```text
Aster installation
└── up to 3 signed-in accounts
    └── up to 4 profiles per account
        ├── private conversations and files
        ├── model, rule and skill policy
        └── optional session PIN
```

An Aster cloud account is required for the final consumer product. Local inference and conversation content remain on the host by default. The cloud identity service stores the minimum required identity and entitlement data; it must not receive local prompts, answers or files.

The limits are maximums, not targets. Hardware recommendations may suggest fewer active profiles or less concurrency, but the owner may override them after seeing the estimated memory impact.

## Account and profile boundaries

- Maximum three accounts registered to one installation.
- Maximum four profiles under each account.
- An account authenticates against the Aster identity service.
- A profile is a private local workspace under that account.
- Each account session may require a PIN on the device in addition to account authentication.
- A profile switch never reveals conversation titles or previews before unlock.
- Administrators configure capabilities, not private content.

## Capacity profiles

### Essential

- One active inference request.
- One loaded model where possible.
- Shorter default context.
- Best for 8-16 GB RAM, integrated GPUs, large models, or battery use.

### Balanced

- Up to two parallel requests for the same model when memory permits.
- Queue overflow instead of crashing or swapping heavily.
- Best for 24-32 GB RAM or smaller quantized models.

### Performance

- Up to four parallel requests when VRAM/RAM estimates pass.
- Multiple loaded models only when each fits safely.
- Best for workstations with substantial VRAM and system memory.

These presets map to runtime controls such as `OLLAMA_NUM_PARALLEL`, `OLLAMA_MAX_LOADED_MODELS`, context length and queue size. The UI must estimate memory before applying a change, retain a manual override, and provide a one-click safe rollback.

## Admin catalog

Free-text allowlists are not the final interface. The administrator receives three catalogs:

1. **Models**: discover, inspect license/size/quantization, download, pause, remove, load and allow per profile.
2. **Skills**: source, permissions, version, signature/hash, enablement and profile assignment.
3. **Rule packs**: readable Markdown rules with inheritance, preview, conflicts and profile assignment.

Downloads are explicit. Model weights are never duplicated by Aster, and the storage destination is configurable.

## Required backend work

- Cloud identity adapter and account entitlements.
- Local encrypted account/profile database.
- Memory-hard PIN/password hashes and recovery.
- Profile-scoped encryption keys and server-side authorization.
- Runtime capacity probe and load estimator.
- Queue scheduler with per-profile fairness and cancellation.
- Catalog APIs with signed metadata and download progress.

