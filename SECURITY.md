# Security policy

## Implemented authentication baseline

The application now fails closed: business APIs require an authenticated session, the first administrator can only be created from loopback, and conversations are scoped to the active profile on every server query. Passwords use salted scrypt (`N=2^17`, `r=8`, `p=1`); session identifiers are random, revocable, kept server-side and sent only through an `HttpOnly`, `SameSite=Strict` cookie. Administrative model, rule and skill persistence is still a planned server-side capability and must not rely on browser state.

Aster is local-first, not magically safe. The v0.1 server listens on loopback by default and intentionally offers no shell or filesystem tools. Never bind it to a public interface without authentication and a trusted encrypted network.

Report vulnerabilities privately to the future security contact before publishing details. Until a contact is configured, open a minimal GitHub issue asking maintainers for a private channel without including exploit details.

Planned sensitive capabilities must follow deny-by-default permissions, workspace path boundaries, explicit user approval, an action log, size limits, origin checks and adversarial prompt-injection tests.

Profile separation must be enforced by the server and encrypted storage, not only by interface controls. Child and guest profiles must not inherit administrator tools, histories, network routes or filesystem permissions.

Tor and per-application VPN settings shown in the interface are configuration placeholders until a desktop network boundary exists. A production implementation must proxy DNS through the selected route, fail closed when the route stops, prevent direct-connection fallback, isolate credentials per profile and expose a verifiable connection test.

VPN provider credentials must never be collected by Aster. Proton VPN, system VPNs and custom providers are controlled by their own clients or by user-supplied local proxy endpoints. Per-application routing must not be advertised unless the selected platform and plan actually support split tunneling; otherwise Aster must label the route as system-wide.
