# Bidi architecture — RTL for ChatGPT 0.6.2

This document describes the current implementation and the observed October 7
regression. Validation results and their limits are recorded in
[`validation-2026-10-07.md`](./validation-2026-10-07.md).

## Direction ownership

`ui.js` sets `data-chatgpt-rtl-mode` on the document root. `core.js` identifies
conversation prose, lists, tables, technical content, and the composer.
`styles.css` uses those markers and message selectors to apply direction.

Prose containing Hebrew/Arabic characters receives `data-chatgpt-rtl-text="rtl"`.
Pure English prose receives `data-chatgpt-rtl-text="ltr"`. In RTL mode, mixed
prose is right-aligned and pure English blocks remain LTR/left-aligned. In LTR
mode, both classifications use LTR/left alignment. The current runtime also sets
`dir="rtl"` and inline direction/alignment on RTL prose, removing those properties
when it processes the element in LTR mode.

Ordinary prose blocks use `unicode-bidi: isolate`. Inline formatting runs inside
semantic prose inherit the enclosing text flow. They are not separate paragraphs.
Technical content, links, and explicit `bdi` elements retain isolation.

## October 7 regression: inline spans around bold text

The authenticated ChatGPT DOM contained this shape:

```html
<p>
  <span>I recommend that he </span>
  <strong><span>be given</span></strong>
  <span> another chance.</span><br>
  <span>אני ממליץ </span>
  <strong><span>שתינתן לו</span></strong>
  <span> הזדמנות נוספת.</span>
</p>
```

The direct-text fallback previously classified and isolated every inline span.
In an RTL paragraph, the English fragments then rendered in the wrong order.
Spaces also disappeared visually in `growing children = ` / Hebrew translation
and `given = ` / `סביל`, despite remaining in the source text. This was verified
against the live DOM, rather than inferred from the screenshots alone.

`markDirectFallback` now skips spans whose ancestors include semantic prose.
The paragraph owns their text flow; fallback spans outside such prose remain
eligible for marking. No words or ordinary source spaces are rewritten by this fix.

## English examples followed by Hebrew translations

A mixed `p` containing `br` uses `unicode-bidi: plaintext` in RTL mode. This lets
the browser determine the base direction separately for explicit lines while
keeping inline spans and bold text in a continuous flow. LTR mode continues to
use the explicit LTR paragraph direction.

Punctuation normalization collects inline text nodes by explicit `br` boundaries.
It adds an RLM (`U+200F`) only to eligible text in lines containing RTL characters.
An English example does not receive an RLM merely because its Hebrew translation
shares the paragraph. Nested semantic prose is processed by its own scan.

The earlier documentation attributed all whitespace failures to a general
Blink/WebKit `plaintext` bug. The October 7 evidence establishes a narrower
extension-side cause: isolated inline runs. It does not establish a universal
browser-engine defect or a guarantee for every mixed-direction case. See the
[CSS Writing Modes specification](https://www.w3.org/TR/css-writing-modes-4/#unicode-bidi)
for the defined behavior of `isolate`, `normal`, and `plaintext`.

## Existing technical and layout handling

- `pre`, `code`, keyboard/preformatted text, and recognized math are marked as
  technical content and use LTR direction with isolation.
- Table structure remains LTR to retain column order. In RTL mode, cells and
  headers use RTL direction, centered alignment, and isolation.
- Lists use logical indentation so their markers follow the selected mode,
  including nested lists.
- The composer and inline user-message editor use the selected direction with
  `unicode-bidi: normal`.
- Existing arrow normalization converts forward arrows in RTL prose and restores
  them in LTR mode. Existing punctuation normalization removes RLMs from marked
  elements when toggling to LTR. These routines modify DOM text; they should not be
  described as preserving every original directional control in arbitrary input.

## Runtime and validation boundaries

Content mutations are batched separately from composer placement work. The
October 7 harness covers direct text updates in inline spans, visual English
character order and punctuation, measured spaces, 240px wrapping, and RTL/LTR
roundtrips, alongside the existing composer/storage/content tests.

Message detection includes stable attributes and broad compatibility fallbacks,
including `article`, class-fragment selectors, and document-wide semantic scans.
These fallbacks need retesting after ChatGPT changes; this document does not
guarantee that every future application-shell element will remain unaffected.
The focused live checks recorded for October 7 are not a complete production or
Chrome Web Store submission checklist.
