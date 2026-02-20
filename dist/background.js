// background.js — Service worker for WebMCP Explorer

// Open side panel on action icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Inject content script into all existing tabs (all frames) on install
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

  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    if (!frames) return results;

    const framesToQuery = allowIframe
      ? frames
      : frames.filter((f) => f.parentFrameId === -1); // top frame only

    const promises = framesToQuery.map(async (frame) => {
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
    // Re-compute badge from all frames
    updateBadge(sender.tab.id);
  }

  // Handle LIST_ALL_FRAME_TOOLS requests from the sidebar/agent
  if (msg.type === 'LIST_ALL_FRAME_TOOLS') {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      const frameResults = await collectToolsFromAllFrames(tab.id);
      // Send the aggregated results back — the sender will have a callback
      chrome.runtime.sendMessage({ type: 'ALL_FRAME_TOOLS_RESULT', frameResults }).catch(() => {});
    })();
  }

  // Handle EXECUTE_IN_FRAME requests from the sidebar/agent
  if (msg.type === 'EXECUTE_IN_FRAME') {
    const { tabId, frameId, name, inputArgs } = msg;
    (async () => {
      try {
        const response = await chrome.tabs.sendMessage(
          tabId,
          { action: 'EXECUTE_TOOL', name, inputArgs },
          { frameId }
        );
        chrome.runtime.sendMessage({ type: 'EXECUTE_IN_FRAME_RESULT', response }).catch(() => {});
      } catch (err) {
        chrome.runtime.sendMessage({
          type: 'EXECUTE_IN_FRAME_RESULT',
          response: { success: false, error: err.message },
        }).catch(() => {});
      }
    })();
  }
});
