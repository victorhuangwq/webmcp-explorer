// content.js — Bridge between extension and navigator.modelContextTesting API

console.debug('[WebMCP Explorer] Content script injected in', window === top ? 'top frame' : 'iframe', location.href);

let toolsChangedNotified = false;

chrome.runtime.onMessage.addListener(({ action, name, inputArgs }, _, reply) => {
  if (!action || (action !== 'LIST_TOOLS' && action !== 'EXECUTE_TOOL')) return;

  try {
    if (!navigator.modelContextTesting) {
      throw new Error(
        'WebMCP not available. Enable the "Enables WebMCP for Testing" flag in chrome://flags.'
      );
    }

    if (action === 'LIST_TOOLS') {
      const tools = navigator.modelContextTesting.listTools();
      console.debug(`[WebMCP Explorer] Listed ${tools.length} tools in ${location.href}`);
      reply({ tools, url: location.href, isTopFrame: window === top });

      // Register callback once to notify on tool changes
      if (!toolsChangedNotified) {
        toolsChangedNotified = true;
        navigator.modelContextTesting.registerToolsChangedCallback(() => {
          const updatedTools = navigator.modelContextTesting.listTools();
          console.debug(`[WebMCP Explorer] Tools changed: ${updatedTools.length} tools in ${location.href}`);
          chrome.runtime.sendMessage({ type: 'TOOLS_CHANGED', tools: updatedTools, url: location.href, isTopFrame: window === top });
        });
      }
      return false; // synchronous reply
    }

    if (action === 'EXECUTE_TOOL') {
      console.debug(`[WebMCP Explorer] Executing tool "${name}" with`, inputArgs);
      const promise = navigator.modelContextTesting.executeTool(name, inputArgs);
      promise
        .then((result) => {
          console.debug(`[WebMCP Explorer] Tool "${name}" result:`, result);
          reply({ success: true, result });
        })
        .catch((err) => {
          console.error(`[WebMCP Explorer] Tool "${name}" error:`, err);
          reply({ success: false, error: err.message });
        });
      return true; // async reply
    }
  } catch (err) {
    reply({ success: false, error: err.message });
  }
});
