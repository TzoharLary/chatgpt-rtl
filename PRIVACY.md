# Privacy Policy — RTL for ChatGPT

RTL for ChatGPT is designed to run entirely in the browser.

## Data collection

The extension does **not** collect, sell, transmit, or retain conversation content, browsing history, personal information, analytics, or telemetry.

## Stored preference

The extension stores only its display preference: whether ChatGPT should be shown in `rtl` or `ltr` mode, plus a local update timestamp used to keep the synced and local copies of that setting consistent.

The preference record is mirrored between `chrome.storage.sync` and `chrome.storage.local`. Sync lets the preference follow a signed-in Chrome profile when Chrome Sync is enabled; the local copy provides a fallback when sync is unavailable. No conversation text is stored in either area.

## Network access

The extension makes no network requests of its own and uses no backend service, external API, CDN, remote JavaScript, or remote CSS.

## Site access

The content script runs only on the ChatGPT URL patterns declared in `manifest.json` so it can change text direction and add the toggle control.

## Toolbar action

Clicking the extension's Chrome toolbar icon sends a local browser-extension message to the content script in the current tab. No data is sent to a server.

## Changes

If a future version introduces any new data handling, this policy must be updated before release.
