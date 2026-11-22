# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

End of Tab is a Chromium browser extension (Manifest V3) that automatically closes inactive tabs after a configurable timeout period. The extension protects pinned, active, and audible tabs from auto-closure.

Extension files are located in the `src/` directory.

## Architecture

All extension code is in `src/`. Pure logic lives in `lib.js` and `settings.js` so it can be unit-tested with Bun (`test/lib.test.js`) without a browser.

### background.js (Service Worker)
- An alarm named `checkInactiveTabs` fires every minute.
- Each check reads settings, queries all tabs, and closes those where `shouldCloseTab` returns true.
- Inactivity comes from Chrome's built-in `tab.lastAccessed` (Chrome 121+, enforced via `minimum_chrome_version`). The extension does not track activity itself.
- Inactivity is counted from `max(tab.lastAccessed, activeSince)`. `activeSince` is stored in `chrome.storage.session` and resets to "now" when the browser restarts, the extension reloads, or the gap since the last check exceeds 5 minutes (sleep). This prevents mass-closing restored tabs after a restart or wake.
- A tab is not closed in a window unless more than one unpinned tab remains (`canCloseTabInWindow`).

### lib.js
Pure helpers: URL/hostname parsing, whitelist matching (includes subdomains), `getActiveSince`, `shouldCloseTab`, `canCloseTabInWindow`.

Protected from closing: pinned, active, and audible tabs; non-`http(s)` URLs (e.g. `chrome://`); whitelisted domains.

### settings.js
Reads and writes settings in `chrome.storage.local`, normalizing every value (invalid input falls back to defaults). Both background and popup go through `readSettings` / `writeSettings`.

### popup.html + popup.js
- Enabled toggle and timeout in minutes.
- Timeout is saved on every valid keystroke (`input`), because the popup can close before `change` fires.
- "Add current site" adds the active tab's hostname to the whitelist; entries can be removed.

### manifest.json
Permissions: `tabs` (read tab URLs), `storage`, `alarms`.

## Development

### Loading the Extension
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `src/` directory
4. The extension will appear in the toolbar

### Testing Changes
After modifying files:
1. Go to `chrome://extensions/`
2. Click the refresh icon for "End of Tab"
3. For background.js changes, the service worker will restart
4. For popup changes, close and reopen the popup

### Tests and Lint
- `bun test` runs unit tests.
- `bun run check` lints and formats with auto-fix (local use).
- CI runs `bunx biome ci ./src ./test` (fails on issues, never writes) and `bun test`.

### Debugging
- Background service worker: chrome://extensions/ → "Inspect views: service worker"
- Popup: Right-click popup → "Inspect"
- Check console logs and use Chrome DevTools

## Storage Schema

### chrome.storage.local
- `enabled` (boolean): Whether auto-close is enabled, defaults to true
- `timeoutMinutes` (number): Minutes of inactivity before closing, defaults to 30
- `whitelist` (string[]): Lowercase hostnames whose tabs (and subdomains) are never closed

### chrome.storage.session (cleared on browser restart)
- `activeSince` (number): Timestamp inactivity is counted from (see background.js)
- `lastCheck` (number): Timestamp of the last alarm check, used to detect sleep
