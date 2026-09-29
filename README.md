# RTL for ChatGPT

A lightweight, dependency-free Chrome extension that adds a one-click RTL/LTR toggle to ChatGPT.

It is designed for Hebrew and other right-to-left languages while deliberately leaving code, math, and the surrounding ChatGPT application shell alone.

> **Unofficial project.** This extension is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.

## What it does

- Explicitly toggles ChatGPT conversation prose between RTL/right-aligned and LTR/left-aligned.
- Toggles the main composer too, including current ProseMirror-style and no-form/sibling-toolbar layouts.
- Supports current and legacy ChatGPT conversation/composer selectors with semantic fallbacks.
- Remembers the selected mode with `chrome.storage.sync` and falls back to local extension storage.
- Keeps inline code, code blocks, keyboard/preformatted text, and math LTR.
- Keeps markdown table column order stable while making cell prose RTL.
- Fixes ordered/unordered list direction and logical indentation, including nested lists.
- Handles mixed Hebrew/English links with isolated bidi behavior.
- Survives SPA navigation, composer replacement, Send/Stop attribute changes, and characterData streaming with narrowly scoped observers.
- Mounts a small toggle next to ChatGPT's send/control area when possible.
- Falls back to a floating toggle for read-only/shared conversations or unknown composer layouts.
- Also lets the browser toolbar icon toggle RTL/LTR as a second, DOM-independent control path.
- Uses no analytics, backend, remote code, or conversation transmission.

## Why the implementation is intentionally conservative

ChatGPT changes its DOM regularly. This extension avoids generated Tailwind/CSS-module classes and prefers stable signals such as:

- `form[data-chatgpt-composer]`
- `[data-composer-markdown]`
- `#prompt-textarea`
- `button[data-testid="composer-send-button"]`
- `button[data-composer-submit]`
- `[data-message-author-role]`
- `[data-turn-key]`
- `[data-content-search-unit-key]`

The extension also keeps fallbacks for older markup and only changes conversation/composer direction—not the sidebar, menus, settings, or navigation. It includes the post-September 26, 2026 `section[data-turn="user|assistant"]` turn-shell shape documented by actively maintained ChatGPT userscripts.

## Install locally

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this repository folder.
6. Open or refresh `https://chatgpt.com`.

## Validate

```bash
./scripts/validate.sh
```

That checks the manifest, production files, PNG icon sizes, and JavaScript syntax without third-party dependencies.

A browser DOM harness is also included:

```bash
./scripts/test-dom.sh
```

It simulates current ChatGPT composer/message shapes, a search textbox false-positive trap, streaming content, no-form composer replacement, attribute-only Send/Stop transitions, code/math/table exceptions, and the read-only floating fallback. A final visual pass in an authenticated ChatGPT session is still required before publishing because no synthetic fixture can guarantee OpenAI's live DOM/UI has not changed.

See [`AGENTS.md`](./AGENTS.md) for the exact live validation checklist and [`RESEARCH.md`](./RESEARCH.md) for selector/design research.

## Package for Chrome Web Store

```bash
./scripts/package.sh
```

This creates a production-only `chatgpt-rtl.zip` and excludes development files, tests, `.git`, and personal material.

## Project structure

```text
.
├── manifest.json
├── background.js
├── core.js
├── ui.js
├── styles.css
├── AGENTS.md
├── CHANGELOG.md
├── RESEARCH.md
├── PRIVACY.md
├── STORE_LISTING.md
├── LICENSE
├── icons/
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tests/
│   └── dom-harness.html
├── scripts/
│   ├── validate.sh
│   ├── test-dom.sh
│   └── package.sh
└── .github/workflows/
    └── validate.yml
```

## Privacy

No analytics, no network requests from the extension, no backend, and no conversation collection. The only stored value is the preferred direction (`rtl` or `ltr`). See [`PRIVACY.md`](./PRIVACY.md).

## License

MIT.
