# Checkers Pizza — WebMCP Demo Site Spec

## Overview

A high-fidelity Domino's-style pizza ordering website called **Checkers Pizza**, purpose-built to demonstrate the [WebMCP API](https://github.com/webmachinelearning/webmcp/blob/main/docs/proposal.md) for browser agents. A browser agent navigates a realistic 7-step pizza ordering flow by calling WebMCP tools that dynamically change at each step — showcasing the key differentiator of WebMCP: **tools are registered in-page and evolve with UI state**.

**Audience:** Edge Leadership Team demo
**Presenter:** Teammate with working browser agent
**Demo date:** Wednesday, February 11, 2026
**Tech stack:** Express.js serving vanilla HTML/CSS/JS
**Runs on:** localhost:3000

---

## Golden Path — Demo Script

The agent completes this exact order:

> "Order a large pepperoni pizza for delivery to Microsoft Building 9, Redmond"

| # | Agent Action | Tool Called | UI Result |
|---|-------------|-------------|-----------|
| 1 | Picks delivery | `select-order-type({ type: "delivery" })` | Location step appears |
| 2 | Enters address | `set-delivery-address({ address: "1 Microsoft Way, Building 9, Redmond, WA 98052" })` | Store match shown with delivery estimate |
| 3 | Confirms location | `confirm-location({ timing: "now" })` | Menu categories grid appears |
| 4 | Picks "Build Your Own" | `select-category({ category: "build-your-own" })` | Pizza list appears |
| 5 | Picks pepperoni | `select-pizza({ pizzaId: "pepperoni" })` | Customization page appears |
| 6 | Sets large + hand tossed | `customize-pizza({ size: "large", crust: "hand-tossed" })` | Selections updated on page |
| 7 | Adds to cart | `add-to-cart()` | Cart page appears |
| 8 | Proceeds to checkout | `proceed-to-checkout()` | Checkout page appears |
| 9 | Fills contact + instructions | `set-checkout-info({ firstName: "John", lastName: "Smith", phone: "425-555-0100", email: "john@example.com", leaveAtDoor: true })` | Form fields populated |
| 10 | Places order | `place-order()` | Confirmation dialog via `requestUserInteraction()` → success screen |

---

## Order Flow — 7 Steps

### Step 1: Order Type

**What the user sees:**
- "START YOUR ORDER" headline
- Two large pill-shaped buttons: **DELIVERY** | **CARRYOUT**
- Checkers Pizza header bar with logo, nav links (HOME, MENU, DEALS, TRACKER), location picker, SIGN IN, cart icon

**WebMCP tools registered:**

```
select-order-type
  description: "Select delivery or carryout for this order"
  inputSchema:
    type: "delivery" | "carryout"  (required)
  returns:
    content: [{ type: "text", text: "Order type set to delivery. Please provide a delivery address." }]
    orderState: { orderType: "delivery" }
```

**Validation:** Must select one option before proceeding.

---

### Step 2: Location

**What the user sees:**
- Address text input field
- After address entered: confirmed store card showing:
  - Store address in large blue text (e.g., "10701 MAIN ST")
  - City, state, zip
  - Delivery estimate ("Delivery in 20-35 minutes")
  - Store phone number
  - Order Timing toggle: **Now** / Later
- "CONFIRM LOCATION" red button

**WebMCP tools registered:**

```
set-delivery-address
  description: "Set the delivery address and find the nearest store"
  inputSchema:
    address: string (required) — "The full delivery address"
  returns:
    content: [{ type: "text", text: "Found nearest store: Checkers Pizza - Redmond..." }]
    orderState: { orderType, address, store: { name, address, phone, deliveryEstimate } }

confirm-location
  description: "Confirm the delivery location and proceed to the menu"
  inputSchema:
    timing: "now" | "later"  (optional, default: "now")
  returns:
    content: [{ type: "text", text: "Location confirmed. Showing menu categories." }]
    orderState: { orderType, address, store, timing }
```

