# Research notes — ChatGPT RTL

Last research pass: **2026-09-29**.

This file records the public evidence and implementation conclusions used to make the extension resilient before live authenticated testing.

## September 26, 2026 markup rewrite

A heavily maintained ChatGPT UI userscript reported on **2026-09-26** that OpenAI had rewritten the web UI markup. Its same-day selectors use `div#prompt-textarea.ProseMirror` for the composer and `[data-turn]` for chat turns.

A separate userscript updated later documents persistent shells in the form `section[data-testid="conversation-turn-N"][data-turn="user|assistant"]`, with message bodies virtualized in/out while the shells remain.

The extension therefore does not rely only on the older `article[data-turn]` / `data-message-author-role` shape. It recognizes explicit `data-turn="user"` and `data-turn="assistant"` shells while retaining intermediate and legacy fallbacks.

Because auxiliary status/citation/tool UI can also live inside a turn, the direct-text fallback excludes common status/alert/progress, citation, attachment/file, tool/copy, hidden accessibility-label and interactive-control surfaces instead of assigning direction to every `div`/`span`.

One important negative rule from the audit: do **not** exclude every `[aria-live]` ancestor. Streaming assistant output may be hosted in a live region; excluding the entire region could suppress RTL for the actual answer. Exclusions are therefore narrower than that.

## Composer signals found across maintained projects

Common form signals:

- `form[data-chatgpt-composer]`
- `form[data-type="unified-composer"]`
- `form[data-mobile-composer]`

Prompt editor signals:

- `[data-composer-markdown][contenteditable="true"]`
- `[data-testid="prompt-textarea"]`
- `#prompt-textarea`
- `div#prompt-textarea.ProseMirror`
- `textarea[data-mobile-composer-prompt]`
- `#mobile-composer-prompt`
- `textarea[name="prompt"]`
- `[contenteditable="true"][role="textbox"]`
- `[contenteditable="true"][data-lexical-editor="true"]`

Send/control signals:

- `button[data-testid="composer-send-button"]`
- `button[data-testid="send-button"]`
- `button[data-testid*="send-button"]`
- `button[data-composer-submit]`
- `#composer-submit-button`
- `button[type="submit"]`
- aria-label fallbacks containing Send/Submit
- explicit Stop/Abort/Cancel metadata detection

The send slot can turn into a Stop control while generation is active. Earlier logic merely rejected Stop controls, which could make the injected toggle jump to an unrelated nearby mic/attachment control. The 0.5 runtime now resolves Send and Stop separately and deliberately anchors to the active Send/Stop slot, while still excluding Stop from generic fallback scoring.

Public implementations also show toolbars can live outside the editor's immediate form, so placement performs a bounded ancestor search rather than assuming controls are form descendants.

Trailing/footer areas:

- `[data-testid="composer-trailing-actions"]`
- `[data-testid="composer-footer-actions"]`
- `[data-testid="composer-actions"]`
- `[data-composer-trailing]` — **observed live 2026-09-29**

### September 29 live DOM observations

Live unauthenticated inspection of `chatgpt.com` (2026-09-29) revealed:

- The unauthenticated form uses `form[data-mobile-composer]` with `textarea[data-mobile-composer-prompt]` (`#mobile-composer-prompt`). Authenticated sessions are expected to use `form[data-chatgpt-composer]` with `div#prompt-textarea.ProseMirror`.
- The trailing control row uses `[data-composer-trailing]` (not the older `data-testid="composer-trailing-actions"`).
- The send/stop button is now a **single unified element** carrying both `data-send-label="Send message"` and `data-stop-label="Stop generating"` as permanent attributes. The active state is determined by `aria-label` switching between the two labels. The `looksLikeStop` function was updated to prioritize `aria-label` (and `data-testid`) over `data-stop-label` to avoid false-positive Stop classification.

## Conversation/message signals

- `[data-message-author-role="assistant"]`
- `[data-message-author-role="user"]`
- `[data-turn="assistant"]`
- `[data-turn="user"]`
- `[data-turn-key]`
- `[data-content-search-unit-key]`
- `[data-chatgpt-search-unit-key]`
- `article[data-turn]`
- `section[data-turn]`
- `[data-testid^="conversation-turn"]`

