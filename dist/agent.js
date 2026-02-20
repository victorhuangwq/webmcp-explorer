// agent.js — WebMCP Explorer: autonomous agent loop over WebMCP tools with Azure OpenAI

import { AzureOpenAI } from './openai-bundle.js';

// ============ SETTINGS ============

const SETTINGS_KEYS = {
  endpoint: 'aoai_endpoint',
  apiKey: 'aoai_apiKey',
  deploymentName: 'aoai_deployment',
  apiVersion: 'aoai_apiVersion',
  allowIframe: 'allow_iframe',
};

const DEFAULTS = { endpoint: '', apiKey: '', deploymentName: '', apiVersion: '2025-03-01-preview', allowIframe: false };

/**
 * Get stored Azure OpenAI settings from chrome.storage.local.
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(Object.values(SETTINGS_KEYS));
  return {
    endpoint: result[SETTINGS_KEYS.endpoint] || DEFAULTS.endpoint,
    apiKey: result[SETTINGS_KEYS.apiKey] || DEFAULTS.apiKey,
    deploymentName: result[SETTINGS_KEYS.deploymentName] || DEFAULTS.deploymentName,
    apiVersion: result[SETTINGS_KEYS.apiVersion] || DEFAULTS.apiVersion,
    allowIframe: result[SETTINGS_KEYS.allowIframe] ?? DEFAULTS.allowIframe,
  };
}

/**
 * Save Azure OpenAI settings to chrome.storage.local.
 * Validates that the endpoint uses HTTPS.
 */
export async function saveSettings({ endpoint, apiKey, deploymentName, apiVersion }) {
  const trimmedEndpoint = (endpoint || '').trim();
  if (trimmedEndpoint && !trimmedEndpoint.startsWith('https://')) {
    throw new Error('Endpoint must use HTTPS (e.g., https://your-resource.openai.azure.com)');
  }
  await chrome.storage.local.set({
    [SETTINGS_KEYS.endpoint]: trimmedEndpoint,
    [SETTINGS_KEYS.apiKey]: apiKey || '',
    [SETTINGS_KEYS.deploymentName]: deploymentName || '',
    [SETTINGS_KEYS.apiVersion]: apiVersion || DEFAULTS.apiVersion,
  });
}

/**
 * Get the allow_iframe setting.
 */
export async function getAllowIframe() {
  const result = await chrome.storage.local.get(SETTINGS_KEYS.allowIframe);
  return result[SETTINGS_KEYS.allowIframe] ?? DEFAULTS.allowIframe;
}

/**
 * Set the allow_iframe setting.
 */
export async function setAllowIframe(value) {
  await chrome.storage.local.set({ [SETTINGS_KEYS.allowIframe]: !!value });
}

/**
 * Check if Azure OpenAI is configured.
 */
export async function isConfigured() {
  const s = await getSettings();
  return !!(s.endpoint && s.apiKey && s.deploymentName);
}

// ============ AZURE OPENAI CLIENT ============

/**
 * Create an AzureOpenAI client from stored settings.
 */
