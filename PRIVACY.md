# Privacy Policy — ChatGPT RTL

ChatGPT RTL is designed to run entirely in the browser.

## Data collection

The extension does **not** collect, sell, transmit, or retain conversation content, browsing history, personal information, analytics, or telemetry.

## Stored preference

The extension stores one setting: whether ChatGPT should be displayed in `rtl` or `ltr` mode.

It uses `chrome.storage.sync` first so the preference can follow a signed-in Chrome profile when Chrome Sync is enabled. If sync storage is unavailable, it falls back to `chrome.storage.local`.

## Network access

The extension makes no network requests of its own and uses no backend service, external API, CDN, remote JavaScript, or remote CSS.

## Site access

The content script runs only on the ChatGPT URL patterns declared in `manifest.json` so it can change text direction and add the toggle control.

## Toolbar action

Clicking the extension's Chrome toolbar icon sends a local browser-extension message to the content script in the current tab. No data is sent to a server.

## Changes

If a future version introduces any new data handling, this policy must be updated before release.
