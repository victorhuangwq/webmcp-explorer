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

  // ---- Golden-path example values per tool (for copy-paste snippets) ----
  const GOLDEN_EXAMPLES = {
    'select-order-type':   { type: 'delivery' },
    'set-delivery-address': { address: '1 Microsoft Way, Redmond, WA 98052' },
    'confirm-location':    { timing: 'now' },
    'select-category':     { category: 'specialty' },
    'select-pizza':        { pizzaId: 'pepperoni' },
    'customize-pizza':     { size: 'large', crust: 'hand-tossed' },
    'add-to-cart':         {},
    'update-cart-item':    { itemIndex: 0, quantity: 2 },
    'add-side':            { sideId: 'bread-bites' },
    'proceed-to-checkout': {},
    'set-checkout-info':   { firstName: 'John', lastName: 'Doe', phone: '4255551234', email: 'john@example.com' },
    'place-order':         {}
  };

  // Build example params from schema (fallback when no golden example exists)
  function buildExampleParams(schema) {
    if (!schema?.properties || Object.keys(schema.properties).length === 0) return {};
    const example = {};
    const required = new Set(schema.required || []);
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (!required.has(key)) continue; // only required in auto-generated example
      if (prop.enum) { example[key] = prop.enum[0]; }
      else if (prop.type === 'string') { example[key] = '...'; }
      else if (prop.type === 'integer' || prop.type === 'number') { example[key] = 1; }
      else if (prop.type === 'boolean') { example[key] = true; }
      else if (prop.type === 'array') { example[key] = []; }
      else { example[key] = '...'; }
    }
    return example;
  }

  // Format a params object as a short inline string for console output
  function formatParams(obj) {
    if (!obj || Object.keys(obj).length === 0) return '{}';
    const entries = Object.entries(obj).map(([k, v]) => {
      if (typeof v === 'string') return `${k}: '${v}'`;
      if (Array.isArray(v)) return `${k}: [${v.map(x => typeof x === 'string' ? `'${x}'` : x).join(', ')}]`;
      return `${k}: ${v}`;
    });
    return `{ ${entries.join(', ')} }`;
  }

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
    // Usage: await mcp.call('select-order-type', { type: 'delivery' })
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

      console.log(`[WebMCP] Calling "${toolName}"…`);
      try {
        const result = await tool.execute(params, mockAgent);
        console.log(`[WebMCP] ✓ "${toolName}" done.`);
        return result;
      } catch (err) {
        console.error(`[WebMCP] ✗ "${toolName}" error:`, err.message);
        throw err;
      }
    },

    // Print copy-paste-ready commands for all tools in the current step.
    // Pass a tool name to see details for just that tool: mcp.help('select-order-type')
    help(toolName) {
      const tools = Array.from(registeredTools.values());
      if (tools.length === 0) {
        console.log('%c No tools registered for the current step.', 'color: #999');
        return;
      }

      // Single-tool mode
      if (toolName) {
        const tool = registeredTools.get(toolName);
        if (!tool) {
          console.log(`%c Tool "${toolName}" not found.%c Available: ${Array.from(registeredTools.keys()).join(', ')}`, 'color: red', 'color: #999');
          return;
        }
        printToolHelp(tool, true);
        return;
      }

      // All-tools mode
      console.log('');
      console.log(`%c ⚡ ${tools.length} tool(s) available — copy & paste into console:`, 'font-weight: bold; font-size: 13px');
      console.log('');
      for (const tool of tools) {
        printToolHelp(tool, false);
      }
      console.log('%c ─────────────────────────────────────────', 'color: #ccc');
      console.log(`%c Tip:%c mcp.help('tool-name') for details on one tool`, 'font-weight: bold', 'font-weight: normal');
      console.log('');
    }
  };

  function printToolHelp(tool, detailed) {
    const schema = tool.inputSchema;
    const example = GOLDEN_EXAMPLES[tool.name] || buildExampleParams(schema);
    const snippet = `await mcp.call('${tool.name}', ${formatParams(example)})`;

    // Tool name + description
    console.log(`%c ${tool.name}`, 'color: #0B7BC0; font-weight: bold; font-size: 12px');
    console.log(`  ${tool.description}`);

    // Copy-paste snippet
    console.log(`%c  ${snippet}`, 'color: #2b6; font-size: 12px');

    // Optional params note
    const props = schema?.properties ? Object.keys(schema.properties) : [];
    const required = new Set(schema?.required || []);
    const optional = props.filter(p => !required.has(p));
    if (optional.length > 0 && !detailed) {
      console.log(`%c     optional: ${optional.join(', ')}`, 'color: #999; font-style: italic');
    }

    // Detailed mode: show all params with types and enums
    if (detailed && props.length > 0) {
      console.log('');
      console.log('%c  Parameters:', 'font-weight: bold');
      for (const [key, prop] of Object.entries(schema.properties)) {
        const req = required.has(key) ? ' (required)' : ' (optional)';
        const typeStr = prop.type + (prop.enum ? ` — one of: ${prop.enum.join(', ')}` : '');
        console.log(`    %c${key}%c: ${typeStr}${req}`, 'color: #0B7BC0', 'color: inherit');
        if (prop.description) {
          console.log(`      ${prop.description}`);
        }
      }
    }

    console.log('');
  }

  Object.defineProperty(navigator, 'modelContext', {
    value: modelContext,
    writable: false,
    configurable: true
  });

  // Make it easy to access from console
  window.mcp = modelContext;

  console.log('');
  console.log('%c 🍕 WebMCP Shim Ready', 'font-weight: bold; font-size: 14px; color: #0B7BC0');
  console.log('  navigator.modelContext not found — polyfill activated.');
  console.log('  Type %cmcp.help()%c to see copy-paste-ready commands for the current step.', 'color: #2b6; font-weight: bold', 'color: inherit');
  console.log('');
})();
