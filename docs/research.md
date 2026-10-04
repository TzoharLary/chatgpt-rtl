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
* The extension injects its on-page toggle directly preceding the active Send/Stop slot in this row.

---

## 3. Streaming & Mutation Performance

Naïve DOM observers that trigger full-tree scans on every `characterData` mutation cause significant CPU spikes during token-by-token streaming.

To eliminate performance overhead:
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
* **Local Isolation:** Custom styles are scoped strictly via root and dataset selectors (`data-chatgpt-rtl-*`), ensuring the surrounding ChatGPT application shell (sidebar, navigation, settings, modals) remains unaltered.
