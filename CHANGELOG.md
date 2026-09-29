# Changelog

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
