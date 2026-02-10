# Checkers Pizza — WebMCP Demo

A Domino's-style pizza ordering site that implements the [WebMCP](https://nickreynolds.github.io/WebMCP/) browser API. Built as a demo for browser agents that can discover and call tools exposed by web pages.

## 🚀 Live Demo

**[View Live Site on GitHub Pages](https://github.com/your-username/checkers-pizza-webmcp-demo)** (update this URL after pushing to GitHub)

## Quick Start

### Option 1: Using Node.js (with auto-reload)

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

### Option 2: Using http-server (no dependencies needed)

```bash
npx http-server -p 3000
```

Then open **http://localhost:3000** in your browser.

### Option 3: Using Python

```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

Then open **http://localhost:3000** in your browser.

## How It Works

The site is a 7-step pizza ordering wizard. At each step, it calls `navigator.modelContext.provideContext({ tools })` to register a different set of tools that match what the user can do on the current page. When a browser agent visits the site, it sees exactly the tools relevant to the current step.

| Step | Page | Tools |
|------|------|-------|
| 1 | Home / Order Type | `select-order-type` |
| 2 | Delivery Address | `set-delivery-address`, `confirm-location` |
| 3 | Menu Categories | `select-category` |
| 4 | Pizza Selection | `select-pizza` |
| 5 | Customize Pizza | `customize-pizza`, `add-to-cart` |
| 6 | Cart | `update-cart-item`, `add-side`, `proceed-to-checkout` |
| 7 | Checkout | `set-checkout-info`, `place-order` |

## Demo: Console Walkthrough (Polyfill)

If your browser doesn't have a real `navigator.modelContext` implementation, the site automatically loads a polyfill shim. This creates a `navigator.modelContext` object (also available as `window.mcp`) that lets you invoke tools from the DevTools console.

### 1. See what you can do

Open the browser console and type:

```js
mcp.help()                        // copy-paste-ready commands for the current step
mcp.help('select-order-type')     // detailed params for one tool
mcp.tools                         // raw tool schema array
```

`mcp.help()` prints a ready-to-paste `await mcp.call(...)` line for every tool in the current step, pre-filled with golden-path example values. Just copy, paste, and run.

### 2. Golden path: order a large pepperoni pizza for delivery

Copy-paste these one at a time (or run `mcp.help()` at each step to get the snippets):

```js
// Step 1 → choose delivery
await mcp.call('select-order-type', { type: 'delivery' })

// Step 2 → enter address and confirm
await mcp.call('set-delivery-address', { address: '1 Microsoft Way, Redmond, WA 98052' })
await mcp.call('confirm-location', { timing: 'now' })

// Step 3 → pick a category
await mcp.call('select-category', { category: 'specialty' })

// Step 4 → pick a pizza
await mcp.call('select-pizza', { pizzaId: 'pepperoni' })

// Step 5 → customize and add to cart
await mcp.call('customize-pizza', { size: 'large', crust: 'hand-tossed' })
await mcp.call('add-to-cart', {})

// Step 6 → optionally add a side, then checkout
await mcp.call('add-side', { sideId: 'bread-bites' })
await mcp.call('proceed-to-checkout', {})

// Step 7 → fill contact info and place the order
await mcp.call('set-checkout-info', { firstName: 'John', lastName: 'Doe', phone: '4255551234', email: 'john@example.com' })
await mcp.call('place-order', {})
```

Each call updates the UI in real time — you'll see the page navigate, forms fill, and the cart update as you go.

### Polyfill API reference

| Method | Description |
|--------|-------------|
| `mcp.help()` | Print copy-paste-ready `mcp.call(...)` snippets for every tool in the current step |
| `mcp.help('tool-name')` | Show detailed params, types, and enums for a single tool |
| `mcp.tools` | Get array of tool schemas (name, description, inputSchema) |
| `mcp.call(toolName, params)` | Execute a tool and return its result |
| `navigator.modelContext.provideContext({ tools })` | (Called internally) Replace registered tools |

## Demo: Real Browser Agent (native modelContext)

If your browser natively supports `navigator.modelContext` (e.g., an Edge build with WebMCP), the polyfill is skipped entirely. The browser agent will:

1. Navigate to `http://localhost:3000`
2. Discover tools via `navigator.modelContext` — the site registers them automatically
3. Read tool descriptions and schemas to understand what's available
4. Call `tool.execute(params, agent)` to perform actions
5. Observe the returned text + order state to decide next steps
6. See new tools appear after each step transition (via `provideContext`)

The agent can follow the same golden path above. The `place-order` tool uses `agent.requestUserInteraction()` to prompt the user for confirmation before finalizing.

## Tool Response Format

Every tool returns:

```json
{
  "content": [{ "type": "text", "text": "Human-readable result..." }],
  "orderState": { ... }
}
```

- `content` — follows the MCP tool response format
- `orderState` — snapshot of the current order (type, address, cart, totals, etc.)

## Deployment

### Automatic Deployment via GitHub Actions

This site automatically deploys to GitHub Pages via GitHub Actions whenever you push to the `main` branch. No configuration needed!

**GitHub Actions Status:**
- View deployment logs: Go to [Actions tab](https://github.com/USERNAME/REPO/actions) and check the "Deploy to GitHub Pages" workflow
- Deployments typically complete in 1-2 minutes
- Each push to `main` triggers an automatic deployment

**Your site will be available at:**
```
https://your-username.github.io/checkers-pizza-webmcp-demo/
```

**Manual deployment trigger (if needed):**
1. Go to [Actions tab](https://github.com/USERNAME/REPO/actions)
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button
4. Wait for completion (~1-2 minutes)

## Project Structure

```
├── index.html             # Single-page wizard (all 8 steps)
├── css/
│   └── style.css          # Domino's-inspired styling
├── js/
│   ├── menu-data.js       # Mock catalog (pizzas, sides, toppings, store)
│   ├── app.js             # Wizard controller, order state, DOM rendering
│   ├── webmcp-shim.js     # modelContext polyfill for console testing
│   └── webmcp-tools.js    # Tool definitions per step, provideContext calls
├── server.js              # (Optional) Express dev server for local development
├── package.json           # (Optional) Development dependencies
├── .nojekyll              # Disables Jekyll processing on GitHub Pages
└── README.md
```

## Available Tools Reference

### `select-order-type`
Choose delivery or carryout.
```json
{ "type": "delivery" }
```

### `set-delivery-address`
Enter a delivery address to find the nearest store.
```json
{ "address": "1 Microsoft Way, Redmond, WA 98052" }
```

### `confirm-location`
Confirm the store and proceed to the menu.
```json
{ "timing": "now" }
```

### `select-category`
Browse a menu category. Options: `build-your-own`, `specialty`, `breads`, `loaded-tots`, `chicken`, `desserts`, `pastas`, `sandwiches`, `salads`, `drinks`, `extras`.
```json
{ "category": "specialty" }
```

### `select-pizza`
Pick a pizza to customize. Options: `pepperoni`, `cheese`, `meatzza`, `extravaganzza`, `veggie`, `bbq-chicken`, `spicy-bacon`, `hawaiian`.
```json
{ "pizzaId": "pepperoni" }
```

### `customize-pizza`
Set size, crust, toppings, quantity. All optional — omitted fields keep defaults.
```json
{ "size": "large", "crust": "hand-tossed", "toppings": ["pepperoni", "mushrooms"], "quantity": 1 }
```

### `add-to-cart`
Add the current pizza to the cart.
```json
{}
```

### `update-cart-item`
Update quantity of a cart item (0 to remove).
```json
{ "itemIndex": 0, "quantity": 2 }
```

### `add-side`
Add a side. Options: `bread-bites`, `cheesy-bread`, `wings-8pc`, `loaded-tots`, `mac-cheese`.
```json
{ "sideId": "bread-bites", "quantity": 1 }
```

### `proceed-to-checkout`
Move from cart to checkout. Cart must not be empty.
```json
{}
```

### `set-checkout-info`
Fill in contact and delivery details.
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "4255551234",
  "email": "john@example.com",
  "leaveAtDoor": true,
  "deliveryInstructions": "Ring the bell"
}
```

### `place-order`
Place the order. Prompts user for confirmation via `agent.requestUserInteraction()`.
```json
{}
```
