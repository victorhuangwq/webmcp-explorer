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
 * Convert WebMCP tool definitions to OpenAI function calling format.
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
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters,
      },
    };
  });
}

/**
 * Send a chat completion request to Azure OpenAI.
 */
async function sendMessage(messages, tools = []) {
  const client = createClient();
  const s = getSettings();

  const requestParams = {
    model: s.deploymentName,
    messages,
  };

  if (tools.length > 0) {
    requestParams.tools = convertToolsToOpenAI(tools);
    requestParams.tool_choice = 'auto';
  }

  const response = await client.chat.completions.create(requestParams);
  const choice = response.choices[0];

  if (!choice) {
    throw new Error('No response from Azure OpenAI');
  }

  const message = choice.message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    return {
      toolCalls: message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })),
      rawMessage: message,
    };
  }

  return {
    text: message.content || '',
    rawMessage: message,
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

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
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

    // 2. Update system message with current tools
    messages[0] = {
      role: 'system',
      content: SYSTEM_PROMPT + '\n\nCURRENTLY AVAILABLE TOOLS:\n' +
        tools.map((t) => {
          const schema = t.inputSchema
            ? (typeof t.inputSchema === 'string' ? t.inputSchema : JSON.stringify(t.inputSchema))
            : '{}';
          return `- ${t.name}: ${t.description}\n  inputSchema: ${schema}`;
        }).join('\n'),
    };

    // 3. Send to Azure OpenAI
    onStep({ type: 'llm_request', data: { iteration, messageCount: messages.length } });

    let response;
    try {
      response = await sendMessage(messages, tools);
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
      messages.push({ role: 'assistant', content: response.text });
      onStep({ type: 'completed', data: { iteration, reason: response.text } });
      return;
    }

    // 6. Handle tool calls
    if (response.toolCalls) {
      // Append assistant message with tool calls
      messages.push(response.rawMessage);

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
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Tool call was skipped by the user.',
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

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: resultText,
        });

        // Wait for page to settle
        await settle();
      }
    }
  }

  onStep({ type: 'completed', data: { iteration: maxIterations, reason: 'Max iterations reached.' } });
}

// Re-export for manual tool execution (no LLM)
export { listTools, executeTool };
