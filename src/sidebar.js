// sidebar.js — Side panel controller for WebMCP Explorer

import { runAgent, listTools, executeTool, saveSettings, isConfigured, getSettings } from './agent.js';

// ============ DOM REFS ============
const toolSelect = document.getElementById('toolSelect');
const toolArgs = document.getElementById('toolArgs');
const executeBtn = document.getElementById('executeBtn');
const toolResult = document.getElementById('toolResult');
const toolsList = document.getElementById('toolsList');

const goalInput = document.getElementById('goalInput');
const runBtn = document.getElementById('runBtn');
const stepBtn = document.getElementById('stepBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const autoApproveToggle = document.getElementById('autoApproveToggle');
const agentLog = document.getElementById('agentLog');

const approvalPanel = document.getElementById('approvalPanel');
const approvalDetails = document.getElementById('approvalDetails');
const approveBtn = document.getElementById('approveBtn');
const skipBtn = document.getElementById('skipBtn');
const abortBtn = document.getElementById('abortBtn');

const userReplyPanel = document.getElementById('userReplyPanel');
const userReplyQuestion = document.getElementById('userReplyQuestion');
const userReplyInput = document.getElementById('userReplyInput');
const userReplyBtn = document.getElementById('userReplyBtn');

const settingsEndpoint = document.getElementById('settingsEndpoint');
const settingsApiKey = document.getElementById('settingsApiKey');
const settingsDeployment = document.getElementById('settingsDeployment');
const settingsApiVersion = document.getElementById('settingsApiVersion');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');
const maxIterationsInput = document.getElementById('maxIterations');
const maxIterationsValue = document.getElementById('maxIterationsValue');

// ============ STATE ============
let currentTools = [];
let abortController = null;
let approvalResolver = null;
let userReplyResolver = null;

// ============ TABS ============
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ============ SETTINGS ============
async function loadSettings() {
  const s = await getSettings();
  settingsEndpoint.value = s.endpoint;
  settingsApiKey.value = s.apiKey;
  settingsDeployment.value = s.deploymentName;
  settingsApiVersion.value = s.apiVersion;
  const stored = await chrome.storage.local.get('agent_maxIterations');
  maxIterationsInput.value = stored.agent_maxIterations || '20';
  maxIterationsValue.textContent = maxIterationsInput.value;
}

saveSettingsBtn.onclick = async () => {
  try {
    await saveSettings({
      endpoint: settingsEndpoint.value.trim(),
      apiKey: settingsApiKey.value.trim(),
      deploymentName: settingsDeployment.value.trim(),
      apiVersion: settingsApiVersion.value.trim() || '2025-03-01-preview',
    });
    await updateAgentButtonState();
    settingsStatus.textContent = '✓ Settings saved';
    settingsStatus.style.color = '';
  } catch (err) {
    settingsStatus.textContent = `✗ ${err.message}`;
    settingsStatus.style.color = '#dc2626';
  }
  setTimeout(() => { settingsStatus.textContent = ''; settingsStatus.style.color = ''; }, 3000);
};

maxIterationsInput.oninput = () => {
  maxIterationsValue.textContent = maxIterationsInput.value;
  chrome.storage.local.set({ agent_maxIterations: maxIterationsInput.value });
};

loadSettings();

// ============ TOOL DISCOVERY ============
async function refreshTools() {
  currentTools = await listTools();
  renderToolsList();
  renderToolSelect();
}

function renderToolsList() {
  if (currentTools.length === 0) {
    toolsList.innerHTML = '<span class="muted">No tools detected.</span>';
    return;
  }
  toolsList.innerHTML = currentTools
    .map((t) => {
      const desc = t.description || '';
      const frameLabel = t._isTopFrame ? '' : ` <span class="tool-frame" title="${t._frameUrl || ''}">[iframe]</span>`;
      return `<div class="tool-chip" data-name="${t.name}" data-frame-id="${t._frameId ?? 0}" data-tab-id="${t._tabId ?? ''}">
        <span class="tool-name">${t.name}${frameLabel}</span>
        <span class="tool-desc" title="${desc}">${desc}</span>
      </div>`;
    })
    .join('');

  // Click a chip to select it in the dropdown
  toolsList.querySelectorAll('.tool-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      toolSelect.value = `${chip.dataset.name}@${chip.dataset.frameId}`;
      toolSelect.dispatchEvent(new Event('change'));
    });
  });
}