async function createClient() {
  const s = await getSettings();
  if (!s.endpoint || !s.apiKey || !s.deploymentName) {
    throw new Error('Azure OpenAI not configured. Set endpoint, API key, and deployment name.');
  }
  return new AzureOpenAI({
    endpoint: s.endpoint,
    apiKey: s.apiKey,
    apiVersion: s.apiVersion,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Convert WebMCP tool definitions to Responses API function tool format.
 */
function convertToolsToOpenAI(webmcpTools) {
  return webmcpTools.map((tool) => {
    let parameters = { type: 'object', properties: {} };
    if (tool.inputSchema) {
      try {
        parameters = typeof tool.inputSchema === 'string'
          ? JSON.parse(tool.inputSchema)
          : tool.inputSchema;
      } catch {}
    }
    return {
      type: 'function',
      name: tool.name,
      description: tool.description || '',
      parameters,
    };
  });
}

/**
 * Send a request to Azure OpenAI using the Responses API.
 * @param {Array} input - Input items (messages, function_call_output, etc.)
 * @param {Array} tools - WebMCP tool definitions
 * @param {string|null} previousResponseId - Previous response ID for chaining
 */
async function sendMessage(input, tools = [], previousResponseId = null) {
  const client = await createClient();
  const s = await getSettings();

  const requestParams = {
    model: s.deploymentName,
    input,
  };

  if (previousResponseId) {
    requestParams.previous_response_id = previousResponseId;
  }

  if (tools.length > 0) {
    requestParams.tools = convertToolsToOpenAI(tools);
    requestParams.tool_choice = 'auto';
  }

  const response = await client.responses.create(requestParams);

  if (!response.output || response.output.length === 0) {
    throw new Error('No response from Azure OpenAI');
  }

  // Check for function calls in output
  const toolCalls = response.output.filter((item) => item.type === 'function_call');

  if (toolCalls.length > 0) {
    return {
      toolCalls: toolCalls.map((tc) => ({
        id: tc.call_id,
        name: tc.name,
        arguments: tc.arguments,
      })),
      responseId: response.id,
    };
  }

  return {
    text: response.output_text || '',
    responseId: response.id,
  };
}

// ============ AGENT LOOP ============

const SYSTEM_PROMPT = `You are a browser automation agent. You interact with web pages by calling WebMCP tools exposed by the page.

RULES:
1. Call exactly ONE tool per turn. After each call, the available tools may change (the page updates its state). You will receive the updated tool list.
2. When the goal is fully achieved, call the "complete" tool with a short summary.
3. Use the tool descriptions to understand what each tool does and what parameters it expects.
4. Always progress toward the user's goal. Do not repeat actions already completed.`;

const COMPLETE_TOOL = {
  type: 'function',
  name: 'complete',
  description: 'Call this tool when the user\'s goal has been fully achieved. Provide a short summary of what was accomplished.',
  parameters: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'A short summary of what was accomplished.' },
    },
    required: ['summary'],
  },
};

const ASK_USER_TOOL = {
  type: 'function',
  name: 'ask_user',
  description: 'Call this tool when you need additional information from the user that was not provided in the goal (e.g., name, phone number, email, preferences). Ask a clear, specific question.',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the user.' },
    },
    required: ['question'],
  },
};

/**
 * Query current tools from the active tab.
 * When allow_iframe is enabled, queries ALL frames; otherwise only the top frame.
 * Each tool is annotated with _frameId, _tabId, and _frameUrl for routing.
 */
async function listTools() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return [];

  const allowIframe = await getAllowIframe();

  // If iframes disabled, only query the top frame
  if (!allowIframe) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'LIST_TOOLS' });
      return (response?.tools || []).map((t) => ({
        ...t,
        _frameId: 0,
        _tabId: tab.id,
        _frameUrl: response?.url || tab.url,
        _isTopFrame: true,
      }));
    } catch {
      return [];
    }
  }

  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    if (!frames) return [];

    const allTools = [];
    const seen = new Set();

    const promises = frames.map(async (frame) => {
      try {
        const response = await chrome.tabs.sendMessage(
          tab.id,
          { action: 'LIST_TOOLS' },
          { frameId: frame.frameId }
        );
        if (response?.tools?.length) {
          for (const tool of response.tools) {
            // Deduplicate by name+frameId
            const key = `${tool.name}@${frame.frameId}`;
            if (!seen.has(key)) {
              seen.add(key);
              allTools.push({
                ...tool,
                _frameId: frame.frameId,
                _tabId: tab.id,
                _frameUrl: response.url || frame.url,
                _isTopFrame: frame.parentFrameId === -1,
              });
            }
          }
        }
      } catch {
        // Frame may not have WebMCP or content script
      }
    });

    await Promise.all(promises);
    return allTools;
  } catch {
    // Fallback: try top frame only
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'LIST_TOOLS' });
      return (response?.tools || []).map((t) => ({
        ...t,
        _frameId: 0,
        _tabId: tab.id,
        _frameUrl: response?.url || tab.url,
        _isTopFrame: true,
      }));
    } catch {
      return [];
    }
  }
}

/**
 * Execute a tool on the page via content script, targeting the correct frame.
 * Blocks non-top-frame execution when allow_iframe is off.
 */
