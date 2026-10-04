'use strict';

const TOGGLE_MESSAGE = 'chatgpt-rtl:toggle';
const RELOAD_ACTION = 'RELOAD_EXTENSION_AND_CLOSE';
const RETRY_DELAYS_MS = [0, 150, 450];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendToggle(tabId) {
  if (!tabId) return;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      await chrome.tabs.sendMessage(tabId, { type: TOGGLE_MESSAGE });
      return;
    } catch (_) {}
  }
}

// Browser toolbar action click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) await sendToggle(tab.id);
});

// Configurable keyboard shortcut (chrome://extensions/shortcuts)
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'toggle-rtl') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await sendToggle(tab.id);
  }
});

// Automatic reload trigger on git push (native, zero extra extension needed)
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.action === RELOAD_ACTION) {
    if (sender?.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {});
    }
    const manifestMatches = chrome.runtime.getManifest()?.content_scripts?.[0]?.matches;
    const queryOptions = manifestMatches ? { url: manifestMatches } : {};
    chrome.tabs.query(queryOptions, (tabs) => {
      for (const t of tabs || []) {
        if (t.id && t.id !== sender?.tab?.id) {
          chrome.tabs.reload(t.id).catch(() => {});
        }
      }
      chrome.runtime.reload();
    });
    return true;
  }
});
