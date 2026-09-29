# Research notes — ChatGPT RTL

Last research pass: **2026-09-29**.

This file records the public evidence used to make the extension resilient before live authenticated testing.

## September 26, 2026 markup rewrite

A heavily maintained ChatGPT UI userscript reported on **2026-09-26** that OpenAI had rewritten the web UI markup. Its same-day selectors use `div#prompt-textarea.ProseMirror` for the composer and `[data-turn]` for chat turns.

A separate userscript updated later documents persistent shells in the form `section[data-testid="conversation-turn-N"][data-turn="user|assistant"]`, with message bodies virtualized in/out while the shells remain.

The extension therefore does not rely only on the older `article[data-turn]` / `data-message-author-role` shape. It recognizes explicit `data-turn="user"` and `data-turn="assistant"` shells while retaining intermediate and legacy fallbacks.

Because auxiliary status/citation/tool UI can also live inside a turn, the direct-text fallback excludes common status/alert/progress, citation, attachment/file, tool and copy-control surfaces instead of blindly assigning direction to every `div`/`span`.

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

Send-control signals:

- `button[data-testid="composer-send-button"]`
- `button[data-testid="send-button"]`
- `button[data-composer-submit]`
- `#composer-submit-button`
- `button[type="submit"]`
- aria-label fallbacks containing Send/Submit

The send slot can turn into a Stop control while generation is active. The runtime rejects controls whose metadata looks like Stop/Abort/Cancel and watches relevant attributes as well as DOM replacement.

Public implementations also show toolbars can live outside the editor's immediate form, so placement performs a bounded ancestor search rather than assuming controls are form descendants.

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

Assistant content commonly exposes `.markdown` / `.prose`; user content commonly exposes `.whitespace-pre-wrap`. Intermediate 2026 builds have also exposed `[data-markdown-text-style="assistant-message"]` and `[data-user-message-bubble]`.

## RTL implementation lessons

- Never mirror the full application shell just to fix message text.
- Use logical list indentation (`padding-inline-*`) rather than left/right padding hacks.
- Keep code/preformatted content, KaTeX/MathJax and editor widgets LTR.
- Keep table structure LTR so column order is stable; direction can be applied inside cells.
- Use bidi isolation for technical/link islands so punctuation does not spill into surrounding RTL text.
- Prefer semantic boundaries and explicit runtime markers over generated class names.

## Chrome extension architecture decisions

- Manifest V3 content script; no framework or backend.
- Only the named `storage` permission.
- Site access comes from `content_scripts.matches`; no broad `host_permissions` entry is needed for this static content-script use.
- `chrome.storage.sync` is preferred and mirrored to `chrome.storage.local` as a fallback.
- The toolbar action sends a local message to the already-injected content script; no `tabs`, `activeTab` or `scripting` named permission is requested.
- No remote JavaScript/CSS, CDN, analytics, telemetry, backend or API calls.
- PNG action/store icons are bundled locally.

## Redundancy / failure handling

The extension has two user controls:

1. On-page Shadow DOM control placed near composer controls when possible.
2. Chrome toolbar action, independent of ChatGPT's internal control layout.

If the composer is absent in a shared/read-only conversation, the on-page control becomes a small fixed fallback. On unrelated non-chat pages it is removed.

The MutationObserver distinguishes prose streaming from composer/control structure changes so ordinary token streaming does not trigger expensive placement rescans.

## Remaining thing public research cannot prove

Only a live authenticated ChatGPT session can prove that today's account-specific rendered UI still matches the selectors and that placement looks correct in every mode. `AGENTS.md` contains the final checklist.

## Public references consulted

- Chrome Extensions architecture and content scripts: https://developer.chrome.com/docs/extensions/develop
- Chrome Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome Extensions API reference / Manifest V3: https://developer.chrome.com/docs/extensions/reference/api
- `alexchexes` ChatGPT UI-fix userscript changelog/current selectors — 2026-09-26 markup rewrite
- `boabab/conversation-overview` — persistent `section[data-testid="conversation-turn-N"][data-turn="user|assistant"]` shell notes
- `doggy8088/ChatGPTToolkitExtension` — 2026 composer/send selectors and multi-frontend fallbacks
- `JuliusBrussee/caveman` — current editor/send selector fallbacks and Stop-control safety
- `shahinesi/chatgpt-persian-rtl` — scoped RTL / technical-island patterns
