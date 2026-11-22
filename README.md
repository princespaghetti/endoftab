# End of Tab

A Chromium browser extension that automatically closes inactive tabs after a configurable timeout period.

## Features

- Auto-close tabs that have been inactive for a specified duration (default: 30 minutes)
- Protects pinned, active, and audible tabs, plus browser pages like `chrome://settings`
- Whitelist sites (including subdomains) whose tabs are never closed
- Doesn't mass-close tabs after a browser restart or waking from sleep: the timeout starts counting again from then
- Easy on/off toggle

Requires Chrome (or another Chromium browser) 121 or later.

## Installation

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `src/` directory from this repository
6. The extension icon will appear in your toolbar

## Usage

Click the extension icon to:
- Enable or disable auto-closing
- Adjust the inactivity timeout (in minutes)
- Add the current site to the whitelist, or remove whitelisted sites

Settings are saved automatically.
