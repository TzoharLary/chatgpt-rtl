(() => {
  'use strict';

  if (globalThis.__CHATGPT_RTL_CORE__) return;

  const TEXT_ATTR = 'data-chatgpt-rtl-text';
  const LIST_ATTR = 'data-chatgpt-rtl-list';
  const TABLE_ATTR = 'data-chatgpt-rtl-table';
  const TECH_ATTR = 'data-chatgpt-rtl-technical';
  const ISLAND_ATTR = 'data-chatgpt-rtl-island';
  const COMPOSER_ATTR = 'data-chatgpt-rtl-composer';

  const COMPOSER_FORMS = [
    'form[data-chatgpt-composer]',
    'form[data-type="unified-composer"]',
    'form[data-mobile-composer]',
  ];

  const STRONG_EDITORS = [
    '[data-composer-markdown][contenteditable="true"]',
    '[data-testid="prompt-textarea"]',
    '#prompt-textarea',
    'textarea[data-mobile-composer-prompt]',
    '#mobile-composer-prompt',
    'textarea[name="prompt"]',
    'textarea[data-testid*="prompt"]',
  ];

  const FALLBACK_EDITORS = [
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][data-lexical-editor="true"]',
    'div.ProseMirror[contenteditable="true"]',
  ];

  const EDITORS = [...STRONG_EDITORS, ...FALLBACK_EDITORS];

  const SEND_CONTROLS = [
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

  const TRAILING_AREAS = [
    '[data-testid="composer-trailing-actions"]',
    '[data-testid="composer-footer-actions"]',
    '[class~="[grid-area:trailing]"]',
  ];

  const TURN_SELECTOR = [
    '[data-message-author-role]',
    '[data-turn="user"]',
    '[data-turn="assistant"]',
    '[data-turn-key]',
    '[data-content-search-unit-key]',
    '[data-chatgpt-search-unit-key]',
    'article[data-turn]',
    'section[data-turn]',
    '[data-testid^="conversation-turn"]',
  ].join(',');

  const USER_TEXT_ROOTS = [
    '[data-user-message-bubble] .whitespace-pre-wrap',
    '[data-testid="user-message"]',
  ].join(',');

  const ASSISTANT_TEXT_ROOTS = [
    '[data-markdown-text-style="assistant-message"]',
    '.markdown',
    '.prose',
  ].join(',');

  const KNOWN_TEXT_ROOTS = `${USER_TEXT_ROOTS},${ASSISTANT_TEXT_ROOTS}`;
  const SEMANTIC_TEXT = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,dt,dd,figcaption,summary';

  const TECHNICAL_CONTENT = [
    'pre', 'code', 'kbd', 'samp', 'var',
    '.katex', '.katex-display', '[class*="katex"]', '.MathJax',
    '.CodeMirror', '.cm-editor', '.monaco-editor', '[data-language]',
    'mjx-container', '[data-math]', '[data-math-source]', '[role="math"]', 'math',
  ].join(',');

  const TECHNICAL_OR_INTERACTIVE = [
    TECHNICAL_CONTENT, 'table', 'svg', 'a', '[role="link"]', 'button',
    '[role="button"]', 'input', 'select', 'textarea', '[contenteditable="true"]',
    'iframe',
  ].join(',');

  const AUXILIARY_UI = [
    '[role="status"]', '[role="alert"]', '[role="progressbar"]', '[aria-live]',
    'time', 'nav', 'aside', '[data-testid*="citation"]',
    '[data-testid*="attachment"]', '[data-testid*="file"]',
    '[data-testid*="tool"]', '[data-testid*="copy"]',
  ].join(',');

  const STOP_PATTERN = /\b(stop|abort|cancel)\b|עצור|הפסק|توقف|إيقاف|停止|중지/i;
  const NON_COMPOSER_PATTERN = /\b(search|find|filter)\b|חפש|חיפוש|بحث|搜索|搜尋|検索|검색/i;
  const COMPOSER_PATTERN = /\b(message|prompt|ask|chat|send|type|write)\b|הודעה|שאל|כתוב|הקלד|שלח|رسالة|اكتب|发送|傳送|送信|메시지/i;

  function qsa(root, selector) {
    try { return Array.from((root || document).querySelectorAll(selector)); }
    catch (_) { return []; }
  }

  function visible(el) {
    if (!el?.isConnected) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
      style.visibility !== 'hidden' && el.getAttribute('aria-hidden') !== 'true';
  }

  function inConversation(el) {
    return Boolean(el?.closest?.(TURN_SELECTOR));
  }

  function hasAny(root, selectors) {
    if (!root?.querySelector) return false;
    return selectors.some((selector) => {
      try { return Boolean(root.querySelector(selector)); }
      catch (_) { return false; }
    });
  }

  function editorMetadata(el) {
    return [
      el?.getAttribute?.('aria-label'), el?.getAttribute?.('placeholder'),
      el?.getAttribute?.('data-placeholder'), el?.getAttribute?.('name'),
      el?.id, el?.getAttribute?.('data-testid'),
    ].filter(Boolean).join(' ');
  }

  function knownComposerForm(form) {
    return Boolean(form && !inConversation(form) && COMPOSER_FORMS.some((selector) => {
      try { return form.matches(selector); }
      catch (_) { return false; }
    }));
  }

  function likelyEditor(el, knownForm = null) {
    if (!el || !visible(el) || inConversation(el)) return false;
    if (knownForm?.contains(el)) return true;
    if (STRONG_EDITORS.some((selector) => el.matches(selector))) return true;

    const metadata = editorMetadata(el);
    if (NON_COMPOSER_PATTERN.test(metadata)) return false;

    const form = el.closest('form');
    if (knownComposerForm(form)) return true;
    if (form && !inConversation(form) && hasAny(form, SEND_CONTROLS)) return true;
    return COMPOSER_PATTERN.test(metadata);
  }

  function getComposerForm() {
    for (const selector of COMPOSER_FORMS) {
      const form = qsa(document, selector).find((el) => !inConversation(el) && visible(el));
      if (form) return form;
    }

    for (const selector of STRONG_EDITORS) {
      const editor = qsa(document, selector).find((el) => likelyEditor(el));
      if (editor) return editor.closest('form');
    }

    for (const selector of FALLBACK_EDITORS) {
      const editor = qsa(document, selector).find((el) => likelyEditor(el));
      if (editor) return editor.closest('form');
    }
    return null;
  }

  function getComposer(form = null) {
    const root = form || document;
    for (const selector of EDITORS) {
      const matches = qsa(root, selector).filter((el) => likelyEditor(el, form));
      if (!matches.length) continue;
      return matches.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    }
    return null;
  }

  function looksLikeStop(button) {
    if (!button) return false;
    const metadata = [
      button.getAttribute('aria-label'), button.getAttribute('data-testid'),
      button.getAttribute('data-stop-label'), button.title, button.textContent,
    ].filter(Boolean).join(' ');
    return STOP_PATTERN.test(metadata);
  }

  function composerScope(composer, form = null) {
    if (!composer) return null;
    let current = form || composer.parentElement;
    const fallback = form || composer.closest('form') || composer.parentElement || null;

    for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
      if (current === document.body || current === document.documentElement) break;
      if (hasAny(current, SEND_CONTROLS) || hasAny(current, TRAILING_AREAS)) return current;
    }
    return fallback;
  }

  function getSend(scope) {
    if (!scope) return null;
    for (const selector of SEND_CONTROLS) {
      const candidates = qsa(scope, selector).filter((button) => !looksLikeStop(button));
      const shown = candidates.find(visible);
      if (shown) return shown;
      const structural = candidates.find((button) => button.isConnected && button.parentElement);
      if (structural) return structural;
    }
    return null;
  }

  function getTrailing(scope) {
    if (!scope) return null;
    for (const selector of TRAILING_AREAS) {
      const el = qsa(scope, selector).find(visible);
      if (el) return el;
    }
    return null;
  }

  function fallbackAnchor(scope, composer) {
    if (!scope) return null;
    const controls = qsa(scope, 'button,[role="button"]').filter((el) => visible(el) && !looksLikeStop(el));
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

  function turnRole(turn) {
    const explicit = (turn.getAttribute('data-message-author-role') || turn.getAttribute('data-turn') || '').toLowerCase();
    if (explicit === 'user' || explicit === 'assistant') return explicit;

    const key = [turn.getAttribute('data-content-search-unit-key'), turn.getAttribute('data-chatgpt-search-unit-key')]
      .filter(Boolean).join(' ').toLowerCase();
    if (key.endsWith(':user') || key.includes(':user ')) return 'user';
    if (key.endsWith(':assistant') || key.includes(':assistant ')) return 'assistant';

    return turn.querySelector('[data-message-author-role="user"],[data-message-author-role="assistant"]')
      ?.getAttribute('data-message-author-role') || '';
  }

  function excludedText(el) {
    return Boolean(
      el.matches(TECHNICAL_OR_INTERACTIVE) || el.closest(TECHNICAL_OR_INTERACTIVE) ||
      el.matches(AUXILIARY_UI) || el.closest(AUXILIARY_UI)
    );
  }

  function markText(el) {
    if (!el?.isConnected || !el.textContent?.trim() || excludedText(el)) return;
    el.setAttribute(TEXT_ATTR, '1');
  }

  function markTechnical(root) {
    if (!(root instanceof Element || root instanceof Document)) return;
    if (root instanceof Element && root.matches(TECHNICAL_CONTENT)) root.setAttribute(TECH_ATTR, '1');
    for (const el of qsa(root, TECHNICAL_CONTENT)) el.setAttribute(TECH_ATTR, '1');
    if (root instanceof Element && root.matches('a,bdi')) root.setAttribute(ISLAND_ATTR, '1');
    for (const el of qsa(root, 'a,bdi')) el.setAttribute(ISLAND_ATTR, '1');
  }

  function markStructuredProse(root) {
    if (!(root instanceof Element)) return;
    if (root.matches('ul,ol')) root.setAttribute(LIST_ATTR, '1');
    for (const el of qsa(root, 'ul,ol')) el.setAttribute(LIST_ATTR, '1');
    if (root.matches('table')) root.setAttribute(TABLE_ATTR, '1');
    for (const el of qsa(root, 'table')) el.setAttribute(TABLE_ATTR, '1');
  }

  function markKnownRoot(root) {
    if (!(root instanceof Element) || !root.isConnected || excludedText(root)) return;
    for (const el of qsa(root, SEMANTIC_TEXT)) markText(el);
    markStructuredProse(root);
    markTechnical(root);

    if (root.matches('div,span')) {
      const directText = Array.from(root.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      const hasBlocks = root.querySelector('p,div,ul,ol,pre,table,blockquote');
      if (directText && !hasBlocks) markText(root);
    }
  }

  function markDirectFallback(root, turn) {
    const role = turnRole(turn);
    if (role !== 'user' && role !== 'assistant') return;

    const candidates = [];
    if (root instanceof Element && root.matches('div,span')) candidates.push(root);
    candidates.push(...qsa(root, 'div,span'));

    for (const el of candidates) {
      if (excludedText(el)) continue;
      const directText = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (!directText || el.querySelector('p,div,ul,ol,pre,table,blockquote')) continue;
      markText(el);
    }
  }

  function markTurn(turn) {
    if (!turn?.isConnected) return;
    if (turn.matches(KNOWN_TEXT_ROOTS)) markKnownRoot(turn);
    for (const root of qsa(turn, KNOWN_TEXT_ROOTS)) markKnownRoot(root);
    for (const el of qsa(turn, SEMANTIC_TEXT)) markText(el);
    markTechnical(turn);
    markDirectFallback(turn, turn);
  }

  function scanConversation(root = document) {
    if (root instanceof Element && root.matches(TURN_SELECTOR)) markTurn(root);
    for (const turn of qsa(root, TURN_SELECTOR)) markTurn(turn);
  }

  function scanAdded(root) {
    if (!(root instanceof Element)) return;
    if (root.matches(TURN_SELECTOR)) { markTurn(root); return; }

    const turns = qsa(root, TURN_SELECTOR);
    if (turns.length) {
      for (const turn of turns) markTurn(turn);
      return;
    }

    const turn = root.closest(TURN_SELECTOR);
    if (!turn) return;

    const known = root.matches(KNOWN_TEXT_ROOTS) ? root : root.closest(KNOWN_TEXT_ROOTS);
    if (known && turn.contains(known)) markKnownRoot(known);
    for (const nested of qsa(root, KNOWN_TEXT_ROOTS)) markKnownRoot(nested);
    if (root.matches(SEMANTIC_TEXT)) markText(root);
    for (const el of qsa(root, SEMANTIC_TEXT)) markText(el);
    markTechnical(root);
    markDirectFallback(root, turn);
  }

  const PLACEMENT_SIGNAL = [...COMPOSER_FORMS, ...EDITORS, ...SEND_CONTROLS, ...TRAILING_AREAS].join(',');

  function hasPlacementSignal(node) {
    if (!(node instanceof Element)) return false;
    try { return node.matches(PLACEMENT_SIGNAL) || Boolean(node.querySelector(PLACEMENT_SIGNAL)); }
    catch (_) { return false; }
  }

  globalThis.__CHATGPT_RTL_CORE__ = Object.freeze({
    TEXT_ATTR, LIST_ATTR, TABLE_ATTR, TECH_ATTR, ISLAND_ATTR, COMPOSER_ATTR,
    COMPOSER_FORMS, EDITORS, SEND_CONTROLS, TRAILING_AREAS, TURN_SELECTOR,
    qsa, visible, likelyEditor, getComposerForm, getComposer, looksLikeStop,
    composerScope, getSend, getTrailing, fallbackAnchor, hasConversation,
    scanConversation, scanAdded, hasPlacementSignal,
  });
})();
