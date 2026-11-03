'use strict';

const TOGGLE_MESSAGE = 'chatgpt-rtl:toggle';
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
