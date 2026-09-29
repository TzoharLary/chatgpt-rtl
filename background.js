'use strict';

const TOGGLE_MESSAGE = 'chatgpt-rtl:toggle';

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: TOGGLE_MESSAGE }).catch(() => {
    // No content script means this is not a supported ChatGPT page (or it is still loading).
  });
});
