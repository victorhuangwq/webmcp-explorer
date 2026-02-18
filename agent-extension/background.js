// background.js — Service worker for WebMCP Explorer

// Open side panel on action icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Inject content script into all existing tabs on install
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
      .catch(() => {});
  }
});

// Update badge with tool count and notify sidebar
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateBadge(tabId);
  chrome.runtime.sendMessage({ type: 'TAB_ACTIVATED', tabId }).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    updateBadge(tabId);
    chrome.runtime.sendMessage({ type: 'TAB_ACTIVATED', tabId }).catch(() => {});
  }
});

async function updateBadge(tabId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id !== tabId) return;
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    const response = await chrome.tabs.sendMessage(tabId, { action: 'LIST_TOOLS' });
    const count = response?.tools?.length || 0;
    chrome.action.setBadgeText({ text: count > 0 ? `${count}` : '', tabId });
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// Forward TOOLS_CHANGED messages from content script to side panel
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'TOOLS_CHANGED' && sender.tab) {
    const count = msg.tools?.length || 0;
    chrome.action.setBadgeText({ text: count > 0 ? `${count}` : '', tabId: sender.tab.id });
  }
});
