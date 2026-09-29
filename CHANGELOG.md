# Changelog

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
