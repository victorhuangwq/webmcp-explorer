# WebMCP Explorer - Edge/Chrome Extension

> ⚠️ **Experimental Preview** - This extension is for developer testing only. Not intended for production use. Only use on sites you trust.

## What is this?

A browser extension that lets an AI agent interact with web pages through the [WebMCP API](https://github.com/webmachinelearning/webmcp). The agent discovers tools exposed by a page and calls them autonomously to complete a user-defined goal.

## Prerequisites

### 1. Azure OpenAI (AI Foundry)

You need an Azure OpenAI resource with a deployed model. Currently tested with `gpt-5.2-chat`.
 
From [Azure AI Foundry](https://ai.azure.com/), grab:
- **Endpoint** - from Endpoint section, called "Target URI" (e.g. `https://your-resource.azure.com/openai/...`)
- **API Key** - from the Endpoint section, called "Key"
- **Deployment Name** - from Deployment info section, called "name" (e.g., `gpt-5.2-chat`)

<details>
<summary>New to Azure? Click here for step-by-step setup instructions.</summary>

**1. Create an Azure Account**

If you don't have an Azure subscription:
- **Microsoft Employees**: Follow the [internal instructions](https://microsoft.sharepoint.com/teams/DataAISpecialistCommunity/Shared%20Documents/Forms/AllItems.aspx?id=%2Fteams%2FDataAISpecialistCommunity%2FShared%20Documents%2FFY23%20LP%20Content%2FHow%20to%20Activate%20%24150%20Azure%20Visual%20Studio%20Subscription%20Benefit%20%2D%20May%202020%2Epdf&parent=%2Fteams%2FDataAISpecialistCommunity%2FShared%20Documents%2FFY23%20LP%20Content) to activate your benefit.
- **Others**: The [Azure free account](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account) includes $200 credit for 30 days (as of Feb 2026), sufficient for testing.

**2. Deploy the Model**

1. Go to [Azure AI Foundry](https://ai.azure.com/).
2. Click **"Create an agent"**.
3. Name your project (creation may take a moment).
4. When the **"Deploy model"** step appears, click **"Go to model catalog"** to see more options.
5. Select `gpt-5.2-chat` from the catalog.
6. Click **"Use this model"**.
7. Keep the default settings and click **"Create resource and deploy"**.
8. Once deployed, copy the **Endpoint**, **API Key**, and **Deployment Name** from the resource page.

</details>

### 2. Browser with WebMCP support

**Microsoft Edge Canary** is recommended:

1. Download [Edge Canary](https://www.microsoft.com/en-us/edge/download/canary)
2. Navigate to `edge://flags`
3. Search for **Experimental Web Platform features**
4. Set it to **Enabled**
5. Restart the browser

## Installation

1. Clone this repository into a local directory.

1. Load the extension in your browser:
   - Go to `edge://extensions` (or `chrome://extensions`)
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `agent-extension/` folder in this repository

2. Click the extension icon in the toolbar to open the side panel.

3. Go to the **⚙️ Settings** tab and enter your Azure OpenAI credentials.

> **Note:** The OpenAI SDK is pre-bundled as `openai-bundle.js`. If you need to regenerate it (e.g., after upgrading the SDK version), run `npm install` in the `agent-extension/` directory.

## Try it out

We recommend testing with the **Checkers Pizza** demo site:

👉 **https://victorhuangwq.github.io/pizza-order-demo**

1. Open the pizza site in a tab
2. Open the extension side panel (click the extension icon)
3. Go to the **🔧 Tools** tab - you should see tools like `select-order-type`
4. Switch to the **🤖 Agent** tab
5. Enter a goal, e.g.:
   > Order a large pepperoni pizza for delivery to 1 Microsoft Way, Redmond, WA 98052
6. Click  **▶▶ Run** for the full loop, or **▶ Step** to execute one tool call at a time

## Controls

| Button | Behavior |
|--------|----------|
| **▶ Step** | Run one iteration (discover tools > LLM > execute one tool call > stop) |
| **▶▶ Run** | Run the full agent loop until the goal is achieved or max iterations reached |
| **⏹ Stop** | Abort the current run |
| **↺ Reset** | Clear the log and goal |
| **Auto-approve** | When ON, tool calls execute without confirmation. ON by default. |

## ⚠️ Caveats

- **Experimental preview** - This is a developer tool for testing the WebMCP API. Do not use in production.
- **Trusted sites only** - The extension runs on all pages. Only use it on sites you trust.
- **API costs** - Each agent step makes an Azure OpenAI API call. When using **▶▶ Run**, monitor the agent closely as it can enter a loop and exhaust your token credits. Prefer **▶ Step** for controlled execution.
- **No guarantees** - The agent may take unexpected actions. Use the Step button and disable Auto-approve to review each action before execution.
