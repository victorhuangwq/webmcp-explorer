// content.js — Bridge between extension and navigator.modelContextTesting API

console.debug('[WebMCP Agent] Content script injected');

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
      console.debug(`[WebMCP Agent] Listed ${tools.length} tools`);
      reply({ tools, url: location.href });

      // Register callback once to notify on tool changes
      if (!toolsChangedNotified) {
        toolsChangedNotified = true;
        navigator.modelContextTesting.registerToolsChangedCallback(() => {
          const updatedTools = navigator.modelContextTesting.listTools();
          console.debug(`[WebMCP Agent] Tools changed: ${updatedTools.length} tools`);
          chrome.runtime.sendMessage({ type: 'TOOLS_CHANGED', tools: updatedTools, url: location.href });
        });
      }
      return false; // synchronous reply
    }

    if (action === 'EXECUTE_TOOL') {
      console.debug(`[WebMCP Agent] Executing tool "${name}" with`, inputArgs);
      const promise = navigator.modelContextTesting.executeTool(name, inputArgs);
      promise
        .then((result) => {
          console.debug(`[WebMCP Agent] Tool "${name}" result:`, result);
          reply({ success: true, result });
        })
        .catch((err) => {
          console.error(`[WebMCP Agent] Tool "${name}" error:`, err);
          reply({ success: false, error: err.message });
        });
      return true; // async reply
    }
  } catch (err) {
    reply({ success: false, error: err.message });
  }
});
