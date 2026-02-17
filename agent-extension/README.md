# WebMCP Agent Controller — Chrome/Edge Extension

> ⚠️ **Experimental Preview** — This extension is for developer testing only. Not intended for production use. Only use on sites you trust.

## What is this?

A browser extension that lets an AI agent interact with web pages through the [WebMCP API](https://github.com/nicolo-ribaudo/webmcp-explainer). The agent discovers tools exposed by a page and calls them autonomously to complete a user-defined goal.

## Prerequisites

### 1. Azure OpenAI (AI Foundry)

You need an Azure OpenAI resource with a deployed model (e.g., `gpt-4o`).

From [Azure AI Foundry](https://ai.azure.com/), grab:
- **Endpoint** — `https://your-resource.openai.azure.com`
- **API Key** — from the Keys & Endpoint section
- **Deployment Name** — the name of your model deployment

### 2. Browser with WebMCP support

**Microsoft Edge Canary** is recommended:

1. Download [Edge Canary](https://www.microsoft.com/en-us/edge/download/canary)
2. Navigate to `edge://flags`
3. Search for **Experimental Web Platform features**
4. Set it to **Enabled**
5. Restart the browser

## Installation

1. Clone this repo and navigate to `agent-extension/`:
   ```bash
   cd agent-extension
   npm install
   ```
   This installs the OpenAI SDK and bundles it for browser use.

2. Load the extension in your browser:
   - Go to `edge://extensions` (or `chrome://extensions`)
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `agent-extension/` folder

3. Click the extension icon in the toolbar to open the side panel.

4. Go to the **⚙️ Settings** tab and enter your Azure OpenAI credentials.

## Try it out

We recommend testing with the **Checkers Pizza** demo site:

👉 **https://victorhuangwq.github.io/pizza-order-demo**

1. Open the pizza site in a tab
2. Open the extension side panel (click the extension icon)
3. Go to the **🔧 Tools** tab — you should see tools like `select-order-type`
4. Switch to the **🤖 Agent** tab
5. Enter a goal, e.g.:
   > Order a large pepperoni pizza for delivery to 1 Microsoft Way, Redmond, WA 98052
6. Click **▶ Step** to execute one tool call at a time, or **▶▶ Run** for the full loop

## Controls

| Button | Behavior |
|--------|----------|
| **▶ Step** | Run one iteration (discover tools → LLM → execute one tool call → stop) |
| **▶▶ Run** | Run the full agent loop until the goal is achieved or max iterations reached |
| **⏹ Stop** | Abort the current run |
| **↺ Reset** | Clear the log and goal |
| **Auto-approve** | When ON, tool calls execute without confirmation. OFF by default for safety. |

## ⚠️ Caveats

- **Experimental preview** — This is a developer tool for testing the WebMCP API. Do not use in production.
- **Trusted sites only** — The extension runs on all pages. Only use it on sites you trust.
- **API costs** — Each agent step makes an Azure OpenAI API call. Monitor your usage.
- **No warranty** — The agent may take unexpected actions. Use the Step button and disable Auto-approve to review each action before execution.
