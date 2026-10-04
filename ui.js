(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.location?.search?.includes('__chatgpt_rtl_reload=1')) {
    chrome.runtime?.sendMessage?.({ action: 'RELOAD_EXTENSION_AND_CLOSE' });
    return;
  }

  if (globalThis.__CHATGPT_RTL_UI_LOADED__) return;
  globalThis.__CHATGPT_RTL_UI_LOADED__ = true;

  const core = globalThis.__CHATGPT_RTL_CORE__;
  if (!core) return;

  const STORAGE_KEY = 'chatgpt_rtl_mode';
  const ROOT_ATTR = 'data-chatgpt-rtl-mode';
  const HOST_ID = 'chatgpt-rtl-toggle-host';
  const TOGGLE_MESSAGE = 'chatgpt-rtl:toggle';
  const CONTENT_SCAN_DELAY_MS = 40;
  const PLACEMENT_DELAY_MS = 120;

  const BUTTON_CSS = `
    :host{display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;color:inherit;font:inherit;z-index:2147483647;margin:0 6px 0 0}
    :host([data-placement="floating"]){position:fixed;right:20px;bottom:92px;margin:0}
    button{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0;border:0;border-radius:999px;background:transparent;color:inherit;cursor:pointer;opacity:.78;transition:background-color 120ms ease,opacity 120ms ease}
    button:hover{background:color-mix(in srgb,currentColor 10%,transparent);opacity:1}
    button:focus-visible{background:color-mix(in srgb,currentColor 10%,transparent);opacity:1;outline:2px solid color-mix(in srgb,currentColor 35%,transparent);outline-offset:2px}
    svg{width:17px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;transition:transform 180ms ease}
    button[data-mode="rtl"] svg{transform:scaleX(-1)}
    :host([data-placement="floating"]) button{margin:0;background:Canvas;color:CanvasText;box-shadow:0 1px 7px rgb(0 0 0 / 20%);opacity:.96}
    @media(prefers-reduced-motion:reduce){button,svg{transition:none}}
  `;

  const state = {
    mode: 'rtl',
    updatedAt: 0,
    host: null,
    composer: null,
    composerForm: null,
    composerScope: null,
    anchor: null,
    observer: null,
    resizeObserver: null,
    placementTimer: null,
    contentTimer: null,
    contentQueue: new Set(),
    fullScanRequested: false,
  };

  function normalizeStored(value) {
    if (value === 'rtl' || value === 'ltr') return { mode: value, updatedAt: 0 };
    if (!value || typeof value !== 'object') return null;
    const mode = value.mode;
    const updatedAt = Number(value.updatedAt || 0);
    if ((mode !== 'rtl' && mode !== 'ltr') || !Number.isFinite(updatedAt) || updatedAt < 0) return null;
    return { mode, updatedAt };
  }

  function sameRecord(a, b) {
    return Boolean(a && b && a.mode === b.mode && a.updatedAt === b.updatedAt);
  }

  async function readAreaRaw(area) {
    try {
      const result = await chrome.storage[area].get(STORAGE_KEY);
      return result?.[STORAGE_KEY] ?? null;
    } catch (_) {
      return null;
    }
  }

  async function readArea(area) {
    const raw = await readAreaRaw(area);
    return normalizeStored(raw);
  }

  async function writeArea(area, record) {
    try {
      await chrome.storage[area].set({ [STORAGE_KEY]: record });
      return true;
    } catch (_) {
      return false;
    }
  }

  function needsMigration(raw) {
    return raw != null && (typeof raw === 'string' || typeof raw.mode === 'undefined');
  }

  async function loadMode() {
    const [syncRaw, localRaw] = await Promise.all([readAreaRaw('sync'), readAreaRaw('local')]);
    const sync = normalizeStored(syncRaw);
    const local = normalizeStored(localRaw);
    const candidates = [sync, local].filter(Boolean);
    const chosen = candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0] || { mode: 'rtl', updatedAt: 0 };
    state.mode = chosen.mode;
    state.updatedAt = chosen.updatedAt;

    const record = { mode: state.mode, updatedAt: state.updatedAt };
    if (!sameRecord(sync, record) || needsMigration(syncRaw)) void writeArea('sync', record);
    if (!sameRecord(local, record) || needsMigration(localRaw)) void writeArea('local', record);
  }

  async function saveMode(mode) {
    const record = { mode, updatedAt: Date.now() };
    state.mode = mode;
    state.updatedAt = record.updatedAt;
    await Promise.allSettled([writeArea('sync', record), writeArea('local', record)]);
    return record;
  }

  function reflectButton() {
    const button = state.host?.shadowRoot?.querySelector('button');
    if (!button) return;
    const rtl = state.mode === 'rtl';
    button.dataset.mode = state.mode;
    button.setAttribute('aria-pressed', String(rtl));
    button.setAttribute('aria-label', rtl ? 'RTL is on. Switch ChatGPT to LTR (Alt+Shift+X).' : 'LTR is on. Switch ChatGPT to RTL (Alt+Shift+X).');
    button.title = rtl ? 'RTL on — switch to LTR (Alt+Shift+X)' : 'LTR on — switch to RTL (Alt+Shift+X)';
  }

  function makeHost() {
    let host = document.getElementById(HOST_ID);
    if (host) {
      state.host = host;
      reflectButton();
      return host;
    }

    if (state.host?.shadowRoot) {
      host = state.host;
      reflectButton();
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
    button.innerHTML = '<svg viewBox="0 0 18 14" aria-hidden="true"><line x1="1" y1="2" x2="17" y2="2"></line><line x1="1" y1="7" x2="13" y2="7"></line><line x1="1" y1="12" x2="8" y2="12"></line></svg>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void toggleMode();
    });
    shadow.appendChild(button);

    state.host = host;
    reflectButton();
    return host;
  }

  function applyMode(mode) {
    state.mode = mode === 'ltr' ? 'ltr' : 'rtl';
    document.documentElement.setAttribute(ROOT_ATTR, state.mode);
    reflectButton();
  }

  async function toggleMode() {
    const next = state.mode === 'rtl' ? 'ltr' : 'rtl';
    applyMode(next);
    await saveMode(next);
    return next;
  }

  function markComposer(composer) {
    if (state.composer && state.composer !== composer) state.composer.removeAttribute?.(core.COMPOSER_ATTR);
    composer?.setAttribute?.(core.COMPOSER_ATTR, '1');
  }

  function clearResizeObserver() {
    try { state.resizeObserver?.disconnect(); } catch (_) {}
    state.resizeObserver = null;
  }

  function watchComposerSize(composer) {
    clearResizeObserver();
    if (!composer || typeof ResizeObserver === 'undefined') return;
    try {
      state.resizeObserver = new ResizeObserver(() => schedulePlacement(80));
      state.resizeObserver.observe(composer);
    } catch (_) {
      state.resizeObserver = null;
    }
  }

  function placeHost() {
    const form = core.getComposerForm();
    const composer = core.getComposer(form);
    const host = makeHost();

    if (composer) {
      const scope = core.composerScope(composer, form);
      const send = core.getSend(scope);
      const stop = core.getStop(scope);
      const trailing = core.getTrailing(scope);
      const trailingAnchor = trailing
        ? core.qsa(trailing, 'button,[role="button"]').find((el) => core.visible(el))
        : null;
      const anchor = send || stop || trailingAnchor || core.fallbackAnchor(scope, composer);
      const parent = anchor?.parentElement;

      markComposer(composer);

      if (parent) {
        host.dataset.placement = 'inline';
        if (host.parentElement !== parent || host.nextSibling !== anchor) parent.insertBefore(host, anchor);
      } else if (trailing) {
        host.dataset.placement = 'inline';
        if (host.parentElement !== trailing) trailing.appendChild(host);
      } else {
        host.dataset.placement = 'floating';
        if (host.parentElement !== document.body) document.body.appendChild(host);
      }

      if (composer !== state.composer) watchComposerSize(composer);
      state.composer = composer;
      state.composerForm = form || composer.closest('form');
      state.composerScope = scope;
      state.anchor = anchor || null;
      return true;
    }

    state.composer?.removeAttribute?.(core.COMPOSER_ATTR);

    if (core.hasConversation()) {
      host.dataset.placement = 'floating';
      if (host.parentElement !== document.body) document.body.appendChild(host);
      state.composer = state.composerForm = state.composerScope = state.anchor = null;
      clearResizeObserver();
      return true;
    }

    state.host = null;
    host.remove();
    state.composer = state.composerForm = state.composerScope = state.anchor = null;
    clearResizeObserver();
    return false;
  }

  function schedulePlacement(delay = PLACEMENT_DELAY_MS) {
    clearTimeout(state.placementTimer);
    state.placementTimer = setTimeout(placeHost, delay);
  }

  function reduceQueuedRoots(nodes) {
    const connected = nodes.filter((node) => node?.isConnected);
    return connected.filter((node, index) => !connected.some((other, otherIndex) =>
      otherIndex !== index && other instanceof Element && node instanceof Element && other.contains(node)
    ));
  }

  function flushContentQueue() {
    state.contentTimer = null;
    const full = state.fullScanRequested;
    state.fullScanRequested = false;
    const nodes = reduceQueuedRoots([...state.contentQueue]);
    state.contentQueue.clear();

    if (full) core.scanConversation(document);
    for (const node of nodes) core.scanAdded(node);
  }

  function queueContent(node, { full = false } = {}) {
    if (full) state.fullScanRequested = true;
    const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (element instanceof Element) state.contentQueue.add(element);
    if (state.contentTimer) return;
    state.contentTimer = setTimeout(flushContentQueue, CONTENT_SCAN_DELAY_MS);
  }

  function removedLivePlacement(node) {
    if (!(node instanceof Element)) return false;
    return [state.composer, state.composerForm, state.composerScope, state.anchor, state.host]
      .some((live) => live && (node === live || node.contains(live)));
  }

  function placementAttributeChanged(target) {
    if (!(target instanceof Element)) return false;
    if ([state.composer, state.composerForm, state.composerScope, state.anchor].includes(target)) return true;
    if (state.composerScope?.contains?.(target)) {
      return target.matches('button,[role="button"],[contenteditable="true"],textarea,form');
    }
    return core.hasPlacementSignal(target);
  }

  function handleMutations(mutations) {
    let placementChanged = false;

    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        queueContent(mutation.target);
        continue;
      }

      if (mutation.type === 'attributes') {
        if (placementAttributeChanged(mutation.target)) placementChanged = true;
        if (mutation.target.closest?.(core.TURN_SELECTOR) || core.hasConversationSignal(mutation.target)) {
          queueContent(mutation.target);
        }
        continue;
      }

      if (mutation.type !== 'childList') continue;

      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) queueContent(node);
        if (node instanceof Element) {
          if (core.hasPlacementSignal(node)) placementChanged = true;
          if (!state.host && core.hasConversationSignal(node)) placementChanged = true;
        }
      }

      for (const node of mutation.removedNodes) {
        if (!(node instanceof Element)) continue;
        if (removedLivePlacement(node) || core.hasPlacementSignal(node)) placementChanged = true;
        if (state.host?.dataset.placement === 'floating' && core.hasConversationSignal(node)) placementChanged = true;
      }
    }

    if (placementChanged) schedulePlacement();
  }

  function listenStorage() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' && area !== 'local') return;
      const record = normalizeStored(changes[STORAGE_KEY]?.newValue);
      if (!record) return;
      if (record.updatedAt < state.updatedAt) return;
      if (record.updatedAt === state.updatedAt && record.mode === state.mode) return;

      state.updatedAt = record.updatedAt;
      applyMode(record.mode);

      const mirrorArea = area === 'sync' ? 'local' : 'sync';
      void readArea(mirrorArea).then((current) => {
        if (!sameRecord(current, record)) return writeArea(mirrorArea, record);
        return undefined;
      });
    });
  }

  function listenMessages() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== TOGGLE_MESSAGE) return undefined;
      void toggleMode().then((mode) => sendResponse?.({ mode }));
      return true;
    });
  }

  function handleNavigation() {
    queueContent(document.documentElement, { full: true });
    schedulePlacement(0);
  }

  async function init() {
    await loadMode();
    applyMode(state.mode);
    core.scanConversation(document);
    placeHost();

    state.observer = new MutationObserver(handleMutations);
    state.observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'data-testid', 'data-composer-submit', 'data-chatgpt-composer', 'data-type',
        'data-mobile-composer', 'data-composer-markdown', 'data-composer-trailing', 'data-turn-key',
        'data-content-search-unit-key', 'data-chatgpt-search-unit-key',
        'data-user-message-bubble', 'data-user-message-copy', 'data-markdown-text-style',
        'data-assistant-markdown', 'data-message-role', 'data-message-author-role',
        'data-turn', 'data-math', 'data-math-source',
        'data-language', 'aria-label', 'aria-disabled', 'aria-hidden', 'aria-live',
        'disabled', 'hidden', 'contenteditable', 'role', 'id',
      ],
      subtree: true,
    });

    window.addEventListener('popstate', handleNavigation, { passive: true });
    window.addEventListener('hashchange', handleNavigation, { passive: true });
    window.addEventListener('pageshow', handleNavigation, { passive: true });
    window.addEventListener('resize', () => schedulePlacement(80), { passive: true });
    window.navigation?.addEventListener('navigate', handleNavigation);
    document.addEventListener('focusin', (event) => {
      if (!(event.target instanceof Element)) return;
      if (core.EDITORS.some((selector) => event.target.matches(selector)) && core.likelyEditor(event.target, core.getComposerForm())) {
        schedulePlacement(0);
      }
    }, true);

    listenStorage();
    listenMessages();

    window.addEventListener('keydown', (event) => {
      if (event.altKey && event.shiftKey && (event.key === 'X' || event.key === 'x' || event.code === 'KeyX')) {
        event.preventDefault();
        void toggleMode();
      }
    }, true);
  }

  void init();
})();
