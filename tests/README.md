# WhatsApp Regression Harness

`verify_whatsapp_regression.mjs` verifies the WhatsApp notification module end-to-end:

- **Part A** — static source checks (API permission wiring, dispatcher 403 enforcement, UI payload safety)
- **Part B** — Google Apps Script backend executed in a `vm` sandbox with mocked Spreadsheet/Send/Log services
- **Part C** — browser UI driven with `puppeteer-core` against an offline static server (no live backend)

## Prerequisites

- Node.js (tested on v24.x)
- `puppeteer-core` installed at the repo root (`npm i puppeteer-core`)
- Google Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`
  (change `CHROME` in the script if installed elsewhere)

## Run

```powershell
node tests\verify_whatsapp_regression.mjs
```

## What it checks (60 assertions)

- `whatsappSaveSettings` / `whatsappTestSend` require `CanManageWhatsApp` at both the
  API dispatcher layer and inside the GAS handler; missing perm -> 403
- Settings round-trip, defaults seeding, audit + activity logging, apiToken masking
- Test-send success/failure paths, phone normalization, disabled-module and
  missing-credentials guards, config-before-phone precedence, template substitution
- `whatsappGetSettingsData` gated by `CanManageWhatsApp` (page-data security)
- Job-status and low-stock WhatsApp hooks send + log end-to-end; graceful when disabled
- UI: page loads with admin session, settings/templates/logs/stats render, toggle + save +
  test-send payloads (no credentials leaked, toggle posts only `{enabled}`),
  disabled banner + test log-id rendering, provider endpoint switch,
  WA-manager access allowed, restricted user redirected, permission checkbox toggling
