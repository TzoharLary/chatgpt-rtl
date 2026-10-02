# Validation status

Last updated: 2026-10-02  
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

### Synthetic browser harness (PASS)

The synthetic browser harness (`tests/dom-harness.html` via `./scripts/test-dom.sh`) has been executed locally on macOS with Google Chrome and **passed 100%** with all 20+ assertions verified:
- Initial RTL mode and storage migration from legacy string to record `{ mode, updatedAt }`.
- Inline toggle button placement immediately preceding Send.
- Composer positive marking (`data-chatgpt-rtl-composer="1"`).
- Prose elements direction RTL, code/math/table structure direction LTR.
- Toggle click switching document and composer to LTR, toolbar message switching back to RTL.
- Send to Stop transition preserving toggle placement.
- Streamed paragraphs dynamically marked via batched mutations.
- Generic turn additions correctly marked.
- Replacement of composer shell preserving toggle position.
- Removal of composer triggering floating toggle fallback (`bottom: 92px, right: 20px`).
- Removal of conversation removing floating toggle.

### Live ChatGPT DOM validation (PASS)

Executed against live `https://chatgpt.com` on **2026-10-02**:
- **DOM Adaptation for current Octane/StyleX architecture:**
  - Added support for `data-message-role="assistant|user"` (message containers in `<ol data-conversation-transcript>`).
  - Added support for `data-assistant-markdown` and `data-user-message-copy`.
  - Added support for `data-composer-trailing` in control row.
  - Adapted `looksLikeStop` for the unified button carrying both `data-send-label` and `data-stop-label`.
- **Live Content Generation & Bidi Rendering:**
  - Complex 7-component prompt sent and rendered live.
  - Hebrew paragraphs verified RTL (`direction: rtl`, `textAlign: right`).
  - Code blocks verified LTR (`direction: ltr`).
  - Inline code verified LTR.
  - Markdown table verified with stable column order and RTL cell text.
  - Lists verified with logical indentation.
- **Interactive Toggle Control:**
  - On-page button clicked: immediate switch to LTR mode across turns and composer.
  - Second click: immediate restore to RTL mode.
  - Screenshots captured and verified for both modes.
- **Edge cases validated live:**
  - **Light vs. Dark Theme:** Button uses `color: inherit` and opacity `0.78` ensuring optimal contrast in both themes.
  - **Read-Only / No-Composer Floating Fallback:** Verified on live DOM; transitions to fixed bottom-right floating button and toggles prose correctly.
  - **Inline Message Editing:** Verified with `[data-message-role="user"] [contenteditable="true"][role="textbox"]` receiving RTL styling.
  - **Console health:** Zero extension-originated console errors.

## Manual User Verification (Authenticated ChatGPT Session)

The automated live checks verified all core DOM, CSS, and interactive toggling behaviors. The only items that remain for personal user verification are account-specific features that require your private credentials:

1. **Load Unpacked Extension in Personal Chrome:**
   - Follow the step-by-step instructions in the walkthrough to load `/Users/tzoharlary/Documents/Projects/chatgpt-rtl`.
2. **Personal / Authenticated Account Features:**
   - Navigating an existing conversation from your sidebar chat history.
   - Projects workspace conversation (if subscribed to ChatGPT Plus / Team).
   - Chrome toolbar puzzle icon pinned toggle click.
