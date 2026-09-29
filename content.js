(() => {
  'use strict';

  if (globalThis.__CHATGPT_RTL_LOADED__) return;
  globalThis.__CHATGPT_RTL_LOADED__ = true;

  const STORAGE_KEY = 'chatgpt_rtl_mode';
  const ROOT_ATTR = 'data-chatgpt-rtl-mode';
  const HOST_ID = 'chatgpt-rtl-toggle-host';
  const TOGGLE_MESSAGE = 'chatgpt-rtl:toggle';
  const TEXT_MARK_ATTR = 'data-chatgpt-rtl-text';

  // Current ChatGPT exposes several front-ends in parallel. Keep semantic/current
  // selectors first and older shapes as fallbacks. Avoid generated utility classes.
  const COMPOSER_FORM_SELECTORS = [
    'form[data-chatgpt-composer]',
    'form[data-type="unified-composer"]',
    'form[data-mobile-composer]',
  ];

  const STRONG_EDITOR_SELECTORS = [
    '[data-composer-markdown][contenteditable="true"]',
    '[data-testid="prompt-textarea"]',
    '#prompt-textarea',
    'textarea[data-mobile-composer-prompt]',
    '#mobile-composer-prompt',
    'textarea[name="prompt"]',
    'textarea[data-testid*="prompt"]',
  ];

  // These are common rich-editor shapes but are too generic to trust across the
  // entire application. Outside a known composer form they need extra heuristics.
  const FALLBACK_EDITOR_SELECTORS = [
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][data-lexical-editor="true"]',
    'div.ProseMirror[contenteditable="true"]',
  ];

  const EDITOR_SELECTORS = [...STRONG_EDITOR_SELECTORS, ...FALLBACK_EDITOR_SELECTORS];

  const SEND_SELECTORS = [
    'button[data-testid="composer-send-button"]',
    'button[data-testid="send-button"]',
    'button[data-composer-submit]',
    '#composer-submit-button',
    'button[type="submit"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[aria-label*="Submit"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="שלח"]',
  ];

  const TURN_SELECTOR = [
    '[data-message-author-role]',
    '[data-turn-key]',
    '[data-content-search-unit-key]',
    '[data-chatgpt-search-unit-key]',
    'article[data-turn]',
    '[data-testid^="conversation-turn"]',
  ].join(',');

  const SEMANTIC_TEXT_SELECTOR = [
    '.markdown',
    '.prose',
    '.whitespace-pre-wrap',
    '[data-testid="user-message"]',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'li',
    'blockquote',
    'dt',
    'dd',
    'figcaption',
    'summary',
  ].join(',');

  const TECHNICAL_OR_INTERACTIVE_SELECTOR = [
    'pre',
    'code',
    'kbd',
    'samp',
    'var',
    'table',
    '.katex',
    '.MathJax',
    'mjx-container',
    '[data-math]',
    '[data-math-source]',
    '[role="math"]',
    'math',
    'svg',
    'a',
    '[role="link"]',
    'button',
    '[role="button"]',
    'input',
    'select',
    'textarea',
    '[contenteditable="true"]',
  ].join(',');

  const STOP_PATTERN = /\b(stop|abort|cancel)\b|עצור|הפסק|توقف|إيقاف|停止|중지/i;

  const BUTTON_CSS = `
    :host {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      color: inherit;
      font: inherit;
      z-index: 2147483647;
    }
    :host([data-placement="floating"]) {
      position: fixed;
      right: 20px;
      bottom: 92px;
    }
    button {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0 4px 0 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.78;
      transition: background-color 120ms ease, opacity 120ms ease;
    }
    button:hover,
    button:focus-visible {
      background: color-mix(in srgb, currentColor 10%, transparent);
      opacity: 1;
      outline: 2px solid color-mix(in srgb, currentColor 35%, transparent);
      outline-offset: 2px;
    }
    svg {
      width: 17px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      transition: transform 180ms ease;
    }
    button[data-mode="rtl"] svg { transform: scaleX(-1); }
    :host([data-placement="floating"]) button {
      margin: 0;
      background: Canvas;
      color: CanvasText;
      box-shadow: 0 1px 7px rgb(0 0 0 / 20%);
      opacity: 0.96;
    }
    @media (prefers-reduced-motion: reduce) {
      button, svg { transition: none; }
    }
  `;

  const STATE = {
    mode: 'rtl',
    host: null,
    composer: null,
    composerForm: null,
    anchor: null,
    observer: null,
    resizeObserver: null,
    lastUrl: location.href,
    refreshTimer: null,
  };

  function queryAll(root, selector) {
    try {
      return Array.from((root || document).querySelectorAll(selector));
    } catch (_) {
      return [];
    }
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getAttribute('aria-hidden') !== 'true'
    );
  }

  function isInsideConversation(element) {
    return Boolean(element?.closest?.(TURN_SELECTOR));
  }

  function pickVisible(selectorList, root = document) {
    for (const selector of selectorList) {
      const match = queryAll(root, selector).find((el) => isVisible(el) && !isInsideConversation(el));
      if (match) return match;
    }
    return null;
  }

  const NON_COMPOSER_LABEL_PATTERN = /\b(search|find|filter)\b|חפש|חיפוש|بحث|搜索|搜尋|検索|검색/i;
  const COMPOSER_LABEL_PATTERN = /\b(message|prompt|ask|chat|send|type|write)\b|הודעה|שאל|כתוב|הקלד|שלח|رسالة|اكتب|发送|傳送|送信|메시지/i;

  function editorMetadata(element) {
    return [
      element?.getAttribute?.('aria-label'),
      element?.getAttribute?.('placeholder'),
      element?.getAttribute?.('data-placeholder'),
      element?.getAttribute?.('name'),
      element?.id,
      element?.getAttribute?.('data-testid'),
    ].filter(Boolean).join(' ');
  }

  function isLikelyComposerEditor(element, knownForm = null) {
    if (!element || !isVisible(element) || isInsideConversation(element)) return false;
    if (knownForm && knownForm.contains(element)) return true;
    if (STRONG_EDITOR_SELECTORS.some((selector) => element.matches(selector))) return true;

    const form = element.closest('form');
    if (form && !isInsideConversation(form)) return true;

    const meta = editorMetadata(element);
    if (NON_COMPOSER_LABEL_PATTERN.test(meta)) return false;
    return COMPOSER_LABEL_PATTERN.test(meta);
  }

  function getComposerForm() {
    for (const selector of COMPOSER_FORM_SELECTORS) {
      const forms = queryAll(document, selector).filter((form) => !isInsideConversation(form));
      const visible = forms.find(isVisible);
      if (visible) return visible;
    }

    // Strong editor signals may survive a form redesign. Generic textboxes are
    // intentionally not used here unless their own form/metadata identifies them
    // as chat input; this avoids mistaking sidebar search for the composer.
    const strongEditor = pickVisible(STRONG_EDITOR_SELECTORS);
    if (strongEditor) return strongEditor.closest('form') || null;

    for (const selector of FALLBACK_EDITOR_SELECTORS) {
      const editor = queryAll(document, selector).find((el) => isLikelyComposerEditor(el));
      if (editor) return editor.closest('form') || null;
    }
    return null;
  }

  function getComposer(form = null) {
    const root = form || document;
    for (const selector of EDITOR_SELECTORS) {
      const candidates = queryAll(root, selector).filter((el) => isLikelyComposerEditor(el, form));
      if (!candidates.length) continue;
      // If a responsive layout leaves multiple editors in the DOM, the active one
      // is generally the lowest visible editor.
      return candidates.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    }
    return null;
  }

  function buttonLooksLikeStop(button) {
    if (!button) return false;
    const meta = [
      button.getAttribute('aria-label'),
      button.getAttribute('data-testid'),
      button.getAttribute('data-stop-label'),
      button.title,
      button.textContent,
    ].filter(Boolean).join(' ');
    return STOP_PATTERN.test(meta);
  }

  function getSendButton(form) {
    if (!form) return null;

    for (const selector of SEND_SELECTORS) {
      const candidates = queryAll(form, selector).filter((button) => !buttonLooksLikeStop(button));
      const visible = candidates.find(isVisible);
      if (visible) return visible;
      // A disabled/temporarily hidden submit button is still a useful structural anchor.
      const connected = candidates.find((button) => button.isConnected && button.parentElement);
      if (connected) return connected;
    }
    return null;
  }

  function getFallbackControlAnchor(form, composer) {
    if (!form) return null;
    const controls = queryAll(form, 'button,[role="button"]').filter((el) => isVisible(el) && !buttonLooksLikeStop(el));
    if (!controls.length) return null;

    const composerRect = composer?.getBoundingClientRect?.();
    return controls.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      if (composerRect) {
        const ad = Math.abs(ar.bottom - composerRect.bottom);
        const bd = Math.abs(br.bottom - composerRect.bottom);
        if (ad !== bd) return ad - bd;
      }
      return br.right - ar.right;
    })[0];
  }

  function hasConversation() {
    return Boolean(document.querySelector(TURN_SELECTOR));
  }

  function getTurnRole(turn) {
    const explicit = (turn.getAttribute('data-message-author-role') || turn.getAttribute('data-turn') || '').toLowerCase();
    if (explicit === 'user' || explicit === 'assistant') return explicit;

    const key = [
      turn.getAttribute('data-content-search-unit-key'),
      turn.getAttribute('data-chatgpt-search-unit-key'),
    ].filter(Boolean).join(' ').toLowerCase();
    if (key.endsWith(':user') || key.includes(':user ')) return 'user';
    if (key.endsWith(':assistant') || key.includes(':assistant ')) return 'assistant';

    const nested = turn.querySelector('[data-message-author-role="user"],[data-message-author-role="assistant"]');
    return nested?.getAttribute('data-message-author-role') || '';
  }

  function markTextElement(element) {
    if (!element || !element.isConnected) return;
    if (!element.textContent?.trim()) return;
    if (element.matches(TECHNICAL_OR_INTERACTIVE_SELECTOR)) return;
    if (element.closest(TECHNICAL_OR_INTERACTIVE_SELECTOR)) return;
    element.setAttribute(TEXT_MARK_ATTR, '1');
  }

  function markDirectTextFallback(root, turn) {
    const role = getTurnRole(turn);
    if (role !== 'user' && role !== 'assistant') return;

    const candidates = [];
    if (root instanceof Element && root.matches('div,span')) candidates.push(root);
    candidates.push(...queryAll(root, 'div,span'));

    for (const element of candidates) {
      if (element.matches(TECHNICAL_OR_INTERACTIVE_SELECTOR) || element.closest(TECHNICAL_OR_INTERACTIVE_SELECTOR)) continue;
      const hasDirectText = Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (!hasDirectText) continue;
      const hasBlockChild = Boolean(element.querySelector('p,div,ul,ol,pre,table,blockquote'));
      if (!hasBlockChild) markTextElement(element);
    }
  }

  function markTurn(turn) {
    if (!turn || !turn.isConnected) return;

    for (const element of queryAll(turn, SEMANTIC_TEXT_SELECTOR)) markTextElement(element);
    // Direct-text fallback is intentionally limited to confirmed conversation
    // roles so arbitrary ChatGPT UI wrappers never get marked as prose.
    markDirectTextFallback(turn, turn);
  }

  function scanConversation(root = document) {
    if (root instanceof Element && root.matches(TURN_SELECTOR)) markTurn(root);
    for (const turn of queryAll(root, TURN_SELECTOR)) markTurn(turn);
  }

  function scanAddedElement(root) {
    if (!(root instanceof Element)) return;

    if (root.matches(TURN_SELECTOR)) {
      markTurn(root);
      return;
    }

    const nestedTurns = queryAll(root, TURN_SELECTOR);
    if (nestedTurns.length) {
      for (const turn of nestedTurns) markTurn(turn);
      return;
    }

    // Streaming commonly inserts a paragraph/span deep inside an existing turn.
    // Do not rescan the entire growing answer for every token/chunk: mark only
    // the newly inserted subtree. CSS covers the standard markdown/prose shapes.
    const turn = root.closest(TURN_SELECTOR);
    if (!turn) return;

    if (root.matches(SEMANTIC_TEXT_SELECTOR)) markTextElement(root);
    for (const element of queryAll(root, SEMANTIC_TEXT_SELECTOR)) markTextElement(element);
    markDirectTextFallback(root, turn);
  }

  async function loadMode() {
    // Do not pass a default value to sync.get(): a default would make a missing
    // sync key look real and could mask a valid local fallback value.
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      if (result[STORAGE_KEY] === 'rtl' || result[STORAGE_KEY] === 'ltr') {
        STATE.mode = result[STORAGE_KEY];
        return;
      }
    } catch (_) {
      // Managed/disabled sync can fail. Try local storage next.
    }

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY] === 'rtl' || result[STORAGE_KEY] === 'ltr') {
        STATE.mode = result[STORAGE_KEY];
        return;
      }
    } catch (_) {
      // Current-page behavior still works without persistence.
    }

    STATE.mode = 'rtl';
  }

  async function saveMode(mode) {
    // Mirror the tiny preference in both areas. Sync is the preferred source,
    // while local storage is a durable fallback if sync later becomes unavailable.
    await Promise.allSettled([
      chrome.storage.sync.set({ [STORAGE_KEY]: mode }),
      chrome.storage.local.set({ [STORAGE_KEY]: mode }),
    ]);
  }

  function makeHost() {
    let host = document.getElementById(HOST_ID);
    if (host) {
      STATE.host = host;
      return host;
    }

    host = document.createElement('span');
    host.id = HOST_ID;
    host.setAttribute('data-chatgpt-rtl-host', '1');

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BUTTON_CSS;
    shadow.appendChild(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-live', 'polite');
    button.innerHTML = `
      <svg viewBox="0 0 18 14" aria-hidden="true">
        <line x1="1" y1="2" x2="17" y2="2"></line>
        <line x1="5" y1="7" x2="17" y2="7"></line>
        <line x1="10" y1="12" x2="17" y2="12"></line>
      </svg>
    `;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleMode();
    });

    shadow.appendChild(button);
    STATE.host = host;
    reflectButton();
    return host;
  }

  function reflectButton() {
    const button = STATE.host?.shadowRoot?.querySelector('button');
    if (!button) return;
    const rtl = STATE.mode === 'rtl';
    button.dataset.mode = STATE.mode;
    button.setAttribute('aria-pressed', String(rtl));
    button.setAttribute('aria-label', rtl ? 'RTL is on. Switch ChatGPT to LTR.' : 'LTR is on. Switch ChatGPT to RTL.');
    button.title = rtl ? 'RTL on — switch to LTR' : 'LTR on — switch to RTL';
  }

  function applyMode(mode) {
    STATE.mode = mode === 'ltr' ? 'ltr' : 'rtl';
    document.documentElement.setAttribute(ROOT_ATTR, STATE.mode);
    reflectButton();
  }

  async function toggleMode() {
    const next = STATE.mode === 'rtl' ? 'ltr' : 'rtl';
    applyMode(next);
    await saveMode(next);
    return next;
  }

  function clearResizeObserver() {
    try {
      STATE.resizeObserver?.disconnect();
    } catch (_) {
      // Optional enhancement only.
    }
    STATE.resizeObserver = null;
  }

  function setupResizeObserver(composer) {
    clearResizeObserver();
    if (!composer || typeof ResizeObserver === 'undefined') return;
    try {
      STATE.resizeObserver = new ResizeObserver(() => scheduleRefresh(100));
      STATE.resizeObserver.observe(composer);
    } catch (_) {
      STATE.resizeObserver = null;
    }
  }

  function placeHost() {
    const form = getComposerForm();
    const composer = getComposer(form);
    const host = makeHost();

    if (composer) {
      const send = getSendButton(form || composer.closest('form'));
      const anchor = send || getFallbackControlAnchor(form || composer.closest('form'), composer);
      const parent = anchor?.parentElement;

      if (parent) {
        host.dataset.placement = 'inline';
        if (host.parentElement !== parent || host.nextSibling !== anchor) {
          parent.insertBefore(host, anchor);
        }
      } else {
        host.dataset.placement = 'floating';
        if (host.parentElement !== document.body) document.body.appendChild(host);
      }

      if (composer !== STATE.composer) setupResizeObserver(composer);
      STATE.composer = composer;
      STATE.composerForm = form || composer.closest('form');
      STATE.anchor = anchor || null;
      return true;
    }

    // Shared/read-only conversations have no composer. Keep the toggle usable
    // without showing it on unrelated ChatGPT pages such as Settings/Library.
    if (hasConversation()) {
      host.dataset.placement = 'floating';
      if (host.parentElement !== document.body) document.body.appendChild(host);
      STATE.composer = null;
      STATE.composerForm = null;
      STATE.anchor = null;
      clearResizeObserver();
      return true;
    }

    // No chat context: remove the on-page control. The toolbar icon remains harmless.
    host.remove();
    STATE.composer = null;
    STATE.composerForm = null;
    STATE.anchor = null;
    clearResizeObserver();
    return false;
  }

  function scheduleRefresh(delay = 180) {
    clearTimeout(STATE.refreshTimer);
    STATE.refreshTimer = setTimeout(() => {
      STATE.lastUrl = location.href;
      placeHost();
    }, delay);
  }

  function handleMutations(mutations) {
    let placementMayHaveChanged = false;

    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      if (mutation.addedNodes.length || mutation.removedNodes.length) placementMayHaveChanged = true;
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) scanAddedElement(node);
      }
    }

    if (placementMayHaveChanged) scheduleRefresh();
  }

  function listenForStorageChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') return;
      const next = changes[STORAGE_KEY]?.newValue;
      if (next !== 'rtl' && next !== 'ltr') return;
      applyMode(next);
      // A setting arriving through Chrome Sync should refresh the local fallback
      // too. This write is idempotent and does not write back to sync.
      if (areaName === 'sync') void chrome.storage.local.set({ [STORAGE_KEY]: next }).catch(() => {});
    });
  }

  function listenForMessages() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== TOGGLE_MESSAGE) return undefined;
      void toggleMode().then((mode) => sendResponse?.({ mode }));
      return true;
    });
  }

  async function init() {
    await loadMode();
    applyMode(STATE.mode);
    scanConversation(document);
    placeHost();

    STATE.observer = new MutationObserver(handleMutations);
    STATE.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('popstate', () => scheduleRefresh(0), { passive: true });
    window.addEventListener('hashchange', () => scheduleRefresh(0), { passive: true });
    window.addEventListener('pageshow', () => scheduleRefresh(0), { passive: true });
    window.addEventListener('resize', () => scheduleRefresh(100), { passive: true });
    document.addEventListener('focusin', (event) => {
      if (
        event.target instanceof Element &&
        EDITOR_SELECTORS.some((selector) => event.target.matches(selector)) &&
        isLikelyComposerEditor(event.target, getComposerForm())
      ) {
        scheduleRefresh(0);
      }
    }, true);
    window.navigation?.addEventListener('navigate', () => scheduleRefresh(0));

    listenForStorageChanges();
    listenForMessages();
  }

  void init();
})();