Assistant content commonly exposes `.markdown` / `.prose`; user content commonly exposes `.whitespace-pre-wrap`. Intermediate/current 2026 builds have also exposed `[data-markdown-text-style="assistant-message"]` and `[data-user-message-bubble]`.

The adapter marks lists/tables at the turn level too, not only inside a known `.markdown` wrapper. That protects against a wrapper rename while keeping the scope limited to positively identified conversation turns.

Nested turn-like markers are deduplicated into top-level scan roots to avoid repeatedly rescanning the same rendered answer.

## RTL / bidi implementation lessons

- Never mirror the full application shell just to fix message text.
- Use logical list indentation (`padding-inline-*`) rather than left/right padding hacks.
- Keep code/preformatted content, KaTeX/MathJax and editor widgets LTR + isolated.
- Keep table structure LTR so column order is stable; direction can be applied inside cells.
- Isolate links/technical islands so punctuation does not spill into surrounding RTL text.
- For ordinary prose/composer/table-cell text, `unicode-bidi: plaintext` is preferable to one forced embedding because it lets each text block follow Unicode first-strong behavior while the extension still controls visual alignment.
- Prefer semantic boundaries and explicit runtime markers over generated class names.

## Mutation / streaming lessons

A naïve observer that rescans on every `characterData` mutation can do excessive work while ChatGPT streams token by token.

The 0.5 runtime therefore separates:

- **content work** — queued/deduplicated and flushed in a short batch; and
- **placement work** — separately debounced and only triggered by composer/control/conversation lifecycle signals.

This also handles a second lifecycle edge case: a read-only conversation can appear after initial page load, and the conversation can later disappear during SPA navigation. The floating fallback must be created/removed in both directions rather than only during initial boot.

## Preference persistence lessons

The extension persists only a direction preference. Version 0.5 stores it as:

```text
{ mode: "rtl" | "ltr", updatedAt: <timestamp> }
```

The runtime reads both `chrome.storage.sync` and `chrome.storage.local`, chooses the newer valid record, heals a stale/missing copy, and migrates the earlier raw string format. This avoids treating `local` as permanently secondary when sync temporarily fails or is delayed.

No conversation text is stored.

## Chrome extension architecture decisions

- Manifest V3 content script; no framework or backend.
- Only the named `storage` permission.
- Site access comes from `content_scripts.matches`; no broad `host_permissions` entry is needed for this static content-script use.
- Preference is mirrored between `chrome.storage.sync` and `chrome.storage.local` with timestamp conflict resolution.
- The toolbar action sends a local message to the already-injected content script; no `tabs`, `activeTab` or `scripting` named permission is requested.
- No remote JavaScript/CSS, CDN, analytics, telemetry, backend or API calls.
- PNG action/store icons are bundled locally.

## Redundancy / failure handling

The extension has two user controls:

1. On-page Shadow DOM control placed near composer controls when possible.
2. Chrome toolbar action, independent of ChatGPT's internal control layout.

If the composer is absent in a shared/read-only conversation, the on-page control becomes a small fixed fallback. On unrelated non-chat pages it is removed. Conversation add/remove mutations are explicitly watched so this also works after SPA transitions rather than only at initial load.

## What public research cannot prove

Only a live authenticated ChatGPT session can prove that today's account-specific rendered UI still matches the selectors and that placement looks correct in every mode. `AGENTS.md` contains the full finishing checklist and `VALIDATION_STATUS.md` records exactly what is verified vs. still local-only.

## Public references consulted

- Chrome Extensions architecture and content scripts: https://developer.chrome.com/docs/extensions/develop
- Chrome Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome Extensions API reference / Manifest V3: https://developer.chrome.com/docs/extensions/reference/api
- `alexchexes` ChatGPT UI-fix userscript changelog/current selectors — 2026-09-26 markup rewrite
- `boabab/conversation-overview` — persistent `section[data-testid="conversation-turn-N"][data-turn="user|assistant"]` shell notes
- `doggy8088/ChatGPTToolkitExtension` — 2026 composer/send selectors and multi-frontend fallbacks
- `JuliusBrussee/caveman` — current editor/send selector fallbacks and Stop-control safety
- `shahinesi/chatgpt-persian-rtl` — scoped RTL / technical-island / `unicode-bidi: plaintext` patterns
