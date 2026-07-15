# Security policy

## Implemented authentication baseline

The application now fails closed: business APIs require an authenticated session, the first administrator can only be created from loopback, and conversations are scoped to the active profile on every server query. Passwords use salted scrypt (`N=2^17`, `r=8`, `p=1`); session identifiers are random, revocable, kept server-side and sent only through an `HttpOnly`, `SameSite=Strict` cookie. Administrative model, rule and skill persistence is still a planned server-side capability and must not rely on browser state.

Conversation payloads are encrypted at rest with AES-256-GCM. A 256-bit local master key is created in `data/storage.key`, then HKDF derives a distinct encryption key for each profile. Titles, messages, attachments and model names are authenticated and encrypted; ownership identifiers and timestamps remain visible so the service can route records. Existing plaintext records are read for migration and rewritten encrypted on the next conversation mutation. This protects copied data files from casual disclosure, but it does not protect against an attacker who can read both the data directory and its key while the operating-system account is compromised.

Text attachments are limited to TXT, Markdown, JSON and CSV. The server enforces per-file, per-message and per-conversation quotas, rejects path separators and control characters in names, and never renders their content as HTML. Before inference, it reloads attachments from the active profile’s stored conversation instead of trusting browser-supplied content and labels the JSON document block as untrusted data. This limits client-side bypasses but cannot guarantee that every model will resist prompt injection inside a document.

Project names and planning-task contents use separate HKDF contexts and authenticated encryption for each profile. Deleting a profile removes its conversations, projects and tasks from their respective stores; deleting a project only detaches its conversations and tasks.

All storage writes share one serialization queue. Multi-store deletion and restore operations create a permission-restricted rollback journal before the first replacement. Aster verifies each snapshot entry with SHA-256, restores it immediately on a write failure or before serving data after an interrupted process, and fails closed if the journal is incomplete or altered. The journal contains encrypted project/task/conversation records plus the already protected authentication store and is removed after commit.

Full backups are available only to a loopback administrator. Their contents are encrypted with AES-256-GCM and a key derived from a user-provided passphrase using scrypt; the local storage key is never copied into the backup. Restore validates account ownership and conversation limits before replacing data, then revokes every session. See [the backup and restore guide](./docs/backup-restore.md).

Profiles can be protected by an optional 4-to-8 digit PIN configured by the local administrator. PINs use the same memory-hard salted scrypt protection as account passwords. Profile selection starts locked after every account login or server restart, failed attempts are limited, and API responses expose only `pinRequired`, never PIN salts or hashes.

Authenticated users can list and revoke their own in-memory sessions. Responses expose a random session identifier, coarse device category and timestamps, but never an IP address, cookie token or complete User-Agent. A user cannot inspect or revoke another account’s sessions; suspending or deleting an account still revokes every matching session immediately. Aster rotates the cookie token after profile selection, expires sessions after 12 hours without activity or seven days absolutely, and keeps at most ten sessions per account.

The application shell loads JavaScript and CSS only from same-origin external files. Its enforced Content Security Policy does not allow inline scripts or styles, reducing the impact of an injected HTML fragment. Dynamic user content is inserted through escaped text templates and attachment contents are never rendered as HTML.

Model allowlists and profile rules are persisted in the protected local authentication store and enforced by the server. A model omitted from a non-empty allowlist is rejected before any Ollama request. Profile rules are prepended as a system instruction by the trusted service instead of being accepted from browser-supplied system messages. Skill allowlists are persisted but do not grant capabilities until a separately sandboxed skill runtime exists.

Model installation is a separate loopback-only administrator action. The server accepts only names from its reviewed catalogue, forwards Ollama’s pull stream without storing it, prevents duplicate pulls for the same model and aborts upstream work when the client disconnects. Model weights remain managed by Ollama and are never included in Aster backups.

Inference concurrency is enforced independently for each active profile. Requests exceeding the administrator’s parallel limit wait in a bounded in-memory FIFO queue; a profile can have at most 25 waiting requests. Disconnected clients are removed, slots are released in `finally` paths, and queue state contains no prompt content.

Aster is local-first, not magically safe. The v0.1 server listens on loopback by default and intentionally offers no shell or filesystem tools. Never bind it to a public interface without authentication and a trusted encrypted network.

Report vulnerabilities privately to the future security contact before publishing details. Until a contact is configured, open a minimal GitHub issue asking maintainers for a private channel without including exploit details.

Planned sensitive capabilities must follow deny-by-default permissions, workspace path boundaries, explicit user approval, an action log, size limits, origin checks and adversarial prompt-injection tests.

Profile separation must be enforced by the server and encrypted storage, not only by interface controls. Child and guest profiles must not inherit administrator tools, histories, network routes or filesystem permissions.

Tor and per-application VPN settings shown in the interface are configuration placeholders until a desktop network boundary exists. A production implementation must proxy DNS through the selected route, fail closed when the route stops, prevent direct-connection fallback, isolate credentials per profile and expose a verifiable connection test.

VPN provider credentials must never be collected by Aster. Proton VPN, system VPNs and custom providers are controlled by their own clients or by user-supplied local proxy endpoints. Per-application routing must not be advertised unless the selected platform and plan actually support split tunneling; otherwise Aster must label the route as system-wide.
