# Installing Aster Local

## Current developer preview

1. Install Node.js 20 or newer.
2. Clone or copy the Aster folder.
3. Run `npm.cmd start` from the project folder on Windows, or `npm start` on macOS/Linux.
4. Open `http://127.0.0.1:4317`.
5. Optionally install Ollama.
6. Optionally download a compatible model such as `ollama pull gemma4:12b`.
7. Refresh Aster and choose the model in the header.

The interface, profiles and stored conversations can be prepared without downloading a model. Aster itself must not bundle or duplicate model weights.

## Planned packaged installation

The desktop installer will perform these explicit steps:

1. Choose installation language and location.
2. Explain local storage and estimate required disk space.
3. Sign in to or create the required Aster account.
4. Create the first administrator profile and set an optional device-session PIN and recovery method.
5. Choose models. “No model yet” remains valid.
6. Choose optional network routing. Direct connection remains the default.
7. Install the local service and desktop shortcut.
8. Offer PWA/mobile pairing only after authentication is enabled.
9. Run a privacy and connection self-test.

No VPN, model or remote-access component may be selected silently.

## Mobile and web pairing

Pairing will use a short-lived QR or one-time code. It must identify the target profile, expire quickly and never expose administrator data. The mobile client receives only the selected profile's encrypted session. See `RULES.md` for mandatory boundaries.
