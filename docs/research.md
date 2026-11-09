# ChatGPT page structure

ChatGPT can change its markup independently of the extension. Use the signals
below when investigating selector regressions. They describe layouts the code
recognizes.

## Conversation turns

`core.js` recognizes role-based list items (`li[data-message-role]`), turn
containers such as `section[data-turn]` and `article[data-turn]`, and older
`data-message-author-role` markup. It also uses message body markers such as
`data-assistant-markdown` and `data-user-message-bubble`.

When adding a selector, test it with tool or status elements and with unrelated
page controls. A user prompt can be wrapped in a button, so interactive
elements cannot all be handled as a single category.

## Composer and toggle placement

The composer lookup uses signals such as `form[data-chatgpt-composer]`,
`#prompt-textarea`, `[data-composer-markdown][contenteditable="true"]` and
`textarea[data-mobile-composer-prompt]`. Controls may sit outside the form.

The placement logic in `ui.js` looks for dictation, Send, then Stop before
falling back to the trailing controls and nearby composer controls. A floating
toggle is available when placement beside the composer is unavailable or a
conversation is read-only.

## Testing layout changes

Add a minimal reproduction to [the DOM harness](../tests/dom-harness.html)
and run `./scripts/test-dom.sh`. Include the relevant transition when the
bug only appears after navigation, composer replacement or streaming.

See [bidirectional text architecture](bidi-architecture.md) for prose
markers and [performance checks](performance.md) for observer regressions.
