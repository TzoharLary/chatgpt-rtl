# Bidi Architecture & Blink Space Loss Analysis

This document details the bidirectional (Bidi) text rendering challenges encountered during development, the underlying browser engine bugs, the architectural design decisions, and the verified resolution in **RTL for ChatGPT**.

---

## 1. Visual Symptoms & Issues Identified

In live ChatGPT conversations containing mixed Hebrew/Arabic, English, code, bold styling, and punctuation, two severe rendering regressions were observed:

1. **Bidi Whitespace Collapse (Word Gluing):**
   * *Observed Symptom:* Text such as `"שהוא לא אומר ש-"` rendered on screen as `"שהואלא אומר ש-"`.
   * *Context:* The word `"לא"` was enclosed in an inline element (`<strong>לא</strong>`). The space preceding or succeeding the tag disappeared visually, gluing the words together.
2. **Neutral Character & Punctuation Flipping:**
   * *Observed Symptom:* Hyphens (`—`), commas, quotation marks, and parentheses adjacent to English terms (such as `CompanyFacts`) or inline code blocks jumped to the opposite side of the clause or inverted the sentence reading order.

---

## 2. Root Cause Analysis

### The Flaw of `unicode-bidi: plaintext`

The initial implementation used:

```css
html[data-chatgpt-rtl-mode="rtl"] [data-chatgpt-rtl-text="1"] {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important; /* Root cause */
}
```

While `plaintext` was originally introduced to allow first-strong heuristics, it introduced severe edge cases:

1. **Conflict with Explicit `direction: rtl`:**
   Per the W3C CSS Writing Modes specification, `plaintext` causes the layout engine to ignore the element's CSS `direction` property and determine the base paragraph direction entirely from the first strong character (Unicode Bidirectional Algorithm rules P2 and P3).
2. **WebKit / Blink Whitespace Collapse Bug:**
   When `plaintext` is assigned to a container with inline formatting children (`<strong>`, `<em>`, `<code>`), the layout engine creates isolation boundaries around inline boxes. In Chromium's Blink and Safari's WebKit engines, neutral space characters (`\u0020`) bordering these isolation boundaries are collapsed or assigned to the wrong Bidi run, visually eliminating the whitespace.
3. **Punctuation Misattribution:**
   With `plaintext`, neutral punctuation trailing or leading an embedded Latin/code run is absorbed into the LTR segment rather than staying anchored to the overarching RTL paragraph direction.

---

## 3. CSS Writing Modes Comparison

| Property Value | Adherence to `direction: rtl` | Inline Element Handling | Whitespace Loss Risk | Suitability for RTL Prose |
| :--- | :--- | :--- | :--- | :--- |
| **`plaintext`** | Ignores `direction` | Forces isolation boundaries per child | **High** (known Blink bug) | ❌ Broken spaces, flipped punctuation |
| **`isolate`** | Respects `direction` | Isolates container from siblings | Medium (if nested) | Ideal for code/links, not broad prose |
| **`embed`** | **Strictly respects `direction`** | **Preserves natural inline text flow** | **Zero** | ✅ **Optimal for conversation prose** |
| **`normal`** | Inherited flow | No layout intervention | Zero | ✅ Ideal for interactive composer |

---

## 4. Architectural Solution (v0.5.8)

### 1. Root Message Containers (`.markdown`, `.prose`, `[data-assistant-markdown]`, `[data-user-message-bubble]`)
* Assigned `direction: rtl !important;` and `text-align: right !important;` in RTL mode (and `direction: ltr` in LTR mode).
* Establishing the overarching base direction for the entire message turn prevents the surrounding ChatGPT LTR application shell from imposing an LTR boundary at paragraph exit.

### 2. Conversation Prose & Dual Classification (`[data-chatgpt-rtl-text="rtl|ltr"]`)
* Assigned `direction: rtl !important;`, `text-align: right !important;`, and `unicode-bidi: isolate !important;` for RTL/mixed elements.
* `isolate` establishes an independent directional boundary per paragraph and list item. This guarantees that trailing neutral punctuation (`.`, `?`, `!`, `:`, `,`) following plain English text resolves to the RTL paragraph level (Rule N2) and renders at the far left.
* **Dual Script Classification:** Purely Latin/English paragraphs without any Hebrew/Arabic characters are tagged as `data-chatgpt-rtl-text="ltr"` and given `direction: ltr !important; text-align: left !important; unicode-bidi: isolate !important;`, ensuring English blocks keep their periods on the right and left-aligned margins without being scrambled by the RTL container.

### 3. Semantic Arrow Normalization
* In Hebrew prose, chronological reading flow is right-to-left. Standard forward flow arrows (`→`, `⇒`, `⟶`) emitted by LLMs point rightwards (backwards to the preceding step).
* `core.js` detects forward arrows in Hebrew prose text nodes and normalizes them to point leftwards (`←`, `⇐`, `⟵`), aligning with Hebrew reading order.
* Technical content (`<code>`, `<pre>`) is strictly exempted: arrows in code (`A → B → C`) remain rightwards in LTR.
* On mode toggle to LTR, converted arrows revert to their original rightward form.

### 4. Technical Content & Code Blocks (`[data-chatgpt-rtl-technical="1"]` & `[data-chatgpt-rtl-island="1"]`)
* Code blocks (`<pre>`, `<code>`), KaTeX mathematical expressions, and URLs retain `direction: ltr !important;` and `unicode-bidi: isolate !important;`.
* This strictly confines Latin code and symbols to LTR without leaking directionality into surrounding Hebrew prose.

### 5. Interactive Composer Editor (`[data-chatgpt-rtl-composer="1"]`)
* Set to `direction: rtl !important;`, `text-align: right !important;`, and `unicode-bidi: normal !important;`.
* This prevents ProseMirror / contenteditable cursor jumping and input glitches during active typing.

### 6. Markdown Tables (`[data-chatgpt-rtl-table="1"]`)
* Table structure (`<table>`, `<thead>`, `<tbody>`, `<tr>`) remains `direction: ltr !important;` to ensure column order is preserved.
* Cells and headers (`<th>`, `<td>`, `caption`) receive `direction: rtl !important;`, `text-align: center !important;`, and `unicode-bidi: isolate !important;`. Centering eliminates awkward gaps and alignment mismatches between Hebrew descriptions, English identifiers, numbers, and currency.

---

## 5. Verification

This architecture was validated both in synthetic test suites (`tests/dom-harness.html`) and in authenticated live ChatGPT Plus sessions, confirming 100% preservation of whitespace, natural punctuation ordering for sentences ending in English, reliable LTR isolation for technical blocks and pure English paragraphs, centered table layouts, and natural leftward arrow flow in Hebrew.