**Validation:** Address field required. `confirm-location` fails if no address set.

**Mock data — 1 store:**
- Name: "Checkers Pizza — Redmond"
- Address: "16011 NE 36th Way, Redmond, WA 98052"
- Phone: "(425) 555-0199"
- Hours: Su-Th 10:00am-12:00am, Fr-Sa 10:00am-1:00am
- Delivery estimate: "20-35 minutes"

---

### Step 3: Menu Categories

**What the user sees:**
- Header bar now shows: "Delivery · 20-35 mins · [address]"
- "LOOKING FOR DEALS NEAR YOU?" banner with "SEE ALL DEALS" button (non-functional)
- Grid of category cards (2 rows), each with image + label:
  - Row 1: Build Your Own, Specialty Pizzas, Breads, Loaded Tots, Chicken, Desserts
  - Row 2: Oven-Baked Pastas, Oven-Baked Sandwiches, Salads, Drinks, Extras
- Some cards have "NEW!" badges

**WebMCP tools registered:**

```
select-category
  description: "Select a menu category to browse items"
  inputSchema:
    category: enum (required) — one of:
      "build-your-own", "specialty", "breads", "loaded-tots",
      "chicken", "desserts", "pastas", "sandwiches", "salads", "drinks", "extras"
  returns:
    content: [{ type: "text", text: "Showing Build Your Own pizzas. 8 items available." }]
    orderState: { ...previous, currentCategory: "build-your-own" }
    availableItems: [{ id, name, description, price, tags }]
```

**Note:** For golden path, only "build-your-own" and "specialty" need full item lists. Other categories can show a "Coming soon" or minimal items.

---

### Step 4: Pizza Selection

**What the user sees:**
- Category title as headline (e.g., "BUILD YOUR OWN" or "SPECIALTY PIZZAS")
- Grid of pizza cards (4 across), each with:
  - Large pizza image
  - Optional badge ("NEW!" / "TRENDING")
  - Pizza name
  - Short description
  - Cart quick-add icon button (bottom-right of image)

**WebMCP tools registered:**

```
select-pizza
  description: "Select a pizza to customize"
  inputSchema:
    pizzaId: string (required) — "The ID of the pizza to customize"
  returns:
    content: [{ type: "text", text: "Selected Pepperoni pizza. Ready to customize." }]
    orderState: { ...previous, selectedPizza: { id, name, description, basePrice } }
    customizationOptions: { sizes: [...], crusts: [...], toppings: [...] }
```

**Mock data — Pizzas:**

| ID | Name | Description | Base Price | Tags |
|----|------|-------------|------------|------|
| pepperoni | Pepperoni | Classic pepperoni with 100% real mozzarella on our signature sauce | $12.99 | TRENDING |
| cheese | Cheese | A timeless classic — 100% real mozzarella on our signature sauce | $10.99 | — |
| meatzza | MeatZZa | Pepperoni, ham, Italian sausage and beef, sandwiched between two layers of mozzarella | $15.99 | — |
| extravaganzza | ExtravaganZZa | Pepperoni, ham, Italian sausage, beef, onions, green peppers, mushrooms, black olives, mozzarella | $16.99 | — |
| veggie | Veggie Supreme | Mushrooms, green peppers, onions, black olives, tomatoes, mozzarella on our signature sauce | $14.99 | NEW! |
| bbq-chicken | BBQ Chicken | Grilled chicken, BBQ sauce, onions, mozzarella and provolone | $15.99 | — |
| spicy-bacon | Spicy Chicken Bacon Ranch | Grilled chicken breast, creamy ranch, smoked bacon, jalapeños, provolone and mozzarella | $16.99 | NEW! |
| hawaiian | Hawaiian | Ham, pineapple, mozzarella, and our signature sauce | $13.99 | — |

---

### Step 5: Customize Pizza

