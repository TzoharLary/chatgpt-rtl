# ChatGPT DOM Architecture & Research Notes

This document records the reverse-engineering analysis of ChatGPT's DOM structure, layout transitions, and mutation patterns used to ensure **RTL for ChatGPT** remains stable and lightweight.

---

## 1. ChatGPT UI Architecture Overview

ChatGPT's web interface runs as a single-page application (SPA) with a custom React/Next.js frontend. The layout has evolved across several major iterations:

* **Octane / Mobile-Shell Architecture (Current 2026):**
  * Conversation turns are structured inside `<ol data-conversation-transcript>` using `<li data-message-role="user">` and `<li data-message-role="assistant">`.
  * Message bodies are rendered in containers with attributes such as `[data-assistant-markdown]` or `[data-user-message-copy]`.
  * Persistent shells use `section[data-testid^="conversation-turn-"][data-turn="user|assistant"]`.
* **Legacy & Intermediate Fallbacks:**
  * Earlier builds utilized `article[data-turn]` and `data-message-author-role="user|assistant"`.
  * The extension supports these shapes simultaneously to maintain compatibility across varying deployment flags.

---

## 2. Composer & Control Row Signals

### Editor Signals
* Main prompt editor uses `div#prompt-textarea.ProseMirror` (or `[data-composer-markdown][contenteditable="true"]`).
* Mobile / compact fallback: `textarea[data-mobile-composer-prompt]`, `#mobile-composer-prompt`.

### Send & Stop Controls
* In modern builds, the submit button is a unified button carrying both `data-send-label="Send message"` and `data-stop-label="Stop generating"` as permanent attributes. Its active state is determined by `aria-label`.
* The trailing control row is identified by `[data-composer-trailing]` or `[data-testid="composer-trailing-actions"]`.
* The extension prefers to inject its on-page toggle before dictation/microphone controls, with the active Send/Stop slot as a fallback.

---

## 3. Streaming & Mutation Performance

Naïve DOM observers that trigger full-tree scans on every `characterData` mutation cause significant CPU spikes during token-by-token streaming.

To limit redundant scanning:
1. **Separation of Concerns:**
   * **Content marking:** Batched and debounced (`CONTENT_SCAN_DELAY_MS`) via `contentQueue: new Set()`. Deduplicated to avoid redundant subtree traversals.
   * **Placement scans:** Only triggered by structural lifecycle events (composer mounting, turn addition, route changes).
2. **Zero Polling:**
   * No `setInterval` polling loops are used. All updates are strictly event-driven via `MutationObserver` and navigation lifecycle hooks.

---

## 4. Architectural Constraints & Security

* **Manifest V3:** Pure client-side extension without external background processes.
* **Minimal Permissions:** Only the `storage` permission is declared (for persisting the user's RTL/LTR preference across sessions and profiles).
* **Zero Telemetry:** No analytics, remote scripts, or external network requests.
* **Style scope:** The root mode attribute enables conversation/editor styles and runtime markers distinguish prose from technical or auxiliary UI. Compatibility selectors and semantic fallbacks are broader than those markers; see [`bidi-architecture.md`](./bidi-architecture.md) for their validation limits.

## 5. Authenticated inline-markup observation — 2026-10-07

In the inspected conversation, ChatGPT wrapped ordinary inline text runs in `span`, including text inside `strong` and text adjacent to `bdi`. A single `p` could contain an English example followed by `br` and its Hebrew translation. These spans are formatting runs, not independent prose blocks: giving each one `unicode-bidi: isolate` reordered English fragments and hid boundary spaces. The corrected implementation and the limits of the live checks are recorded in [`bidi-architecture.md`](./bidi-architecture.md) and [`validation-2026-10-07.md`](./validation-2026-10-07.md). This observation describes the inspected deployment, not every ChatGPT rollout.
