# Agents Guide

This document explains the essentials of `node-red-contrib-google-smarthome` so that AI agents can work productively and safely inside the repository.

## 1. Mission & Scope
- Provides a self-hosted Google Smart Home provider implemented as custom Node-RED nodes.  
- Lets end users control virtual devices defined in Node-RED via Google Assistant / Google Home, then relay actions to their own automations.  
- Does **not** talk directly to physical devices; flows must bridge between Google-issued commands and the real hardware logic.

## 2. High-Level Architecture
1. **Node-RED nodes (`google-smarthome`, `google-mgmt`, `devices/device.js`):** Handle the Smart Home intents, expose config UI, and integrate with flows.  
2. **Express-based web server (`lib`, `google-smarthome.js`, `lib/HttpActions.js`):** Implements `/smarthome`, `/oauth`, `/token`, `/check`, and local-fulfillment endpoints consumed by Google.  
3. **Google integrations:** Requires an Actions on Google project, OAuth credentials, and a HomeGraph service account (JWT key) for report-state and request-sync calls.  
4. **Local fulfillment:** Optional discovery service (mDNS/DNS-SD) enabling speakers to connect directly to Node-RED.

Data flow: Google → HTTPS webhook → Node-RED config node → individual device nodes → user-defined flows → (optional) physical device integrations. State reports travel in the opposite direction through the same stack.

## 3. Key Directories & Files
- `google-smarthome.js`, `google-mgmt.js`, `devices/`: Main runtime nodes registered via `package.json`.
- `lib/`: Helpers such as HTTP handlers, auth, state storage, and Google API wrappers.
- `docs/`: Setup instructions, Google Sign-In guide, troubleshooting, and error references—consult before changing onboarding flows.
- `examples/` and `examples/Spoken Notifications/`: Reference payloads and sample flows.
- `test/`: Mocha + `node-red-node-test-helper` specs, plus `test/sh/flows.json` used for integration-style simulations.
- `local-execution/`: Discovery and local-fulfillment utilities.

## 4. Development Environment
- Requires Node.js ≥16 and Node-RED ≥2.x (dev dependency is 4.x for testing).  
- Install dependencies with `npm install`. Network access may be restricted; reuse existing modules whenever possible.  
- Run the automated test suite with `npm test` (Mocha). Tests spin up Node-RED helpers; avoid adding slow, flaky network calls.  
- ESLint is configured via `eslint.config.js`; align new code with its expectations and keep code comments minimal but meaningful.

## 5. AI-Agent Workflow Tips
1. **Understand the flow:** Before editing a node or handler, inspect related files (e.g., `lib/HttpActions.js` when touching web endpoints or auth).  
2. **Preserve backwards compatibility:** Google Smart Home integrations are brittle; ensure schema changes continue to match Google's trait/device specs.  
3. **Document user-facing changes:** Update `README.md` or relevant docs if setup steps or capabilities change.  
4. **Test pragmatically:**  
   - Unit/integration tests: `npm test`.  
   - Linting (if needed): `npx eslint .` (large output, run only when valuable).  
5. **Avoid leaking secrets:** JWT keys, OAuth secrets, and cert paths belong in user environments, not the repo. Use placeholders in docs (`/path/to/key.json`).  
6. **Respect existing flows:** Users may run this inside live Node-RED instances. Avoid renaming topics or payload properties unless absolutely necessary.

## 6. Common Agent Tasks
- **Enhancing devices/traits:** Update `devices/device.js` and associated schema helpers; add tests demonstrating new payload handling.  
- **Adjusting HTTP behavior:** Modify `lib/HttpActions.js` or related auth modules, then verify OAuth + intent handling remains intact.  
- **Improving docs:** Use `docs/` for detailed instructions; cross-link from `README.md` if adding new capabilities.  
- **Bug fixes:** Reproduce with `test/sh/flows.json` where possible, add regression tests, then summarize the change in PR notes or commit messages.

## 7. External References
- Google Assistant Smart Home docs: devices, traits, notifications, and local fulfillment specs.  
- Node-RED documentation for custom nodes and runtime APIs.  
- `docs/setup_instructions.md`, `docs/google_signin.md`, `docs/possible-errors.md` for canonical onboarding flows.

## 8. Definition of Done
- Code updated with minimal, well-placed comments.  
- Tests and lint (when run) pass locally.  
- Relevant docs/examples updated.  
- No secrets committed; versioning remains consistent (`package.json` + `package-lock.json` if dependencies change).

Agents should treat this guide as the starting point before diving into the codebase, ensuring consistent, safe contributions without breaking Google Smart Home integrations already deployed in users' homes.
