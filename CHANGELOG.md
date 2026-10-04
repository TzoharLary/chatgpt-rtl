# Changelog

## 0.5.4 — 2026-10-04

- Calibrated optical margin to 12px right margin, achieving balanced visual centering between the microphone outline button and the pinned Send/Stop circle.

## 0.5.3 — 2026-10-04

- Added 6px optical right margin to the composer toggle button host, compensating for visual weight disparity between the filled primary Send/Stop button and the thin outline microphone icon.

## 0.5.2 — 2026-10-04

- Added native keyboard shortcut (`Alt+Shift+X` / `Option+Shift+X` on Mac) configurable via `chrome://extensions/shortcuts` and active directly in chat.
- Added native push-triggered auto-reload hook with zero third-party extension dependencies.
- Reorganized architectural and research documentation into clean `docs/` structure (`docs/bidi-architecture.md`, `docs/research.md`).
- Cleaned up internal development scratch files for public release.

## 0.5.1 — 2026-10-04

- Fixed Bidi space loss bug where spaces between words collapsed around inline elements (`<strong>`, `<code>`), e.g., `"שהואלא"` instead of `"שהוא לא"`.
- Replaced `unicode-bidi: plaintext` with `unicode-bidi: embed` on prose and table cells, restoring full compliance with explicit RTL directionality and preventing neutral character / punctuation jumping.
- Changed composer and inline-editing `unicode-bidi` to `normal` for clean contenteditable interaction.
- Expanded synthetic DOM harness to assert mixed inline elements (`<strong>` + `<code>`) and `unicodeBidi === 'embed'`.
- Added automatic macOS Google Chrome / Chromium app bundle path discovery in `test-dom.sh`.

## 0.5.0 — 2026-09-29

- Batched streaming/message MutationObserver work so token-by-token `characterData` updates are deduplicated before prose rescans.
- Added explicit conversation add/remove lifecycle detection so the floating control appears for late-loaded read-only chats and disappears when leaving a chat.
- Stabilized the control next to the active Send/Stop slot instead of jumping to unrelated composer buttons while a response streams.
- Added versioned sync/local preference records with conflict resolution and automatic migration from the earlier string setting.
- Hardened generic turn handling so lists and tables are still recognized even when ChatGPT removes familiar `.markdown` / `.prose` wrappers.
- Excluded accessibility role labels and hidden UI from prose tagging, while avoiding an overly broad `aria-live` exclusion that could suppress a whole streaming response.
- Switched prose/table-cell bidi handling to `unicode-bidi: plaintext` for better mixed Hebrew/Arabic + English punctuation behavior.
- Added more current composer/send fallbacks and expanded the synthetic harness for streaming bursts, generic turns, Stop transitions, storage migration, and read-only lifecycle edges.

## 0.4.0 — 2026-09-29

- Added support for the post-September 26, 2026 ChatGPT `section[data-turn="user|assistant"]` turn-shell rewrite.
- Split runtime into `core.js` (DOM/prose adapters) and `ui.js` (state/control/observers) so selector hardening and UI placement can evolve independently.
- Added current/legacy composer and send-control fallbacks, including toolbars outside the composer form.
- Added Stop-button transition handling and structural MutationObserver filtering.
- Added conservative exclusions for status/citation/attachment/tool UI inside conversation turns.
- Added RTL/LTR handling for lists, code, math, links and tables without mirroring the application shell.
- Added toolbar-action fallback, sync/local preference persistence, read-only floating control, PNG icons, validation, packaging and synthetic DOM harness.
- Added repository/privacy/store/research documentation.

## 0.1.0

- Initial port from the earlier Base44 RTL toggle architecture.
