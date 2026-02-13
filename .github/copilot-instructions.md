# Copilot Instructions — Checkers Pizza WebMCP Demo

## Build & Run

```bash
npm install
npm start        # Express server on http://localhost:3000
npm run dev      # Same with --watch for auto-restart
```

No test suite, linter, or build step exists. The app is vanilla HTML/CSS/JS served statically by Express.

## Architecture

This is a **single-page 7-step pizza ordering wizard** that demonstrates the [WebMCP API](https://github.com/webmachinelearning/webmcp) — a browser API letting AI agents discover and call tools exposed by web pages.

### Core pattern: tools change with UI state

On every step transition, `webmcp-tools.js` calls `navigator.modelContext.provideContext({ tools })` to **replace** all registered tools with only those relevant to the current step. This is the central design pattern of the app.

### Shared execution between UI and agent

UI click handlers and WebMCP tool `execute` callbacks call the **same functions** in `app.js`. For example, both the "DELIVERY" button click and the `select-order-type` tool call `selectOrderType("delivery")`. Never duplicate logic — always route through the shared helpers.

### Key files

- **`js/app.js`** — Wizard controller: `orderState` object, step navigation (`goToStep`), all business logic functions (e.g., `selectOrderType`, `setDeliveryAddress`, `addToCart`), DOM rendering per step, and price calculation.
- **`js/webmcp-tools.js`** — Tool definitions grouped by step (`getStep1Tools()` through `getStep7Tools()`), plus read-only getter tools. Each tool's `execute` delegates to the corresponding `app.js` function.
- **`js/menu-data.js`** — All mock data: `STORE`, `CATEGORIES`, `PIZZAS`, `SIZES`, `CRUSTS`, `TOPPINGS`, `SIDES`, pricing constants (`DELIVERY_FEE`, `TAX_RATE`).
- **`js/webmcp-shim.js`** — Development polyfill that provides `navigator.modelContext` and a console API (`mcp.help()`, `mcp.call()`) when the real WebMCP API isn't available.
- **`index.html`** — All 7 steps as `<section>` elements, shown/hidden by `goToStep()`.
- **`extension/`** — Separate Chrome extension for inspecting WebMCP tools (has its own `package.json` and `manifest.json`). Not part of the main app.

### Step → Tool mapping

| Step | Tools |
|------|-------|
| 1 | `select-order-type` |
| 2 | `set-delivery-address`, `confirm-location` |
| 3 | `get-menu-categories`, `select-category` |
| 4 | `get-available-pizzas`, `select-pizza` |
| 5 | `get-available-pizzas`, `get-available-toppings`, `customize-pizza`, `add-to-cart` |
| 6 | `update-cart-item`, `add-side`, `proceed-to-checkout` |
| 7 | `set-checkout-info`, `place-order` |

## Conventions

- **Tool responses** always return `{ content: [{ type: "text", text: "..." }] }` with a confirmation of what was done, current state summary, and a hint for next action.
- **Validation errors** are returned as content text (not exceptions): `"Error: Please enter a delivery address."`.
- **`place-order`** uses `agent.requestUserInteraction()` to get explicit user confirmation via a browser `confirm()` dialog before completing.
- **Feature detection**: the site works as a normal ordering site without WebMCP. Tools are only registered when `"modelContext" in navigator` is true.
- **Pricing logic**: base price ± size modifier ($-3 small, $0 medium, $+4 large) + crust modifier (handmade-pan +$1) + extra toppings beyond defaults at $1.50 each. Delivery fee $5.99, tax 9.5%.

## Deployment

Auto-deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. The entire repo root is deployed as-is (static files).
