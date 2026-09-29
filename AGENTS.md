# AGENTS.md — production finishing instructions

This file is the handoff for any coding agent that continues this repository locally.

## Objective

Finish and visually validate a production-quality Chrome extension named **RTL for ChatGPT**. It must stay lightweight, dependency-free, privacy-preserving, and resilient to ordinary ChatGPT SPA/composer changes.

The implementation has already had a public-source research pass and includes current 2026 ChatGPT selectors, semantic fallbacks, code/math/table exceptions, synchronized settings, a toolbar fallback, synthetic DOM tests, PNG production icons, and production packaging.

Do **not** replace it with a framework or backend unless there is a concrete requirement that cannot be met with a content script.

## Non-negotiable behavior

1. A small direction toggle appears near the ChatGPT composer controls when possible.
2. Clicking it switches conversation prose + composer between RTL and LTR immediately.
3. The browser toolbar icon is a second toggle path.
4. The selected mode persists across refreshes/conversations and synced Chrome profiles when sync is enabled.
5. RTL mode must:
   - make Hebrew/Arabic prose RTL + right aligned;
   - make the main composer RTL + right aligned;
   - render lists naturally, including nesting;
   - keep code/preformatted text LTR;
   - keep math LTR;
   - keep markdown table column order stable while making cell prose RTL;
   - avoid globally mirroring sidebar/navigation/settings/toolbars.
6. LTR mode must explicitly make the same conversation prose + composer LTR/left-aligned. It must still avoid touching the application shell and must not leave inline styles on ChatGPT content.
7. No analytics, telemetry, backend, remote code, or conversation transmission.
8. Keep named permissions to `storage` unless a new feature truly requires more.
9. Prefer ChatGPT native controls (copy, citations, code UI) rather than duplicating them.

## First commands after clone

```bash
./scripts/validate.sh
./scripts/test-dom.sh
```

If the local Chromium/Chrome binary is nonstandard, set `CHROME_BIN` before `test-dom.sh`.

If the browser reports that `file://` or localhost is blocked by an organization policy before the fixture loads, that is a managed-browser limitation rather than a test assertion. Retry on a normal local Chrome/Chromium installation and record the actual PASS/FAIL result.

## Live authenticated validation that still MUST be done

The remote authoring environment cannot inspect the user's authenticated ChatGPT DOM. On a machine that can open the real site:

1. Load the repo from `chrome://extensions` -> Developer mode -> Load unpacked.
2. Open `https://chatgpt.com` and refresh once.
3. Check DevTools console for extension errors.
4. Inspect the live DOM around the composer, send/voice controls, user turn, assistant turn, code, math, lists, and tables.
5. Compare live selectors with `RESEARCH.md` and update only when necessary. In particular, verify the post-September 26 `section[data-testid^="conversation-turn-"][data-turn="user|assistant"]` shell and `div#prompt-textarea.ProseMirror` composer shape.

### Button placement cases

Verify all of these:

- empty composer (voice/mic UI may occupy the send slot),
- composer containing text,
- multi-line composer,
- while an answer is streaming and Send becomes Stop (both DOM replacement and attribute-only transitions),
- narrow window,
- light mode,
- dark mode,
- new chat,
- existing conversation,
- Projects conversation if available,
- shared/read-only conversation (floating fallback expected).

The injected host must not overlap attachment/tools/reasoning/microphone/send/stop controls. If ChatGPT exposes a more stable control-row container than our current anchor strategy, update the placement logic while preserving the floating fallback.

### Content regression prompt

Create one answer containing:

- Hebrew paragraph,
- English paragraph,
- mixed Hebrew + English in one paragraph,
- numbered list,
- bullets + nested list,
- inline code,
- fenced JS/Python code,
- raw URL and email inside Hebrew,
- inline math and display math,
- markdown table with Hebrew + numbers,
- blockquote,
- headings,
- bold/italic text.

Check punctuation ordering as well as alignment.

### Dynamic behavior

Verify:

- streaming output,
- Stop generating,
- retry/regenerate,
- edit/resubmit a user message,
- SPA navigation between chats without refresh,
- composer replacement after route changes, including a toolbar rendered outside the composer form,
- long conversations after scrolling,
- toolbar action toggling,
- setting persistence after refresh.

## Engineering rules when fixing live issues

- Prefer stable attributes: `id`, `data-*`, `role`, semantic form structure, and aria labels.
- Avoid generated utility/hash class names unless only used as a final fallback.
- Do not apply RTL to the entire `<html>`, `<body>`, or `main` layout; only use the root attribute as a CSS switch for narrowly scoped content selectors.
- Do not manually reverse strings.
- Do not run expensive composer placement scans for every streaming token. Prose marking may react to new text nodes/characterData, but placement work should be limited to composer/control structural changes.
- Keep `pre`, `code`, math, technical UI, and table structure explicitly protected.
- If a mixed-direction edge case needs fixing, prefer targeted `unicode-bidi` / isolation over global bidi overrides.
- Never add a broad permission merely to simplify implementation.

## Publishing checks

Before store submission:

1. Run `./scripts/validate.sh` and `./scripts/test-dom.sh`.
2. Perform the live checklist above.
3. Increment the manifest version.
4. Run `./scripts/package.sh` and inspect the ZIP contents.
5. Ensure `PRIVACY.md` still matches actual behavior.
6. Capture store screenshots with no private account/project/chat information.
7. Re-check current Chrome Web Store policy.
8. Re-check current OpenAI brand guidance. The repository slug stays `chatgpt-rtl`; the store-facing title is intentionally phrased as `RTL for ChatGPT` to describe compatibility without presenting the extension as an official ChatGPT product. Revisit this if the brand guidance changes.
9. Store copy must say the extension is unofficial/not affiliated with OpenAI and must not imply endorsement.

## Repository discoverability

The repository name must remain exactly:

`chatgpt-rtl`

Recommended GitHub description:

`Lightweight RTL/LTR Chrome extension for ChatGPT — Hebrew, Arabic, Persian, code, math, lists and tables.`

Recommended topics:

`chatgpt`, `rtl`, `hebrew`, `arabic`, `persian`, `chrome-extension`, `browser-extension`, `right-to-left`, `bidi`

If GitHub CLI is authenticated locally:

```bash
gh repo edit TzoharLary/chatgpt-rtl \
  --description "Lightweight RTL/LTR Chrome extension for ChatGPT — Hebrew, Arabic, Persian, code, math, lists and tables." \
  --add-topic chatgpt \
  --add-topic rtl \
  --add-topic hebrew \
  --add-topic arabic \
  --add-topic persian \
  --add-topic chrome-extension \
  --add-topic browser-extension \
  --add-topic right-to-left \
  --add-topic bidi
```

## Definition of done

Do not call the extension production-ready until:

- static validation passes;
- synthetic DOM harness passes locally;
- live authenticated visual validation passes;
- no extension-originated console errors occur in normal use;
- current/new/streamed messages toggle correctly;
- composer + inline edit behavior is acceptable;
- lists, links, code, math and tables have been checked visually;
- SPA navigation neither removes nor duplicates the toggle;
- toolbar toggle works;
- light/dark mode are acceptable;
- permissions remain minimal;
- README/privacy/store copy match the actual behavior.