**What the user sees:**
- Pizza name as headline + hero image + description at top
- "ADD TO CART" button (prominent, top-right and sticky)
- **Quantity** — +/- buttons, current count
- **Crusts** — Card-style radio selectors with crust images (Hand Tossed selected by default)
- **Size** — Radio/button group: Small 10" / Medium 12" / Large 14"
- **Toppings** — Grid of toggleable topping tiles (pre-selected based on pizza type)

**WebMCP tools registered:**

```
customize-pizza
  description: "Set the size, crust, and toppings for the selected pizza"
  inputSchema:
    size: enum — "small" | "medium" | "large"  (optional, default: "medium")
    crust: enum — "hand-tossed" | "handmade-pan" | "thin" | "brooklyn"  (optional, default: "hand-tossed")
    toppings: array of strings  (optional — keeps current toppings if omitted)
    quantity: integer, min 1  (optional, default: 1)
  returns:
    content: [{ type: "text", text: "Pizza customized: Large Hand Tossed Pepperoni. Price: $16.99" }]
    orderState: { ...previous, currentPizza: { name, size, crust, toppings, quantity, price } }

add-to-cart
  description: "Add the customized pizza to the cart"
  inputSchema: (none)
  returns:
    content: [{ type: "text", text: "Added Large Hand Tossed Pepperoni to cart. Cart total: $16.99 (1 item)" }]
    orderState: { ...previous, cart: { items: [...], subtotal } }
```

**Mock data — Options:**