function renderToolSelect() {
  toolSelect.innerHTML = '';
  if (currentTools.length === 0) {
    toolSelect.innerHTML = '<option value="">— no tools —</option>';
    toolSelect.disabled = true;
    toolArgs.disabled = true;
    executeBtn.disabled = true;
    return;
  }

  currentTools.forEach((t) => {
    const opt = document.createElement('option');
    const frameLabel = t._isTopFrame ? '' : ' [iframe]';
    opt.value = `${t.name}@${t._frameId ?? 0}`;
    opt.textContent = `${t.name}${frameLabel}`;
    opt.dataset.inputSchema = t.inputSchema || '{}';
    opt.dataset.toolName = t.name;
    opt.dataset.frameId = t._frameId ?? 0;
    opt.dataset.tabId = t._tabId ?? '';
    toolSelect.appendChild(opt);
  });

  toolSelect.disabled = false;
  toolArgs.disabled = false;
  executeBtn.disabled = false;
  updateArgsTemplate();
}

// ============ MANUAL TOOL EXECUTION ============
toolSelect.onchange = updateArgsTemplate;

function updateArgsTemplate() {
  const selected = toolSelect.selectedOptions[0];
  if (!selected) return;
  const schemaStr = selected.dataset.inputSchema || '{}';
  try {
    const schema = JSON.parse(schemaStr);
    const template = generateTemplate(schema);
    toolArgs.value = JSON.stringify(template, null, 2);
  } catch {
    toolArgs.value = '{}';
  }
}

executeBtn.onclick = async () => {
  const selected = toolSelect.selectedOptions[0];
  const name = selected?.dataset?.toolName;
  if (!name) return;

  const frameId = parseInt(selected.dataset.frameId) || 0;
  const tabId = selected.dataset.tabId ? parseInt(selected.dataset.tabId) : undefined;

  executeBtn.disabled = true;
  toolResult.textContent = 'Executing...';

  try {
    const result = await executeTool(name, toolArgs.value, frameId, tabId);
    if (result?.success) {
      toolResult.textContent =
        typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2);
    } else {
      toolResult.textContent = `Error: ${result?.error || 'Unknown error'}`;
    }
  } catch (err) {
    toolResult.textContent = `Error: ${err.message}`;
  }

  executeBtn.disabled = false;

  // Re-discover tools after execution (tools may have changed)
  setTimeout(refreshTools, 500);
};

// ============ AGENT LOOP ============
async function updateAgentButtonState() {
  const configured = await isConfigured();
  runBtn.disabled = !configured;
  stepBtn.disabled = !configured;
  if (!configured) {
    runBtn.title = 'Configure Azure OpenAI in Settings first';
    stepBtn.title = 'Configure Azure OpenAI in Settings first';
  } else {
    runBtn.title = '';
    stepBtn.title = '';
  }
}

updateAgentButtonState();

async function startAgent(singleTurn) {
  const goal = goalInput.value.trim();
  if (!goal) return;

  runBtn.disabled = true;
  stepBtn.disabled = true;
  stopBtn.disabled = false;
  goalInput.disabled = true;
  if (!singleTurn) agentLog.textContent = '';

  abortController = new AbortController();

  const maxIter = singleTurn ? 1 : (parseInt(maxIterationsInput.value) || 20);
  const autoApprove = autoApproveToggle.checked;

  try {
    await runAgent(goal, {
      autoApprove,
      singleTurn,
      maxIterations: maxIter,
      signal: abortController.signal,
      onStep: handleAgentStep,
      waitForApproval: waitForUserApproval,
      waitForUserInput: waitForUserReply,
    });
  } catch (err) {
    logAgent('error', `Agent error: ${err.message}`);
  }

  runBtn.disabled = false;
  stepBtn.disabled = false;
  stopBtn.disabled = true;
  goalInput.disabled = false;
  approvalPanel.style.display = 'none';
  userReplyPanel.style.display = 'none';
  await updateAgentButtonState();

  // Refresh tools after execution (page state may have changed)
  if (singleTurn) setTimeout(refreshTools, 500);
}

runBtn.onclick = () => startAgent(false);
stepBtn.onclick = () => startAgent(true);

stopBtn.onclick = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  // Also reject any pending approval
  if (approvalResolver) {
    approvalResolver(false);
    approvalResolver = null;
  }
  // Also reject any pending user reply
  if (userReplyResolver) {
    userReplyResolver('');
    userReplyResolver = null;
  }
  userReplyPanel.style.display = 'none';
};

