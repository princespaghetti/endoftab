# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

End of Tab is a Chromium browser extension (Manifest V3) that automatically closes inactive tabs after a configurable timeout period. The extension protects pinned, active, and audible tabs from auto-closure.

Extension files are located in the `src/` directory.

## Architecture

The extension consists of three main components (all in `src/`):

### background.js (Service Worker)
The core logic runs as a persistent service worker that:
- Tracks tab activity using a Map (`tabActivity`) that stores tabId -> timestamp
- Persists activity state to `chrome.storage.local` for recovery after restarts
- Uses `chrome.alarms` API to check for inactive tabs every minute
- Protects pinned, active, and audible tabs by updating their activity timestamp
- Closes tabs when: `(now - lastActive) > threshold`

Key implementation details:
- Activity tracking initializes on `chrome.runtime.onStartup` and `onInstalled`
- Existing tabs are initialized with current time if active, or `now - 60000` if inactive
- Tab activity Map is persisted to storage on each alarm check
- Alarm named 'checkInactiveTabs' runs periodically every 1 minute

### popup.html + popup.js
Provides user interface for configuration:
- Enabled/disabled toggle (stored as `enabled` in chrome.storage.local)
- Timeout duration in minutes (stored as `timeoutMinutes`, defaults to 30)
- Settings are saved immediately on change and loaded on popup open

### manifest.json
Declares required permissions:
- `tabs`: Access to tab information
- `storage`: Persist settings and tab activity
- `alarms`: Periodic background checks

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

### Debugging
- Background service worker: chrome://extensions/ → "Inspect views: service worker"
- Popup: Right-click popup → "Inspect"
- Check console logs and use Chrome DevTools

## Storage Schema

### chrome.storage.local
- `enabled` (boolean): Whether auto-close is enabled, defaults to true
- `timeoutMinutes` (number): Minutes of inactivity before closing, defaults to 30
- `tabActivity` (object): Map of tabId (string) to timestamp (number), persisted every minute