Crusts: Hand Tossed (default), Handmade Pan (+$1), Crunchy Thin, Brooklyn Style
Sizes: Small 10" (-$3), Medium 12" (base), Large 14" (+$4)
Toppings: Pepperoni, Italian Sausage, Beef, Ham, Bacon, Mushrooms, Onions, Green Peppers, Black Olives, Jalapeños, Pineapple, Tomatoes (+$1.50 each extra topping beyond pizza's default set)

---

### Step 6: Cart

**What the user sees:**
- "Cart" header with "< Back to Menu" link and X close button
- **Subtotal** at top ("taxes/fees not included") with dollar amount
- **STEP 1: CONFIRM YOUR SELECTIONS**
  - Item card: pizza thumbnail, full description (e.g., "Large (14") Hand Tossed Pepperoni"), calorie info, price, quantity +/- buttons, Edit / Remove links
- **STEP 2: CHOOSE YOUR SIDES** (upsell)
  - Grid of suggested side item cards with image, name, cart-add icon

**WebMCP tools registered:**

```
update-cart-item
  description: "Update quantity or remove an item in the cart"
  inputSchema:
    itemIndex: integer (required) — "The 0-based index of the cart item"
    quantity: integer (optional) — "New quantity. Set to 0 to remove."
  returns:
    content: [{ type: "text", text: "Updated cart. 1 item, subtotal: $16.99" }]
    orderState: { ...previous, cart: { items, subtotal } }

add-side
  description: "Add a side item to the cart"
  inputSchema:
    sideId: string (required) — "The ID of the side item"
    quantity: integer (optional, default: 1)
  returns:
    content: [{ type: "text", text: "Added Parmesan Bread Bites to cart. Subtotal: $23.98" }]
    orderState: { ...previous, cart: { items, subtotal } }

proceed-to-checkout
  description: "Proceed from cart to checkout"
  inputSchema: (none)
  returns:
    content: [{ type: "text", text: "Proceeding to checkout. Order total: $26.16 (includes $5.99 delivery, $3.18 tax)" }]
    orderState: { ...previous, checkout: { subtotal, deliveryFee, tax, total } }
```

**Mock data — Sides:**

| ID | Name | Price |
|----|------|-------|
| bread-bites | Parmesan Bread Bites | $6.99 |
| cheesy-bread | Stuffed Cheesy Bread | $7.99 |
| wings-8pc | 8pc Chicken Wings | $9.99 |
| loaded-tots | Loaded Tots | $6.99 |
| mac-cheese | 5-Cheese Mac & Cheese | $7.99 |

---

### Step 7: Checkout

**What the user sees:**
- "< Return to cart" back link, Checkers Pizza logo center, SIGN IN right
- "CHECKOUT" headline
- **Delivery Instructions** section:
  - "Leave it at the door" checkbox
  - "Additional Delivery Instructions (Optional)" textarea
- **Contact Information** section:
  - First Name, Last Name, Phone, Email fields
  - All required except delivery instructions
- **YOUR ORDER** sidebar (right side):
  - Item count (expandable to show details)
  - Food And Beverage: $XX.XX
  - Delivery Fee: $5.99
  - Tax: (calculated ~9.5%)
  - **Total: $XX.XX**
  - "PLACE ORDER - $XX.XX" large red button

**WebMCP tools registered:**

```
set-checkout-info
  description: "Set contact information and delivery instructions for the order"
  inputSchema:
    firstName: string (required)
    lastName: string (required)
    phone: string (required) — "10-digit phone number"
    email: string (required) — "Email address for order confirmation"
    leaveAtDoor: boolean (optional, default: false)
    deliveryInstructions: string (optional)
  returns:
    content: [{ type: "text", text: "Checkout info saved. Ready to place order. Total: $26.16" }]
    orderState: { ...previous, contact: { firstName, lastName, phone, email }, delivery: { leaveAtDoor, instructions } }

place-order
  description: "Place the order. Will ask for user confirmation before processing."
  inputSchema: (none)
  returns: (after user confirms via requestUserInteraction)
    content: [{ type: "text", text: "Order placed! Order #CP-28491. Estimated delivery: 20-35 minutes." }]
    orderState: { ...previous, confirmation: { orderNumber, estimatedDelivery } }
```

**`place-order` implementation detail:**

```js
async execute(params, agent) {
  const confirmed = await agent.requestUserInteraction(async () => {
    return new Promise((resolve) => {
      const ok = confirm(
        `Place order for $${total}?\nDelivery to: ${address}\n\nClick OK to confirm.`
      );
      resolve(ok);
    });
  });
  if (!confirmed) throw new Error("Order cancelled by user.");
  // Show confirmation screen
  return {
    content: [{ type: "text", text: `Order placed! Order #CP-${orderNumber}...` }],
  };
}
```

**Validation:** All contact fields required. Phone must be 10 digits. Email must contain @.

---

### Step 8: Order Confirmation (terminal state)

**What the user sees:**
- Large checkmark or success icon
- "Order Confirmed!" headline
- Order number: #CP-XXXXX
- Estimated delivery: 20-35 minutes
- Order summary (items, totals)
- "Track Your Order" button (non-functional)
- "Start New Order" button → resets to Step 1

**WebMCP tools registered:** None. Demo is complete.

---

## WebMCP Integration Design

### Core Pattern

On every step transition, the site calls:

```js
navigator.modelContext.provideContext({ tools: getToolsForStep(currentStep) });
```

This **clears all previous tools** and registers the new step's tools. This is the key WebMCP pattern: tools change with UI state.

### Feature Detection

```js
if ("modelContext" in navigator) {
  // Register tools — browser supports WebMCP (or agent extension provides it)
}
```

No shim or agent simulator panel. The site works as a normal pizza ordering site without WebMCP; it gains agent capabilities when WebMCP is available.

### Tool Response Format

All tools return:

```js
{
  content: [
    {
      type: "text",
      text: "Human-readable confirmation message with context for next action",
    },
  ],
}
```

The text response always includes:

1. What was done (confirmation)
2. Current state summary (so the agent knows what's set)
3. What to do next (guiding hint)

### Shared Code Pattern

UI event handlers and tool `execute` callbacks call the **same helper functions**:

```
User clicks "DELIVERY" button  →  selectOrderType("delivery")  →  updates state + UI
Agent calls select-order-type   →  selectOrderType("delivery")  →  updates state + UI
```

This ensures perfect consistency between human and agent interactions.

---

## File Structure

```
formfill-demo/
├── server.js                    Express app, serves /public on :3000
├── package.json                 { express }
├── SPEC.md                      This document
└── public/
    ├── index.html               Single HTML file, all steps as <section> elements
    ├── css/
    │   └── style.css            High-fidelity Domino's-inspired styling
    ├── js/
    │   ├── app.js               Wizard controller, orderState, DOM rendering
    │   ├── menu-data.js         Mock catalog (pizzas, sides, stores, options)
    │   └── webmcp-tools.js      Tool definitions + provideContext() per step
    └── images/
        ├── pizzas/              Stock pizza photos (pepperoni.jpg, cheese.jpg, etc.)
        ├── crusts/              Crust type images
        ├── sides/               Side item images
        └── categories/          Category card images
