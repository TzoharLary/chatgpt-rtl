# Chrome Web Store draft

## Name

RTL for ChatGPT

## Short description

One-click RTL/LTR for ChatGPT, with clean Hebrew/Arabic text while code, math, lists, links and tables stay readable.

## Detailed description

RTL for ChatGPT adds a lightweight direction toggle for people who use ChatGPT in Hebrew, Arabic, Persian, and other right-to-left languages.

Features:

- One-click RTL/LTR conversation toggle.
- RTL message composer.
- Correct ordered and unordered lists, including nested lists.
- Inline code and code blocks stay LTR.
- Math stays LTR.
- Markdown table column order is preserved while cell prose becomes RTL.
- Mixed-language links are handled conservatively with browser-native bidi behavior.
- Preference is remembered between sessions and can sync with Chrome profile settings.
- Inline control near the ChatGPT composer, plus the Chrome toolbar icon as a fallback.
- Read-only/shared conversations get a small floating toggle.
- No analytics, telemetry, backend, remote code, or conversation collection.
- Only the `storage` named permission is requested.

The extension deliberately changes conversation/composer direction instead of mirroring ChatGPT's full application shell.

**Unofficial extension. Not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.**

## Suggested repository topics

`chatgpt`, `rtl`, `hebrew`, `arabic`, `persian`, `chrome-extension`, `browser-extension`, `right-to-left`, `bidi`

## Screenshot checklist

1. Hebrew conversation before RTL.
2. Same conversation after RTL.
3. Nested Hebrew list.
4. Hebrew explanation containing inline + fenced code.
5. Hebrew explanation containing math.
6. Hebrew markdown table showing stable columns.
7. RTL composer with the toggle visible.

Avoid screenshots containing private history, account names, email addresses, files, projects, or personal conversations.
