# Validation status

Last updated: 2026-09-29  
Extension version: `0.5.0`

This file records what has actually been verified and what still requires a normal local Chrome + authenticated ChatGPT session. Do not silently convert an unverified item into a claim that it works.

## Verified

### Static / repository checks

The repository's GitHub Actions `validate` workflow passed on the hardened 0.5 code path.

The static validator checks, among other things:

- Manifest V3.
- Production content scripts are `core.js` + `ui.js`.
- Named extension permissions remain only `storage`.
- No `tabs`, `scripting`, or `activeTab` permission.
- No remote URLs in production JS/CSS.
- Required PNG icon dimensions.
- Current/fallback ChatGPT composer, turn and send-control signals.
- Conversation-lifecycle, Send/Stop, streaming-batching and storage-versioning signals.
- Required RTL/LTR CSS and bidi protection rules.
- JavaScript syntax for `core.js`, `ui.js`, and `background.js`.

### Code-level hardening completed

The implementation currently includes:

- A DOM adapter separated from UI/state logic.
- Multiple semantic composer and send-control fallbacks instead of relying on one generated CSS class.
- Explicit Send/Stop slot handling during generation.
- Batched MutationObserver processing for streaming `characterData` bursts.
- Conversation add/remove detection for read-only/floating-control lifecycle.
- Preference migration + reconciliation between `chrome.storage.sync` and `chrome.storage.local` using `{ mode, updatedAt }` records.
- Protection for code, preformatted text, math and table structure.
- Conservative exclusions for citations, status/tool UI, hidden accessibility labels and interactive controls inside turns.
- `unicode-bidi: plaintext` on prose/composer/table cells plus isolated technical/link islands.
- A synthetic DOM fixture covering current/fallback turn structures and important edge cases.

## Not verified in the remote authoring environment

### Synthetic browser harness

`tests/dom-harness.html` and `./scripts/test-dom.sh` are present, but the remote authoring container could not provide a trustworthy PASS/FAIL result: its Chromium process failed/hung before producing DOM output even on a trivial page, with host/runtime/DBus errors unrelated to the extension assertions.

Therefore the synthetic browser test is **UNVERIFIED here**, not failed.

Run it locally:

```bash
./scripts/validate.sh
./scripts/test-dom.sh
```

If Chrome/Chromium is not auto-detected:

```bash
CHROME_BIN="/path/to/chrome" ./scripts/test-dom.sh
```

Do not publish if the harness reports a real assertion failure.

### Live authenticated ChatGPT UI

The remote environment cannot inspect the exact authenticated ChatGPT DOM rendered for this account. A local visual pass is mandatory because ChatGPT's DOM is not a public compatibility API.

After cloning:

```bash
git clone https://github.com/TzoharLary/chatgpt-rtl.git
cd chatgpt-rtl
./scripts/validate.sh
./scripts/test-dom.sh
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this repository.
4. Open/refresh `https://chatgpt.com`.
5. Open DevTools and keep the Console visible while testing.

Verify all of the following before calling the release production-ready:

- New chat: empty composer and composer with text.
- Existing long conversation.
- RTL -> LTR -> RTL with the injected button.
- Same toggle path from the browser toolbar icon.
- Preference persistence after refresh and after opening another conversation.
- Hebrew paragraph, English paragraph and mixed Hebrew/English punctuation.
- Bullets, numbering and nested lists.
- Inline code and fenced code.
- Inline/display math (KaTeX/MathJax if present).
- Markdown tables: column order must not reverse.
- Raw URL/email inside Hebrew text.
- Headings, blockquotes, bold/italic text.
- Streaming output.
- Send -> Stop -> Send transitions while generating.
- Regenerate/retry.
- Edit/resubmit a user message.
- SPA navigation between conversations without refresh.
- Composer replacement after route changes.
- Light and dark themes.
- Narrow browser width.
- Projects conversation if available.
- Shared/read-only conversation: floating toggle expected.
- Leaving a read-only conversation: floating toggle must disappear.
- No overlap with attach/tools/reasoning/voice/send/stop controls.
- No extension-originated console errors.

If a selector/layout issue is found, inspect the smallest stable semantic attribute around that exact control and update `core.js`; do not solve it by applying RTL to all of `main`, `body`, or the whole page.

## Repository metadata still needs a local GitHub action

The connected repository-writing interface used for this authoring pass can edit files but does not expose repository description/topics settings. The repository currently needs those metadata fields set for discoverability.

With authenticated GitHub CLI:

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

## Release gate

Only after both validation commands pass locally and the live checklist above has been completed should a store package be treated as release-ready:

```bash
./scripts/validate.sh
./scripts/test-dom.sh
./scripts/package.sh
```

Then inspect the generated ZIP before uploading it to Chrome Web Store.