resetBtn.onclick = () => {
  agentLog.textContent = '';
  goalInput.value = '';
  approvalPanel.style.display = 'none';
  userReplyPanel.style.display = 'none';
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
};

function handleAgentStep({ type, data }) {
  switch (type) {
    case 'tools_discovered':
      logAgent('step', `── Step ${data.iteration} ──`);
      logAgent('tools', `Tools: ${data.tools.map((t) => t.name).join(', ')}`);
      // Also refresh the tools panel
      currentTools = data.tools;
      renderToolsList();
      renderToolSelect();
      break;
    case 'llm_request':
      logAgent('tools', `Thinking... (${data.messageCount} messages in context)`);
      break;
    case 'tool_call_pending':
      logAgent('call', `→ ${data.name}(${JSON.stringify(data.args)})`);
      break;
    case 'waiting_approval':
      logAgent('waiting', `⏸ Waiting for approval: ${data.name}`);
      break;
    case 'tool_executing':
      logAgent('tools', `Executing ${data.name}...`);
      break;
    case 'tool_result':
      logAgent('result', `← ${data.result}`);
      break;
    case 'completed':
      logAgent('done', `✓ ${data.reason}`);
      break;
    case 'ask_user':
      logAgent('waiting', `❓ ${data.question}`);
      break;
    case 'aborted':
      logAgent('error', `⏹ Aborted at step ${data.iteration}`);
      break;
    case 'skipped':
      logAgent('waiting', `⊘ Skipped ${data.name}`);
      break;
    case 'error':
      logAgent('error', `✗ ${data.error}`);
      break;
  }
}

function logAgent(cls, text) {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${cls}`;
  entry.textContent = text;
  agentLog.appendChild(entry);
  agentLog.scrollTop = agentLog.scrollHeight;
}

// ============ APPROVAL FLOW ============
function waitForUserApproval(toolName, args) {
  return new Promise((resolve) => {
    approvalResolver = resolve;
    approvalDetails.textContent = `${toolName}(${JSON.stringify(args, null, 2)})`;
    approvalPanel.style.display = 'block';
  });
}

approveBtn.onclick = () => {
  if (approvalResolver) {
    approvalResolver(true);
    approvalResolver = null;
  }
  approvalPanel.style.display = 'none';
};

skipBtn.onclick = () => {
  if (approvalResolver) {
    approvalResolver(false);
    approvalResolver = null;
  }
  approvalPanel.style.display = 'none';
};

abortBtn.onclick = () => {
  if (approvalResolver) {
    approvalResolver(false);
    approvalResolver = null;
  }
  approvalPanel.style.display = 'none';
  stopBtn.click();
};

// ============ USER REPLY FLOW ============
function waitForUserReply(question) {
  return new Promise((resolve) => {
    userReplyResolver = resolve;
    userReplyQuestion.textContent = question;
    userReplyInput.value = '';
    userReplyPanel.style.display = 'block';
    userReplyInput.focus();
  });
}

userReplyBtn.onclick = () => {
  if (userReplyResolver) {
    const reply = userReplyInput.value.trim() || '(no reply)';
    logAgent('result', `💬 ${reply}`);
    userReplyResolver(reply);
    userReplyResolver = null;
  }
  userReplyPanel.style.display = 'none';
};

userReplyInput.onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    userReplyBtn.click();
  }
};

// ============ TOOL SCHEMA TEMPLATE GENERATOR ============
function generateTemplate(schema) {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.type !== 'object' || !schema.properties) return {};

  const obj = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.enum) obj[key] = prop.enum[0];
    else if (prop.type === 'string') obj[key] = '';
    else if (prop.type === 'integer' || prop.type === 'number') obj[key] = 0;
    else if (prop.type === 'boolean') obj[key] = false;
    else if (prop.type === 'array') obj[key] = [];
    else obj[key] = null;
  }
  return obj;
}

// ============ LISTEN FOR TOOL CHANGES ============
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TOOLS_CHANGED') {
    // A frame reported tool changes — refresh all frames to get the full picture
    refreshTools();
  } else if (msg.type === 'TAB_ACTIVATED') {
    refreshTools();
  }
});

// ============ KEYBOARD SHORTCUTS ============
goalInput.onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runBtn.click();
  }
};

// ============ INIT ============
refreshTools();
