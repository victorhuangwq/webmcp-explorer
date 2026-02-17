// agent.js — Autonomous agent loop over WebMCP tools with Azure OpenAI

import { AzureOpenAI } from './openai-bundle.js';

// ============ SETTINGS ============

/**
 * Get stored Azure OpenAI settings from localStorage.
 */
export function getSettings() {
  return {
    endpoint: localStorage.getItem('aoai_endpoint') || '',
    apiKey: localStorage.getItem('aoai_apiKey') || '',
    deploymentName: localStorage.getItem('aoai_deployment') || '',
    apiVersion: localStorage.getItem('aoai_apiVersion') || '2024-12-01-preview',
  };
}

/**
 * Save Azure OpenAI settings to localStorage.
 */
export function saveSettings({ endpoint, apiKey, deploymentName, apiVersion }) {
  localStorage.setItem('aoai_endpoint', endpoint || '');
  localStorage.setItem('aoai_apiKey', apiKey || '');
  localStorage.setItem('aoai_deployment', deploymentName || '');
  localStorage.setItem('aoai_apiVersion', apiVersion || '2024-12-01-preview');
}

/**
 * Check if Azure OpenAI is configured.
 */
export function isConfigured() {
  const s = getSettings();
  return !!(s.endpoint && s.apiKey && s.deploymentName);
}

// ============ AZURE OPENAI CLIENT ============

/**
 * Create an AzureOpenAI client from stored settings.
 */
function createClient() {
  const s = getSettings();
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
  const client = createClient();
  const s = getSettings();

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
2. When your goal is fully achieved, respond with a plain text summary — do NOT call any more tools.
3. If no tools are available, respond with a status message.
4. Use the tool descriptions to understand what each tool does and what parameters it expects.
5. Always progress toward the user's goal. Do not repeat actions already completed.`;

/**
 * Query current tools from the page via content script.
 */
async function listTools() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'LIST_TOOLS' });
    return response?.tools || [];
  } catch {
    return [];
  }
}

/**
 * Execute a tool on the page via content script.
 */
async function executeTool(name, args) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const inputArgs = typeof args === 'string' ? args : JSON.stringify(args);
  const response = await chrome.tabs.sendMessage(tab.id, {
    action: 'EXECUTE_TOOL',
    name,
    inputArgs,
  });
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
 * @param {number} options.maxIterations - Safety limit (default 20)
 * @param {function} options.onStep - Callback for each step: ({ type, data })
 * @param {function} options.waitForApproval - Async function that resolves when user approves
 * @param {AbortSignal} options.signal - AbortController signal to cancel
 * @returns {Promise<void>}
 */
export async function runAgent(goal, options = {}) {
  const {
    autoApprove = true,
    maxIterations = 20,
    onStep = () => {},
    waitForApproval = async () => {},
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

    // 2. Build instructions with current tool descriptions
    const instructions = SYSTEM_PROMPT + '\n\nCURRENTLY AVAILABLE TOOLS:\n' +
      tools.map((t) => {
        const schema = t.inputSchema
          ? (typeof t.inputSchema === 'string' ? t.inputSchema : JSON.stringify(t.inputSchema))
          : '{}';
        return `- ${t.name}: ${t.description}\n  inputSchema: ${schema}`;
      }).join('\n');

    // 3. Send to Azure OpenAI (Responses API)
    onStep({ type: 'llm_request', data: { iteration, messageCount: input.length } });

    let response;
    try {
      // Pass instructions as a top-level param; input carries the user/tool messages
      const client = createClient();
      const s = getSettings();

      const requestParams = {
        model: s.deploymentName,
        instructions,
        input,
        tools: convertToolsToOpenAI(tools),
        tool_choice: 'auto',
      };

      if (previousResponseId) {
        requestParams.previous_response_id = previousResponseId;
      }

      const apiResponse = await client.responses.create(requestParams);

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
      onStep({ type: 'error', data: { iteration, error: err.message } });
      return;
    }

    if (signal?.aborted) {
      onStep({ type: 'aborted', data: { iteration } });
      return;
    }

    // 4. Handle empty response (no text, no tool calls)
    if (!response.text && !response.toolCalls) {
      onStep({ type: 'error', data: { iteration, error: 'LLM returned empty response' } });
      return;
    }

    // 5. Handle text-only response (goal achieved)
    if (response.text && !response.toolCalls) {
      previousResponseId = response.responseId;
      onStep({ type: 'completed', data: { iteration, reason: response.text } });
      return;
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

        // Execute the tool
        onStep({ type: 'tool_executing', data: { iteration, name: toolCall.name } });
        let result;
        try {
          result = await executeTool(toolCall.name, toolCall.arguments);
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
    }
  }

  onStep({ type: 'completed', data: { iteration: maxIterations, reason: 'Max iterations reached.' } });
}

// Re-export for manual tool execution (no LLM)
export { listTools, executeTool };
