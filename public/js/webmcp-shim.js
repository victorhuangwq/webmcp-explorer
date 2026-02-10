// webmcp-shim.js — Polyfill for navigator.modelContext
// Creates a functional modelContext object so tools can be tested via the browser console.
// If the real WebMCP API is already present (injected by a browser agent), this does nothing.

(function () {
  if ('modelContext' in navigator) {
    console.log('[WebMCP] Real navigator.modelContext detected — shim not needed.');
    return;
  }

  console.log('[WebMCP Shim] Polyfilling navigator.modelContext for development/testing.');

  const registeredTools = new Map();

  const modelContext = {
    provideContext({ tools = [] } = {}) {
      registeredTools.clear();
      for (const tool of tools) {
        registeredTools.set(tool.name, tool);
      }
      console.log(`[WebMCP] provideContext: registered ${tools.length} tool(s):`, tools.map(t => t.name).join(', '));
    },

    registerTool(tool) {
      registeredTools.set(tool.name, tool);
      console.log(`[WebMCP] registerTool: "${tool.name}"`);
    },

    unregisterTool(name) {
      registeredTools.delete(name);
      console.log(`[WebMCP] unregisterTool: "${name}"`);
    },

    // ---- Helpers for console testing ----

    // List all currently registered tools
    get tools() {
      return Array.from(registeredTools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }));
    },

    // Call a tool by name with params — used from the browser console
    // Usage: navigator.modelContext.call('select-order-type', { type: 'delivery' })
    async call(toolName, params = {}) {
      const tool = registeredTools.get(toolName);
      if (!tool) {
        console.error(`[WebMCP] Tool "${toolName}" not found. Available: ${Array.from(registeredTools.keys()).join(', ')}`);
        return;
      }

      // Create a mock agent object
      const mockAgent = {
        async requestUserInteraction(callback) {
          console.log('[WebMCP] agent.requestUserInteraction called');
          return await callback();
        }
      };

      console.log(`[WebMCP] Calling tool "${toolName}" with params:`, params);
      try {
        const result = await tool.execute(params, mockAgent);
        console.log(`[WebMCP] Tool "${toolName}" result:`, result);
        return result;
      } catch (err) {
        console.error(`[WebMCP] Tool "${toolName}" error:`, err.message);
        throw err;
      }
    },

    // Print a formatted summary of available tools
    help() {
      const tools = Array.from(registeredTools.values());
      if (tools.length === 0) {
        console.log('[WebMCP] No tools registered for current step.');
        return;
      }
      console.group(`[WebMCP] ${tools.length} tool(s) available:`);
      for (const tool of tools) {
        const params = tool.inputSchema?.properties
          ? Object.entries(tool.inputSchema.properties).map(([k, v]) => {
              const req = tool.inputSchema.required?.includes(k) ? ' (required)' : '';
              return `    ${k}: ${v.type}${v.enum ? ` [${v.enum.join('|')}]` : ''}${req}`;
            }).join('\n')
          : '    (no parameters)';
        console.log(`\n  ${tool.name} — ${tool.description}\n${params}`);
      }
      console.groupEnd();
    }
  };

  Object.defineProperty(navigator, 'modelContext', {
    value: modelContext,
    writable: false,
    configurable: true
  });

  // Make it easy to access from console
  window.mcp = modelContext;

  console.log('[WebMCP Shim] Ready. Try:');
  console.log('  navigator.modelContext.help()     — list available tools');
  console.log('  navigator.modelContext.tools       — get tool schemas');
  console.log("  navigator.modelContext.call('select-order-type', { type: 'delivery' })");
  console.log('  mcp.help()  / mcp.call(...)       — shorthand');
})();
