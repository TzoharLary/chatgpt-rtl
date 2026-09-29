# AGENTS.md — production finishing instructions

This is the handoff for any coding agent that continues this repository locally.

## Objective

Finish and visually validate a production-quality Chrome extension named **ChatGPT RTL**. Keep it lightweight, dependency-free, privacy-preserving, and resilient to ordinary ChatGPT SPA/composer changes. Do not replace it with a framework or backend unless there is a concrete requirement that cannot be met with a content script.

## Non-negotiable behavior

1. A small direction toggle appears near the ChatGPT composer controls when possible.
2. Clicking it switches conversation prose + composer between RTL and LTR immediately.
3. The browser toolbar icon is a second toggle path.
4. The selected mode persists across refreshes/conversations and synced Chrome profiles when sync is enabled.
5. RTL mode must make Hebrew/Arabic/Persian prose and the main composer RTL/right-aligned, while keeping code, preformatted text and math LTR.
6. Lists must render naturally, including nesting.
7. Markdown table column order must stay stable while cell prose follows the selected direction.
8. Do not mirror the sidebar, navigation, settings, menus, toolbars, citations, attachments, or other application chrome.
9. LTR mode must explicitly restore conversation prose + composer to LTR/left-aligned.
10. No analytics, telemetry, backend, remote code, or conversation transmission.
11. Keep named permissions to `storage` unless a new feature truly requires more.
12. Prefer ChatGPT native controls instead of duplicating copy/citation/code UI.

## First commands after clone

```bash
./scripts/validate.sh
./scripts/test-dom.sh
```

If the local Chromium/Chrome binary is nonstandard, set `CHROME_BIN` before `test-dom.sh`.

The remote authoring environment used for the initial build has a managed Chromium that fails before the synthetic page runs. A failure there is not evidence that an assertion failed. Re-run the harness in a normal local Chrome/Chromium install.

## Live authenticated validation that still MUST be done

The authoring environment cannot inspect the owner's authenticated ChatGPT DOM. On a machine that can open the real site:

1. Load this repo from `chrome://extensions` → Developer mode → **Load unpacked**.
2. Open `https://chatgpt.com` and refresh once.
3. Check DevTools console for extension errors.
4. Inspect the live DOM around the composer, send/voice controls, user turn, assistant turn, code, math, lists and tables.
5. Compare live selectors with `RESEARCH.md`; update only when necessary.
6. Specifically verify the post-September-26 shape `section[data-testid^="conversation-turn-"][data-turn="user|assistant"]` and the `div#prompt-textarea.ProseMirror` composer shape.

### Button placement cases

Verify empty composer, composer with text, multiline composer, active streaming/Stop state, narrow window, light mode, dark mode, new chat, existing chat, Projects chat if available, and shared/read-only chat. The injected control must not overlap attachment/tools/reasoning/microphone/send/stop controls.

### Content regression prompt

Create one answer containing a Hebrew paragraph, English paragraph, mixed Hebrew/English paragraph, numbered list, bullets + nested list, inline code, fenced JS/Python code, raw URL and email inside Hebrew, inline/display math, markdown table, blockquote, headings and bold/italic text. Check punctuation ordering as well as alignment.

### Dynamic behavior

Verify streaming output, Stop generating, retry/regenerate, edit/resubmit user message, SPA navigation between chats without refresh, composer replacement after route changes, long conversations after scrolling, toolbar-action toggling and preference persistence after refresh.

## Engineering rules

- Prefer stable `id`, `data-*`, `role`, semantic form structure and aria-label attributes.
- Avoid generated utility/hash class names except as a last fallback.
- Do not apply RTL to `<html>`, `<body>` or the main layout; the root data attribute is only a CSS switch for narrowly scoped content selectors.
- Do not manually reverse strings.
- Do not run expensive composer-placement scans for every streaming token. Prose marking may react to added text, while placement work should react only to composer/control structure changes.
- Keep `pre`, `code`, math, technical UI and table structure explicitly protected.
- Prefer targeted bidi isolation over global bidi overrides.
- Never add a broad permission merely to simplify implementation.

## Publishing checks

Before Chrome Web Store submission:

1. `./scripts/validate.sh`
2. `./scripts/test-dom.sh`
3. Complete the live checklist above.
4. Increment `manifest.json` version if code changes after 0.4.0.
5. Run `./scripts/package.sh` and inspect the ZIP.
6. Confirm `PRIVACY.md` matches actual behavior.
7. Capture screenshots containing no private account/project/chat information.
8. Re-check current Chrome Web Store policy and OpenAI brand guidance.
9. Keep store copy explicit that this is unofficial and not affiliated with OpenAI.

## Repository discoverability

Repository name must remain exactly `chatgpt-rtl`.

Recommended description:

`Lightweight RTL/LTR Chrome extension for ChatGPT — Hebrew, Arabic, Persian, code, math, lists and tables.`

Recommended topics:

`chatgpt`, `rtl`, `hebrew`, `arabic`, `persian`, `chrome-extension`, `browser-extension`, `right-to-left`, `bidi`

If GitHub CLI is authenticated locally:

```bash
gh repo edit TzoharLary/chatgpt-rtl \
  --description "Lightweight RTL/LTR Chrome extension for ChatGPT — Hebrew, Arabic, Persian, code, math, lists and tables." \
  --add-topic chatgpt --add-topic rtl --add-topic hebrew --add-topic arabic \
  --add-topic persian --add-topic chrome-extension --add-topic browser-extension \
  --add-topic right-to-left --add-topic bidi
```

## Definition of done

Do not call the extension production-ready until static validation passes, the synthetic DOM harness passes locally, authenticated visual validation passes, there are no extension-originated console errors, current/new/streamed messages toggle correctly, composer + inline-edit behavior is acceptable, lists/links/code/math/tables are visually checked, SPA navigation neither removes nor duplicates the control, toolbar toggle works, light/dark mode look acceptable, permissions remain minimal, and README/privacy/store copy match the actual behavior.
