# Bidirectional text architecture

## Where to make changes

- [`ui.js`](../ui.js) sets `data-chatgpt-rtl-mode` on the document root and batches content updates separately from composer placement.
- [`core.js`](../core.js) identifies conversation content, marks its direction and handles punctuation and arrows.
- [`styles.css`](../styles.css) applies direction, alignment and isolation using those markers.

## Behavior to preserve

- **Prose.** In RTL mode, paragraphs containing Hebrew or Arabic are right-aligned. English-only paragraphs stay LTR and left-aligned. In LTR mode, both use left-to-right layout.
- **Inline formatting.** Ordinary spans and bold text share the paragraph's text flow. Isolating each span can reorder English words or hide visible spaces. Links, explicit `bdi` elements and technical content retain isolation.
- **Explicit line breaks.** A mixed RTL paragraph with `br` uses `unicode-bidi: plaintext` so an English example and its Hebrew translation can take different base directions. Punctuation normalization considers each line separately and can add a right-to-left mark (`U+200F`) to eligible text on lines containing RTL characters.
- **Technical content and layout.** Code and recognized math stay LTR. Tables keep their column order and center cell text in RTL mode. List indentation follows the selected direction. The composer and inline message editor use the selected direction with `unicode-bidi: normal`.
- **Mode switches.** In RTL prose, arrow and punctuation normalization can change DOM text. Switching to LTR reverses arrow conversion and removes right-to-left marks from processed elements.

## Regression checks

Run `./scripts/test-dom.sh` after changing direction rules or selectors. The
[browser harness](../tests/dom-harness.html) covers mixed inline formatting,
spacing, punctuation, narrow wrapping and RTL/LTR round trips. For selector
changes, see [ChatGPT page structure](research.md) and include a fixture that
checks nearby UI as well as the target content.
