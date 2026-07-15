# Aster privacy and profile rules

These rules are product invariants. A feature that violates them must not ship.

## 1. Private by architecture

- Conversations belong to one profile and are not visible to another profile.
- An administrator can manage allowed models, skills, storage quotas and network policies. Administration does not grant access to conversation content.
- No silent activity feed, message mirror, keystroke log, prompt log or remote screen view exists.
- Web and mobile clients receive only the authenticated profile's data.
- A child profile may enforce safety capabilities, but it must not become covert surveillance. Any exceptional guardian visibility must be explicit, narrow, visible to the child where appropriate, and disabled by default.

## 2. Accounts and profiles

- The consumer product requires an authenticated Aster account, with at most three accounts per installation and four profiles per account.
- Cloud identity must be separated from local content: prompts, answers, documents and conversation titles remain local by default.
- Every profile has a distinct identifier, authentication secret and encryption context.
- PINs and passwords are never stored in plaintext. Use a memory-hard password hash with unique salts.
- Session tokens are short-lived, revocable and bound to the intended Aster instance.
- Switching profiles requires authentication unless the profile explicitly opts out on a trusted single-user device.
- A device session may require an additional PIN. PIN validation belongs on the trusted local service, never in browser storage.

## 3. Data separation

- Conversation queries must always be scoped by the authenticated profile on the server. Client-side filtering is not a security boundary.
- Export, deletion, search and attachments are scoped to the active profile.
- Backups preserve encryption and profile boundaries.
- Deleting a profile displays the exact affected data and requires deliberate confirmation.

## 4. Administrator boundaries

An administrator may:

- create, suspend and delete profiles;
- set model and skill allowlists;
- set storage and network policies;
- view aggregate storage usage and service health.

An administrator may not:

- open another profile's conversations;
- read prompts, generated answers or attached documents;
- enable hidden monitoring;
- silently weaken another profile's authentication;
- export another profile's content.

## 5. Remote access

- Remote access is disabled by default.
- Enabling it requires authentication, encryption in transit, revocation and a visible activity indicator.
- A remote session never expands permissions beyond the authenticated profile.
- Direct public port exposure is unsupported. Use an audited private network, authenticated tunnel or onion service configuration.

## 6. Network privacy

- Direct connection is the default. VPN and Tor are optional.
- Aster never installs or activates a VPN without explicit user action.
- Aster never collects VPN credentials.
- A selected protected route must fail closed instead of silently falling back to a direct connection.
- “Anonymous” and “traceless” are prohibited claims. DNS and route leaks must be tested.

## 7. Skills and tools

- Skills are disabled unless allowed for the profile.
- File, shell, network and external-service tools require separate capabilities.
- Sensitive actions are visible, cancellable where possible and recorded in the acting profile's private audit log.
- Prompt content from websites or documents cannot grant itself new permissions.

## 8. Telemetry

- No product analytics, advertising identifier or behavioral telemetry by default.
- Optional diagnostics must be understandable, minimal, redacted and opt-in.
- Local health information must not contain prompt or conversation content.
