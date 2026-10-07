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
    'button[data-testid*="send-button"]',
    'button[data-composer-submit]',
    '#composer-submit-button',
    'button[type="submit"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[aria-label*="Submit"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="שלח"]',
  ];

  const DICTATION_CONTROLS = [
    'button[data-start-dictation]',
    'button[data-testid="composer-speech-button"]',
    'button[data-testid="composer-dictation-button"]',
    'button[data-testid="dictation-button"]',
    'button[data-testid*="dictat"]',
    'button[data-testid*="microphone"]',
    'button[data-testid*="mic-button"]',
    'button[data-testid*="voice"]',
    'button[aria-label*="dictat" i]',
    'button[aria-label*="micro" i]',
    'button[aria-label*="הכתב" i]',
    'button[aria-label*="הקלט" i]',
    'button[aria-label*="קול" i]',
  ];

  const TRAILING_AREAS = [
    '[data-testid="composer-trailing-actions"]',
    '[data-testid="composer-footer-actions"]',
    '[data-testid="composer-actions"]',
    '[data-composer-trailing]',
    '[class~="[grid-area:trailing]"]',
    'div[class*="trailing"]',
  ];

  const TURN_SELECTOR = [
    '[data-message-role]',
    '[data-message-author-role]',
    '[data-turn="user"]',
    '[data-turn="assistant"]',
    '[data-turn-key]',
    '[data-message-id]',
    '[data-content-search-unit-key]',
    '[data-chatgpt-search-unit-key]',
    'article[data-turn]',
    'section[data-turn]',
    'article',
    '[data-testid*="conversation-turn"]',
    '[data-testid*="chat-turn"]',
    'div[class*="conversation-turn"]',
    'li[data-message-role]',
    'div[data-message-role]',
    '[data-assistant-stream-block]',
    'section[data-web-mobile-conversation]',
    '[data-conversation-id]',
  ].join(',');

  const USER_TEXT_ROOTS = [
    '[data-user-message-bubble]',
    '[data-user-message-copy]',
    '[data-testid="user-message"]',
    'div[class*="user-message"]',
    '[data-message-role="user"]',
    '[data-message-author-role="user"]',
  ].join(',');

  const ASSISTANT_TEXT_ROOTS = [
    '[data-assistant-markdown]',
    '[data-markdown-text-style="assistant-message"]',
    '.markdown',
    '.prose',
    'div[class*="markdown"]',
    'div[class*="prose"]',
    'div[class*="text-message"]',
    '[data-testid="assistant-message"]',
    '[data-message-role="assistant"]',
    '[data-message-author-role="assistant"]',
    '[data-assistant-stream-block]',
  ].join(',');

  const KNOWN_TEXT_ROOTS = `${USER_TEXT_ROOTS},${ASSISTANT_TEXT_ROOTS}`;
  const SEMANTIC_TEXT = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,dt,dd,figcaption,summary';

  const TECHNICAL_CONTENT = [
    'pre', 'code', 'kbd', 'samp', 'var',
    '.katex', '.katex-display', '[class*="katex"]', '.MathJax',
    '.CodeMirror', '.cm-editor', '.monaco-editor', '.hljs', '[data-language]',
    'mjx-container', '[data-math]', '[data-math-source]', '[role="math"]', 'math',
  ].join(',');

  const TECHNICAL_OR_INTERACTIVE = [
    TECHNICAL_CONTENT, 'table', 'svg', 'a', '[role="link"]', 'button',
    '[role="button"]', 'input', 'select', 'textarea', '[contenteditable="true"]',
    'iframe',
  ].join(',');

  const AUXILIARY_UI = [
    '[role="status"]', '[role="alert"]', '[role="progressbar"]',
    '[aria-hidden="true"]', '[hidden]', '[data-conversation-role]',
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

  function matches(el, selector) {
    try { return Boolean(el?.matches?.(selector)); }
    catch (_) { return false; }
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
    return Boolean(form && !inConversation(form) && COMPOSER_FORMS.some((selector) => matches(form, selector)));
  }

  function likelyEditor(el, knownForm = null) {
    if (!el || !visible(el) || inConversation(el)) return false;
    if (knownForm?.contains(el)) return true;
    if (STRONG_EDITORS.some((selector) => matches(el, selector))) return true;

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

    for (const selector of EDITORS) {
      const editor = qsa(document, selector).find((el) => likelyEditor(el));
      if (editor) return editor.closest('form');
    }
    return null;
  }

  function getComposer(form = null) {
    const root = form || document;
    for (const selector of EDITORS) {
      const found = qsa(root, selector).filter((el) => likelyEditor(el, form));
      if (!found.length) continue;
      return found.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    }
    return null;
  }

  function looksLikeStop(button) {
    if (!button) return false;
    const ariaLabel = button.getAttribute('aria-label') || '';
    const testId = button.getAttribute('data-testid') || '';
    if (ariaLabel || testId) {
      return STOP_PATTERN.test(ariaLabel + ' ' + testId);
    }
    const metadata = [
      button.getAttribute('data-stop-label'), button.title, button.textContent,
    ].filter(Boolean).join(' ');
    return STOP_PATTERN.test(metadata);
  }

  function composerScope(composer, form = null) {
    if (!composer) return null;
    let current = form || composer.parentElement;
    const fallback = form || composer.closest('form') || composer.parentElement || null;

    for (let depth = 0; current && depth < 12; depth += 1, current = current.parentElement) {
      if (current === document.body || current === document.documentElement) break;
      if (hasAny(current, SEND_CONTROLS) || hasAny(current, TRAILING_AREAS)) return current;
    }
    return fallback;
  }

  function getDictation(scope) {
    if (!scope) return null;
    for (const selector of DICTATION_CONTROLS) {
      const candidates = qsa(scope, selector);
      const shown = candidates.find(visible);
      if (shown) return shown;
      const structural = candidates.find((button) => button.isConnected && button.parentElement && !button.hidden);
      if (structural) return structural;
    }
    return null;
  }

  function getSend(scope) {
    if (!scope) return null;
    for (const selector of SEND_CONTROLS) {
      const candidates = qsa(scope, selector).filter((button) => !looksLikeStop(button));
      const shown = candidates.find(visible);
      if (shown) return shown;
      const structural = candidates.find((button) => button.isConnected && button.parentElement && !button.hidden);
      if (structural) return structural;
    }
    return null;
  }

  function getStop(scope) {
    if (!scope) return null;
    const candidates = qsa(scope, 'button,[role="button"]').filter(looksLikeStop);
    return candidates.find(visible) || candidates.find((button) => button.isConnected && button.parentElement) || null;
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
    const controls = qsa(scope, 'button,[role="button"]').filter((el) => visible(el));
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

  function hasConversationSignal(node) {
    if (!(node instanceof Element)) return false;
    return matches(node, TURN_SELECTOR) || Boolean(node.querySelector?.(TURN_SELECTOR));
  }

  function turnRole(turn) {
    const explicit = (
      turn.getAttribute('data-message-author-role') ||
      turn.getAttribute('data-message-role') ||
      turn.getAttribute('data-turn') ||
      ''
    ).toLowerCase();
    if (explicit === 'user' || explicit === 'assistant') return explicit;

    const key = [turn.getAttribute('data-content-search-unit-key'), turn.getAttribute('data-chatgpt-search-unit-key')]
      .filter(Boolean).join(' ').toLowerCase();
    if (/(^|:)user\b/.test(key)) return 'user';
    if (/(^|:)assistant\b/.test(key)) return 'assistant';

    return turn.querySelector('[data-message-author-role="user"],[data-message-author-role="assistant"]')
      ?.getAttribute('data-message-author-role') || '';
  }

  function isUserMessageElement(el) {
    return Boolean(el?.closest?.('[data-user-message-bubble],[data-user-message-copy],[data-testid="user-message"]'));
  }

  function excludedText(el) {
    if (isUserMessageElement(el)) return false;
    return Boolean(
      matches(el, TECHNICAL_OR_INTERACTIVE) || el.closest?.(TECHNICAL_OR_INTERACTIVE) ||
      matches(el, AUXILIARY_UI) || el.closest?.(AUXILIARY_UI)
    );
  }

  const RTL_CHAR_PATTERN = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
  const FORWARD_ARROWS_RTL_MAP = { '→': '←', '⇒': '⇐', '⟶': '⟵' };
  const FORWARD_ARROWS_LTR_MAP = { '←': '→', '⇐': '⇒', '⟵': '⟶' };
  const HAS_ARROWS_ATTR = 'data-chatgpt-rtl-arrows';

  function isRtlMode() {
    return document.documentElement.getAttribute('data-chatgpt-rtl-mode') !== 'ltr';
  }

  function normalizeArrows(el, toRtl) {
    if (!el || !el.isConnected) return;
    const map = toRtl ? FORWARD_ARROWS_RTL_MAP : FORWARD_ARROWS_LTR_MAP;
    const searchRe = toRtl ? /[→⇒⟶]/ : /[←⇐⟵]/;

    if (toRtl && !/[→⇒⟶]/.test(el.textContent || '')) return;
    if (!toRtl && !el.hasAttribute(HAS_ARROWS_ATTR)) return;

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (searchRe.test(node.nodeValue)) {
          let updated = node.nodeValue;
          for (const [from, to] of Object.entries(map)) {
            if (updated.includes(from)) {
              updated = updated.replaceAll(from, to);
            }
          }
          if (updated !== node.nodeValue) {
            node.nodeValue = updated;
            el.setAttribute(HAS_ARROWS_ATTR, '1');
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (matches(node, TECHNICAL_CONTENT) || matches(node, AUXILIARY_UI)) return;
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
      }
    };

    walk(el);
  }

  const HAS_PUNCT_ATTR = 'data-chatgpt-rtl-punct';
  const RLM_CHAR = '\u200F';
  const TRAILING_PUNCT_RE = /([a-zA-Z0-9][a-zA-Z0-9_\-\./\'\"”\)\]]*)([\.\?\!\:\,\;]+[\'\"”\)\]]*)(?!\u200F)(?=\s*(?:$|[\n\r]|[\u0590-\u05FF\u0600-\u06FF]))/g;

  function normalizeTrailingPunctuation(el, toRtl) {
    if (!el || !el.isConnected) return;

    if (toRtl) {
      const text = el.textContent || '';
      if (!text || !/[a-zA-Z0-9][\.\?\!\:\,\;]/.test(text)) return;
    } else {
      if (!el.hasAttribute(HAS_PUNCT_ATTR)) return;
    }

    // Determine the language of each explicit line as a whole. A bilingual
    // example can contain an English sentence followed by <br> and Hebrew;
    // the Hebrew translation must not add an RLM to the English sentence.
    const lines = [[]];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        lines[lines.length - 1].push(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (matches(node, TECHNICAL_CONTENT) || matches(node, AUXILIARY_UI)) return;
        if (node !== el && matches(node, SEMANTIC_TEXT)) return;
        if (matches(node, 'br')) { lines.push([]); return; }
        for (const child of Array.from(node.childNodes)) walk(child);
      }
    };
    walk(el);

    for (const line of lines) {
      if (toRtl && !RTL_CHAR_PATTERN.test(line.map(node => node.nodeValue).join(''))) continue;
      for (const node of line) {
        const val = node.nodeValue;
        if (toRtl) {
          const updated = val.replace(TRAILING_PUNCT_RE, '$1$2\u200F');
          if (updated !== val) {
            node.nodeValue = updated;
            el.setAttribute(HAS_PUNCT_ATTR, '1');
          }
        } else {
          if (val.includes(RLM_CHAR)) {
            node.nodeValue = val.replaceAll(RLM_CHAR, '');
          }
        }
      }
    }
    if (!toRtl) {
      el.removeAttribute(HAS_PUNCT_ATTR);
    }
  }

  function markText(el) {
    if (!el?.isConnected) return;
    const text = el.textContent?.trim();
    if (!text || excludedText(el)) {
      el.removeAttribute?.(TEXT_ATTR);
      if (el.getAttribute?.('dir') === 'rtl') el.removeAttribute?.('dir');
      el.style?.removeProperty?.('direction');
      el.style?.removeProperty?.('text-align');
      return;
    }
    const isRtl = RTL_CHAR_PATTERN.test(text);
    const modeRtl = isRtlMode();

    if (isRtl && modeRtl) {
      el.setAttribute(TEXT_ATTR, 'rtl');
      el.setAttribute('dir', 'rtl');
      el.style.setProperty('direction', 'rtl', 'important');
      el.style.setProperty('text-align', 'right', 'important');
    } else {
      el.setAttribute(TEXT_ATTR, isRtl ? 'rtl' : 'ltr');
      if (el.getAttribute('dir') === 'rtl') el.removeAttribute('dir');
      el.style.removeProperty('direction');
      el.style.removeProperty('text-align');
    }

    normalizeArrows(el, isRtl && modeRtl);
    normalizeTrailingPunctuation(el, isRtl && modeRtl);
  }

  function markTechnical(root) {
    if (!(root instanceof Element || root instanceof Document)) return;
    if (root instanceof Element && matches(root, TECHNICAL_CONTENT)) root.setAttribute(TECH_ATTR, '1');
    for (const el of qsa(root, TECHNICAL_CONTENT)) el.setAttribute(TECH_ATTR, '1');
    if (root instanceof Element && matches(root, 'a,bdi')) root.setAttribute(ISLAND_ATTR, '1');
    for (const el of qsa(root, 'a,bdi')) el.setAttribute(ISLAND_ATTR, '1');
  }

  function structuredExcluded(el, boundary) {
    if (!el || !boundary?.contains?.(el)) return true;
    const aux = el.closest?.(AUXILIARY_UI);
    if (aux && boundary.contains(aux)) return true;
    const interactive = el.parentElement?.closest?.('button,[role="button"],a,[role="link"],input,select,textarea,[contenteditable="true"],iframe');
    if (interactive && boundary.contains(interactive)) return true;
    const technical = el.parentElement?.closest?.(TECHNICAL_CONTENT);
    return Boolean(technical && boundary.contains(technical));
  }

  function markStructuredProse(root, boundary = root) {
    if (!(root instanceof Element)) return;
    const lists = matches(root, 'ul,ol') ? [root, ...qsa(root, 'ul,ol')] : qsa(root, 'ul,ol');
    for (const el of lists) {
      if (!structuredExcluded(el, boundary)) el.setAttribute(LIST_ATTR, '1');
    }
    const tables = matches(root, 'table') ? [root, ...qsa(root, 'table')] : qsa(root, 'table');
    for (const el of tables) {
      if (!structuredExcluded(el, boundary)) {
        el.setAttribute(TABLE_ATTR, '1');
        for (const cell of qsa(el, 'th,td,caption')) {
          const cellText = cell.textContent?.trim() || '';
          const cellIsRtl = RTL_CHAR_PATTERN.test(cellText);
          normalizeArrows(cell, cellIsRtl && isRtlMode());
          normalizeTrailingPunctuation(cell, cellIsRtl && isRtlMode());
        }
      }
    }
  }

  function markKnownRoot(root) {
    if (!(root instanceof Element) || !root.isConnected) return;
    if (matches(root, AUXILIARY_UI) || root.closest?.(AUXILIARY_UI)) return;

    for (const el of qsa(root, SEMANTIC_TEXT)) markText(el);
    markStructuredProse(root, root);
    markTechnical(root);

    if (matches(root, 'div,span')) {
      const directText = Array.from(root.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      const hasBlocks = root.querySelector('p,div,ul,ol,pre,table,blockquote');
      if (directText && !hasBlocks) markText(root);
    }
  }

  function markDirectFallback(root, turn) {
    const role = turnRole(turn);
    if (role !== 'user' && role !== 'assistant' && !matches(turn, '[data-turn-key]')) return;

    const candidates = [];
    if (root instanceof Element && matches(root, 'div,span')) candidates.push(root);
    candidates.push(...qsa(root, 'div,span'));

    for (const el of candidates) {
      if (excludedText(el)) continue;
      // ChatGPT wraps ordinary inline runs (including spaces around strong/bdi)
      // in spans. Isolating each run reverses English fragments in RTL prose and
      // collapses boundary spaces. The enclosing prose element owns direction.
      if (matches(el, 'span') && el.parentElement?.closest(SEMANTIC_TEXT)) continue;
      const directText = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (!directText || el.querySelector('p,div,ul,ol,pre,table,blockquote')) continue;
      markText(el);
    }
  }

  function markTurn(turn) {
    if (!turn?.isConnected) return;
    if (matches(turn, KNOWN_TEXT_ROOTS)) markKnownRoot(turn);
    for (const root of qsa(turn, KNOWN_TEXT_ROOTS)) markKnownRoot(root);
    for (const el of qsa(turn, SEMANTIC_TEXT)) markText(el);
    markStructuredProse(turn, turn);
    markTechnical(turn);
    markDirectFallback(turn, turn);
  }

  function topLevelTurns(root = document) {
    const turns = [];
    if (root instanceof Element && matches(root, TURN_SELECTOR)) turns.push(root);
    turns.push(...qsa(root, TURN_SELECTOR));
    const unique = [...new Set(turns)];
    const set = new Set(unique);
    return unique.filter((turn) => {
      const ancestor = turn.parentElement?.closest?.(TURN_SELECTOR);
      return !ancestor || !set.has(ancestor);
    });
  }

  function scanConversation(root = document) {
    const turns = topLevelTurns(root);
    for (const turn of turns) markTurn(turn);
    for (const el of qsa(root, SEMANTIC_TEXT)) markText(el);
    markStructuredProse(root, root);
    markTechnical(root);
  }

  function scanAdded(root) {
    if (!(root instanceof Element)) return;
    if (matches(root, TURN_SELECTOR)) { markTurn(root); return; }

    const turns = topLevelTurns(root);
    if (turns.length) {
      for (const turn of turns) markTurn(turn);
      return;
    }

    const turn = root.closest?.(TURN_SELECTOR);
    const boundary = turn || root;

    const known = matches(root, KNOWN_TEXT_ROOTS) ? root : root.closest?.(KNOWN_TEXT_ROOTS);
    if (known && boundary.contains(known)) markKnownRoot(known);
    for (const nested of qsa(root, KNOWN_TEXT_ROOTS)) markKnownRoot(nested);

    if (matches(root, SEMANTIC_TEXT)) markText(root);
    for (const el of qsa(root, SEMANTIC_TEXT)) markText(el);

    markStructuredProse(root, boundary);
    markTechnical(root);
    markDirectFallback(root, boundary);
  }

  const PLACEMENT_SIGNAL = [...COMPOSER_FORMS, ...EDITORS, ...DICTATION_CONTROLS, ...SEND_CONTROLS, ...TRAILING_AREAS].join(',');

  function hasPlacementSignal(node) {
    if (!(node instanceof Element)) return false;
    try { return node.matches(PLACEMENT_SIGNAL) || Boolean(node.querySelector(PLACEMENT_SIGNAL)); }
    catch (_) { return false; }
  }

  globalThis.__CHATGPT_RTL_CORE__ = Object.freeze({
    TEXT_ATTR, LIST_ATTR, TABLE_ATTR, TECH_ATTR, ISLAND_ATTR, COMPOSER_ATTR,
    COMPOSER_FORMS, EDITORS, DICTATION_CONTROLS, SEND_CONTROLS, TRAILING_AREAS, TURN_SELECTOR,
    qsa, visible, likelyEditor, getComposerForm, getComposer, looksLikeStop,
    composerScope, getDictation, getSend, getStop, getTrailing, fallbackAnchor, hasConversation,
    hasConversationSignal, scanConversation, scanAdded, hasPlacementSignal,
  });
})();