```

---

## Visual Design

**Color palette (Domino's-inspired):**

- Header bar: `#0078AE` (blue)
- CTA buttons: `#C8102E` (red)
- Background: `#F5F0EB` (warm cream)
- Section backgrounds: `#FFFFFF` (white cards)
- Headings: `#2B2B2B` (dark brown/black, uppercase, bold serif feel)
- Accent text: `#006491` (blue links)

**Typography:**

- Headings: Bold, uppercase, slightly condensed (system font stack or a web-safe similar to Domino's)
- Body: Clean sans-serif

**Layout patterns:**

- Fixed top nav bar (blue) with: HOME | MENU | DEALS | TRACKER | [logo center] | location | SIGN IN | cart
- Full-width cream content area
- Card-based grids (4-column on desktop for pizza items, 6-column for category icons)
- Sticky "ADD TO CART" buttons
- Right sidebar on checkout for order summary

**Brand:**

- Name: "Checkers Pizza"
- Logo: Text-based with a CSS checkered pattern accent or simple pizza slice icon
- No Domino's trademarks

---

## Pricing Logic

- Pizza base price varies by type (see table above)
- Size modifiers: Small -$3, Medium base, Large +$4
- Crust: Handmade Pan +$1, others free
- Extra toppings (beyond pizza's default): +$1.50 each
- Sides: fixed prices (see table)
- Delivery Fee: $5.99
- Tax: 9.5% of food subtotal
- Total = subtotal + delivery fee + tax

---

## Validation Rules (Light)

| Field | Rule | Error Message |
|-------|------|---------------|
| Order type | Must select one | "Please select delivery or carryout" |
| Address | Required, non-empty | "Please enter a delivery address" |
| First name | Required | "First name is required" |
| Last name | Required | "Last name is required" |
| Phone | Required, 10+ digits | "Please enter a valid phone number" |
| Email | Required, contains @ | "Please enter a valid email address" |
| Cart | At least 1 item | "Your cart is empty" |

Tool calls return error responses (not exceptions) for validation failures:

```js
{
  content: [
    {
      type: "text",
      text: "Error: Please enter a delivery address before confirming location.",
    },
  ],
}
```

---

## Images

Source ~15 stock photos from Unsplash/Pexels (free commercial use):

- 8 pizza hero images (one per pizza type)
- 4 crust close-up images
- 5 side item images
- 6 category card images (can use pizza photos + generic food)
- Store as local files in `/public/images/` for offline reliability

---

## What We Are NOT Building

- No user authentication / sign in
- No real payment processing or credit card fields
- No tracker page
- No deals/coupons functionality
- No "Later" scheduling (timing toggle visible but only "Now" works)
- No mobile-responsive layout (desktop demo only)
- No carryout sub-options (Carside, In-Store, Pickup Window) — just carryout as a single option
- No WebMCP shim or agent simulator panel — real agent will be used