async function executeTool(name, args, frameId = 0, tabId = null) {
  // Enforce allow_iframe setting
  if (frameId !== 0) {
    const allowIframe = await getAllowIframe();
    if (!allowIframe) {
      return { success: false, error: 'Iframe tool execution is disabled (allow_iframe is off).' };
    }
  }
  if (!tabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab.id;
  }
  const inputArgs = typeof args === 'string' ? args : JSON.stringify(args);
  const response = await chrome.tabs.sendMessage(
    tabId,
    { action: 'EXECUTE_TOOL', name, inputArgs },
    { frameId }
  );
  return response;
}

/**
 * Wait for page state to settle after a tool call.
 */
function settle(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the autonomous agent loop.
 *
 * @param {string} goal - The user's high-level goal
 * @param {object} options
 * @param {boolean} options.autoApprove - If false, pause before each tool call
 * @param {boolean} options.singleTurn - If true, stop after the first tool call round
 * @param {number} options.maxIterations - Safety limit (default 20)
 * @param {function} options.onStep - Callback for each step: ({ type, data })
 * @param {function} options.waitForApproval - Async function that resolves when user approves
 * @param {function} options.waitForUserInput - Async function that resolves with user's text reply
 * @param {AbortSignal} options.signal - AbortController signal to cancel
 * @returns {Promise<void>}
 */
export async function runAgent(goal, options = {}) {
  const {
    autoApprove = true,
    singleTurn = false,
    maxIterations = 20,
    onStep = () => {},
    waitForApproval = async () => {},
    waitForUserInput = async () => '',
    signal,
  } = options;

  // Responses API: track previous response ID for chaining turns
  let previousResponseId = null;
  // Current input items for the next request
  let input = [
    { role: 'user', content: `Goal: ${goal}` },
  ];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (signal?.aborted) {
      onStep({ type: 'aborted', data: { iteration } });
      return;
    }

    // 1. Discover current tools
    const tools = await listTools();
    onStep({ type: 'tools_discovered', data: { iteration, tools } });

    if (tools.length === 0) {
      onStep({ type: 'completed', data: { iteration, reason: 'No tools available — end state reached.' } });
      return;
    }

    // 2. Build instructions with current tool descriptions (include frame origin info)
    const instructions = SYSTEM_PROMPT + '\n\nCURRENTLY AVAILABLE TOOLS:\n' +
      tools.map((t) => {
        const schema = t.inputSchema
          ? (typeof t.inputSchema === 'string' ? t.inputSchema : JSON.stringify(t.inputSchema))
          : '{}';
        const frameLabel = t._isTopFrame ? 'top frame' : `iframe: ${t._frameUrl || 'unknown'}`;
        return `- ${t.name} [${frameLabel}]: ${t.description}\n  inputSchema: ${schema}`;
      }).join('\n');

    // 3. Send to Azure OpenAI (Responses API)
    onStep({ type: 'llm_request', data: { iteration, messageCount: input.length } });

    let response;
    try {
      // Pass instructions as a top-level param; input carries the user/tool messages
      const client = await createClient();
      const s = await getSettings();

      const requestParams = {
        model: s.deploymentName,
        instructions,
        input,
        tools: [...convertToolsToOpenAI(tools), COMPLETE_TOOL, ASK_USER_TOOL],
        tool_choice: 'auto',
      };

      if (previousResponseId) {
        requestParams.previous_response_id = previousResponseId;
      }

      const apiResponse = await client.responses.create(requestParams, { signal });

      if (!apiResponse.output || apiResponse.output.length === 0) {
        throw new Error('No response from Azure OpenAI');
      }

      // Parse response
      const toolCalls = apiResponse.output.filter((item) => item.type === 'function_call');

      if (toolCalls.length > 0) {
        response = {
          toolCalls: toolCalls.map((tc) => ({
            id: tc.call_id,
            name: tc.name,
            arguments: tc.arguments,
          })),
          responseId: apiResponse.id,
        };
      } else {
        response = {
          text: apiResponse.output_text || '',
          responseId: apiResponse.id,
        };
      }
    } catch (err) {
      if (signal?.aborted) {
        onStep({ type: 'aborted', data: { iteration } });
        return;
      }
      onStep({ type: 'error', data: { iteration, error: err.message } });
      return;
    }

    if (signal?.aborted) {
      onStep({ type: 'aborted', data: { iteration } });
      return;
    }

    // 4. Handle empty response — log and continue
    if (!response.text && !response.toolCalls) {
      previousResponseId = response.responseId;
      continue;
    }

    // 5. Handle text-only response — log and continue
    if (response.text && !response.toolCalls) {
      previousResponseId = response.responseId;
      onStep({ type: 'tool_result', data: { iteration, name: 'assistant', result: response.text } });
      input = [{ role: 'user', content: 'Continue.' }];
      continue;
    }

    // 6. Handle tool calls
    if (response.toolCalls) {
      previousResponseId = response.responseId;
      // Collect function_call_output items for the next request
      const toolOutputs = [];

      for (const toolCall of response.toolCalls) {
        let parsedArgs;
        try {
          parsedArgs = JSON.parse(toolCall.arguments);
        } catch {
          parsedArgs = toolCall.arguments;
        }

        // Handle the built-in "complete" tool
        if (toolCall.name === 'complete') {
          const summary = parsedArgs?.summary || 'Goal achieved.';
          onStep({ type: 'completed', data: { iteration, reason: summary } });
          return;
        }

        // Handle the built-in "ask_user" tool
        if (toolCall.name === 'ask_user') {
          const question = parsedArgs?.question || 'Please provide more information.';
          onStep({ type: 'ask_user', data: { iteration, question } });
          const userReply = await waitForUserInput(question);
          if (signal?.aborted) {
            onStep({ type: 'aborted', data: { iteration } });
            return;
          }
          onStep({ type: 'tool_result', data: { iteration, name: 'ask_user', result: userReply } });
          toolOutputs.push({
            type: 'function_call_output',
            call_id: toolCall.id,
            output: userReply,
          });
          continue;
        }

        onStep({
          type: 'tool_call_pending',
          data: { iteration, name: toolCall.name, args: parsedArgs, toolCallId: toolCall.id },
        });

        // Wait for approval if needed
        if (!autoApprove) {
          onStep({ type: 'waiting_approval', data: { iteration, name: toolCall.name, args: parsedArgs } });
          const approved = await waitForApproval(toolCall.name, parsedArgs);
          if (!approved) {
            onStep({ type: 'skipped', data: { iteration, name: toolCall.name } });
            toolOutputs.push({
              type: 'function_call_output',
              call_id: toolCall.id,
              output: 'Tool call was skipped by the user.',
            });
            continue;
          }
        }

        if (signal?.aborted) {
          onStep({ type: 'aborted', data: { iteration } });
          return;
        }

        // Execute the tool — route to the correct frame
        onStep({ type: 'tool_executing', data: { iteration, name: toolCall.name } });
        // Find the tool definition to get frame routing info
        const toolDef = tools.find((t) => t.name === toolCall.name);
        const targetFrameId = toolDef?._frameId ?? 0;
        const targetTabId = toolDef?._tabId ?? null;
        let result;
        try {
          result = await executeTool(toolCall.name, toolCall.arguments, targetFrameId, targetTabId);
        } catch (err) {
          result = { success: false, error: err.message };
        }

        const resultText = result?.success
          ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result))
          : `Error: ${result?.error || 'Unknown error'}`;

        onStep({ type: 'tool_result', data: { iteration, name: toolCall.name, result: resultText } });

        toolOutputs.push({
          type: 'function_call_output',
          call_id: toolCall.id,
          output: resultText,
        });

        // Wait for page to settle
        await settle();
      }

      // Next turn: send tool outputs as input, chained via previous_response_id
      input = toolOutputs;

      // In single-turn mode, stop after executing the first round of tool calls
      if (singleTurn) {
        onStep({ type: 'completed', data: { iteration, reason: 'Single-turn mode — stopping after first tool call.' } });
        return;
      }
    }
  }

  onStep({ type: 'completed', data: { iteration: maxIterations, reason: 'Max iterations reached.' } });
}

// Re-export for manual tool execution (no LLM)
export { listTools, executeTool };
