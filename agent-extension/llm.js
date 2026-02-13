// llm.js — Azure OpenAI integration for the agent loop

import { AzureOpenAI } from './openai-bundle.js';

/**
 * Get stored LLM settings from localStorage.
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
 * Save LLM settings to localStorage.
 */
export function saveSettings({ endpoint, apiKey, deploymentName, apiVersion }) {
  localStorage.setItem('aoai_endpoint', endpoint || '');
  localStorage.setItem('aoai_apiKey', apiKey || '');
  localStorage.setItem('aoai_deployment', deploymentName || '');
  localStorage.setItem('aoai_apiVersion', apiVersion || '2024-12-01-preview');
}

/**
 * Check if LLM is configured.
 */
export function isConfigured() {
  const s = getSettings();
  return !!(s.endpoint && s.apiKey && s.deploymentName);
}

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
 * WebMCP tools have: { name, description, inputSchema (JSON string) }
 * OpenAI expects: { type: "function", function: { name, description, parameters } }
 */
export function convertToolsToOpenAI(webmcpTools) {
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
 * @param {Array} messages - OpenAI chat messages array
 * @param {Array} tools - WebMCP tool definitions (will be converted)
 * @returns {{ text?: string, toolCalls?: Array<{ id, name, arguments }> }}
 */
export async function sendMessage(messages, tools = []) {
  const client = createClient();
  const s = getSettings();

  const requestParams = {
    model: s.deploymentName,
    messages,
  };

  // Only include tools if available
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

  // Extract tool calls if present
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

  // Text-only response
  return {
    text: message.content || '',
    rawMessage: message,
  };
}
