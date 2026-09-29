'use strict';

const TOGGLE_MESSAGE = 'chatgpt-rtl:toggle';
const RETRY_DELAYS_MS = [0, 150, 450];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      await chrome.tabs.sendMessage(tab.id, { type: TOGGLE_MESSAGE });
      return;
    } catch (_) {}
  }
});
