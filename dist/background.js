// background.js — Service worker for WebMCP Explorer

// Open side panel on action icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Inject content script into all existing tabs on install/update
// (manifest content_scripts only applies to new navigations, not pre-existing tabs)
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
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

/**
 * Collect tools from frames in a tab, respecting the allow_iframe setting.
 * Returns an array of { frameId, url, tools[] } entries.
 */
async function collectToolsFromAllFrames(tabId) {
  const results = [];
  const stored = await chrome.storage.local.get('allow_iframe');
  const allowIframe = stored.allow_iframe ?? false; // default: off

  // When iframes are disabled, query only the top frame directly
  if (!allowIframe) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'LIST_TOOLS' }, { frameId: 0 });
      if (response?.tools?.length) {
        results.push({
          frameId: 0,
          url: response.url || '',
          isTopFrame: true,
          tools: response.tools,
        });
      }
    } catch {
      // Top frame may not have the content script or WebMCP
    }
    return results;
  }

  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    if (!frames) return results;

    const promises = frames.map(async (frame) => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'LIST_TOOLS' }, { frameId: frame.frameId });
        if (response?.tools?.length) {
          results.push({
            frameId: frame.frameId,
            url: response.url || frame.url,
            isTopFrame: frame.parentFrameId === -1,
            tools: response.tools,
          });
        }
      } catch {
        // Frame may not have the content script or WebMCP
      }
    });

    await Promise.all(promises);
  } catch {
    // webNavigation.getAllFrames may fail for special tabs
  }
  return results;
}

async function updateBadge(tabId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id !== tabId) return;
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    const frameResults = await collectToolsFromAllFrames(tabId);
    const count = frameResults.reduce((sum, fr) => sum + fr.tools.length, 0);
    chrome.action.setBadgeText({ text: count > 0 ? `${count}` : '', tabId });
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// Forward TOOLS_CHANGED messages from content script to side panel
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'TOOLS_CHANGED' && sender.tab) {
    // Ignore iframe tool changes when allow_iframe is off
    if (sender.frameId !== 0) {
      chrome.storage.local.get('allow_iframe').then((stored) => {
        if (stored.allow_iframe ?? false) {
          updateBadge(sender.tab.id);
        }
      });
    } else {
      updateBadge(sender.tab.id);
    }
    return;
  }

});
