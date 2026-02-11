// webmcp-tools.js — WebMCP tool definitions per step
// Uses navigator.modelContext.provideContext() to swap tools at each step transition.

/**
 * PIZZA ORDERING FLOW - 7 STEPS
 *
 * Step 1: Order Type → select-order-type
 * Step 2: Location → set-delivery-address, confirm-location
 * Step 3: Menu → select-category + get-menu-categories
 * Step 4: Pizza → select-pizza + get-available-pizzas
 * Step 5: Customize → customize-pizza, add-to-cart + get-available-pizzas, get-available-toppings
 * Step 6: Cart → update-cart-item, add-side, proceed-to-checkout
 * Step 7: Checkout → set-checkout-info, place-order
 *
 * GETTER TOOLS (read-only, available at relevant steps):
 * - get-menu-categories: Available at Step 3
 * - get-available-pizzas: Available at Steps 4-5
 * - get-available-toppings: Available at Step 5
 */

// ============ GETTER TOOLS (READ-ONLY) ============

/**
 * Get available menu categories
 */
function createGetMenuCategoriesTool() {
  return {
    name: 'get-menu-categories',
    description: 'Get all available menu categories with descriptions. Use this to understand what\'s available to order.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute() {
      const categories = [
        { id: 'build-your-own', name: 'Build Your Own', description: 'Create a custom pizza from scratch. Start with cheese and add any toppings you like.', implemented: true, itemTypes: ['pizza'] },
        { id: 'specialty', name: 'Specialty Pizzas', description: 'Pre-designed signature pizzas with unique topping combinations. Our most popular selection.', implemented: true, itemTypes: ['pizza'] },
        { id: 'breads', name: 'Breads & Sides', description: 'Breadsticks, cheesy bread, garlic bread, and other sides. Add to your order in the cart.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'chicken', name: 'Chicken', description: 'Wings, boneless chicken bites, and chicken tenders.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'desserts', name: 'Desserts', description: 'Cinnamon bread twists, lava cakes, brownies, and other sweet treats.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'pastas', name: 'Pastas', description: 'Pasta dishes, pasta bowls, and other pasta options.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'sandwiches', name: 'Sandwiches', description: 'Oven-baked sandwiches with various fillings.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'salads', name: 'Salads', description: 'Garden salads, caesar salads, and other fresh salad options.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'drinks', name: 'Drinks', description: 'Sodas, juices, bottled water, and other beverages.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'loaded-tots', name: 'Loaded Tots', description: 'Tater tots with various toppings and sauces.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' },
        { id: 'extras', name: 'Extras', description: 'Dipping sauces, plates, utensils, and other extras.', implemented: false, itemTypes: ['side'], note: 'Add sides from the cart (Step 6)' }
      ];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ categories }, null, 2)
        }],
        orderState: getOrderStateSnapshot()
      };
    }
  };
}

/**
 * Get all available pizzas with descriptions and toppings
 */
function createGetAvailablePizzasTool() {
  return {
    name: 'get-available-pizzas',
    description: 'Get detailed information about all available pizzas including default toppings, descriptions, and pricing. Use this to understand pizza options.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute() {
      const pizzas = PIZZAS.map(pizza => ({
        id: pizza.id,
        name: pizza.name,
        description: pizza.description,
        category: pizza.category || 'specialty',
        defaultToppings: pizza.defaultToppings || [],
        pricing: {
          small: pizza.price || 9.99,
          medium: (pizza.price || 11.99),
          large: (pizza.price || 13.99)
        }
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ pizzas }, null, 2)
        }],
        orderState: getOrderStateSnapshot()
      };
    }
  };
}

/**
 * Get all available toppings with descriptions
 */
function createGetAvailableToppingsTool() {
  return {
    name: 'get-available-toppings',
    description: 'Get all available toppings with descriptions and categories. Use this when customizing a pizza.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute() {
      const toppings = TOPPINGS.map(topping => ({
        id: topping.id,
        name: topping.name || topping.id,
        description: `${topping.id} topping`,
        category: categorizeTopping(topping.id),
        price: 1.50
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ toppings }, null, 2)
        }],
        orderState: getOrderStateSnapshot()
      };
    }
  };
}

// Helper to categorize toppings
function categorizeTopping(toppingId) {
  const meatToppings = ['pepperoni', 'italian-sausage', 'beef', 'ham', 'bacon', 'chicken'];
  const veggieToppings = ['mushrooms', 'onions', 'green-peppers', 'black-olives', 'jalapenos', 'tomatoes'];

  if (meatToppings.includes(toppingId)) return 'meat';
  if (veggieToppings.includes(toppingId)) return 'veggie';
  return 'other';
}

// Helper to get available actions based on current step
function getAvailableActions() {
  const step = window.currentStep || 1;
  switch (step) {
    case 1: return ['select-order-type'];
    case 2: return ['set-delivery-address', 'confirm-location'];
    case 3: return ['select-category'];
    case 4: return ['select-pizza'];
    case 5: return ['customize-pizza', 'add-to-cart'];
    case 6: return ['update-cart-item', 'add-side', 'proceed-to-checkout'];
    case 7: return ['set-checkout-info', 'place-order'];
    default: return [];
  }
}

// Helper to get order state snapshot (for tool responses)
function getOrderStateSnapshot() {
  return {
    orderType: orderState.orderType,
    address: orderState.address,
    timing: orderState.timing,
    cart: orderState.cart
  };
}

// Helper to calculate cart totals (mirrors app.js logic)
function getCartTotals() {
  if (typeof window.calculateTotals === 'function') {
    return window.calculateTotals();
  }

  // Fallback if app.js hasn't loaded yet
  const subtotal = orderState.cart.reduce((sum, item) => sum + item.price, 0);
  const deliveryFee = orderState.orderType === 'delivery' ? 5.99 : 0;
  const tax = Math.round((subtotal + deliveryFee) * 0.08 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
  return { subtotal, deliveryFee, tax, total };
}

function registerToolsForStep(step) {
  if (!('modelContext' in navigator)) return;

  const tools = getToolsForStep(step);
  navigator.modelContext.provideContext({ tools });
}

function getToolsForStep(step) {
  const tools = [];

  switch (step) {
    case 1:
      tools.push(...getStep1Tools());
      break;
    case 2:
      tools.push(...getStep2Tools());
      break;
    case 3:
      tools.push(createGetMenuCategoriesTool());
      tools.push(...getStep3Tools());
      break;
    case 4:
      tools.push(createGetAvailablePizzasTool());
      tools.push(...getStep4Tools());
      break;
    case 5:
      tools.push(createGetAvailablePizzasTool());
      tools.push(createGetAvailableToppingsTool());
      tools.push(...getStep5Tools());
      break;
    case 6:
      tools.push(...getStep6Tools());
      break;
    case 7:
      tools.push(...getStep7Tools());
      break;
  }

  return tools;
}

// ============ STEP 1: ORDER TYPE ============
function getStep1Tools() {
  return [
    {
      name: 'select-order-type',
      description: `Select the order type for this pizza order.

Choose one:
• 'delivery': Pizza will be delivered to you (delivery fees apply)
• 'carryout': You'll pick up the order at the store

NEXT: Proceed to set delivery address or confirm location.`,
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['delivery', 'carryout'],
            description: 'The order type: "delivery" or "carryout".'
          }
        },
        required: ['type']
      },
      execute({ type }) {
        return selectOrderType(type);
      }
    }
  ];
}

// ============ STEP 2: LOCATION ============
function getStep2Tools() {
  return [
    {
      name: 'set-delivery-address',
      description: `Set the delivery address and find the nearest store.

INPUT: Complete address including street, city, state, ZIP.
Example: "1 Microsoft Way, Redmond, WA 98052"

The system will validate the address and locate the nearest store.

NEXT: Call 'confirm-location' to proceed to the menu.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'The full delivery address (e.g., "1 Microsoft Way, Building 9, Redmond, WA 98052")'
          }
        },
        required: ['address']
      },
      execute({ address }) {
        return setDeliveryAddress(address);
      }
    },
    {
      name: 'confirm-location',
      description: `Confirm the delivery location and order timing, then proceed to the menu.

PARAMETERS:
• timing (optional): 'now' (default - prepare immediately) or 'later' (schedule for ~1 hour from now)

PREREQUISITE: Must call 'set-delivery-address' first to set an address.

NEXT: Proceed to menu categories.`,
      inputSchema: {
        type: 'object',
        properties: {
          timing: {
            type: 'string',
            enum: ['now', 'later'],
            description: 'When to prepare the order. Default: "now".'
          }
        }
      },
      execute({ timing } = {}) {
        return confirmLocation(timing);
      }
    }
  ];
}

// ============ STEP 3: MENU CATEGORIES ============
function getStep3Tools() {
  return [
    {
      name: 'select-category',
      description: `Select a menu category to browse items.

For pizza orders: Choose 'build-your-own' or 'specialty'
For sides/drinks: These can be added later in the cart

Use 'get-menu-categories' tool to see detailed descriptions of all categories.

NEXT: Proceed to pizza selection.`,
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['build-your-own', 'specialty', 'breads', 'loaded-tots', 'chicken', 'desserts', 'pastas', 'sandwiches', 'salads', 'drinks', 'extras'],
            description: 'The menu category ID to browse.'
          }
        },
        required: ['category']
      },
      execute({ category }) {
        return selectCategory(category);
      }
    }
  ];
}

// ============ STEP 4: PIZZA SELECTION ============
function getStep4Tools() {
  return [
    {
      name: 'select-pizza',
      description: `Select a pizza to customize.

Use 'get-available-pizzas' tool to see all options with descriptions and default toppings.

Quick reference:
• Classics: pepperoni, cheese
• Specialty: meatzza, extravaganzza, veggie, bbq-chicken, spicy-bacon, hawaiian

NEXT: Proceed to customize pizza to modify size, crust, toppings, and quantity.`,
      inputSchema: {
        type: 'object',
        properties: {
          pizzaId: {
            type: 'string',
            description: 'The ID of the pizza to select (e.g., "pepperoni", "cheese", "meatzza").'
          }
        },
        required: ['pizzaId']
      },
      execute({ pizzaId }) {
        return selectPizza(pizzaId);
      }
    }
  ];
}

// ============ STEP 5: CUSTOMIZE PIZZA ============
function getStep5Tools() {
  return [
    {
      name: 'customize-pizza',
      description: `Customize the selected pizza. All parameters optional - omitted fields keep current values.

PARAMETERS:
• size: 'small' (10"), 'medium' (12"), 'large' (14")
• crust: 'hand-tossed' (default), 'handmade-pan' (+$1), 'thin', 'brooklyn'
• toppings: ARRAY of topping IDs - completely replaces current toppings
  Use 'get-available-toppings' for full list.
  Example: ['pepperoni', 'mushrooms'] sets exactly these 2 toppings
  To remove all: pass empty array []
• quantity: Number of this pizza to add (default: 1)

NEXT: Call 'add-to-cart' to add this pizza to your order.`,
      inputSchema: {
        type: 'object',
        properties: {
          size: {
            type: 'string',
            enum: ['small', 'medium', 'large'],
            description: 'Pizza size. small=10", medium=12" (default), large=14".'
          },
          crust: {
            type: 'string',
            enum: ['hand-tossed', 'handmade-pan', 'thin', 'brooklyn'],
            description: 'Crust type. Default: hand-tossed. Handmade pan is +$1.'
          },
          toppings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of topping IDs. This REPLACES all current toppings. Extra toppings beyond pizza defaults are +$1.50 each.'
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Number of this pizza to order. Default: 1.'
          }
        }
      },
      execute(params) {
        return customizePizza(params);
      }
    },
    {
      name: 'add-to-cart',
      description: `Add the customized pizza to the cart.

NEXT: Proceed to review cart, add sides, or checkout.`,
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute() {
        return addToCart();
      }
    }
  ];
}

// ============ STEP 6: CART ============
function getStep6Tools() {
  return [
    {
      name: 'update-cart-item',
      description: 'Update the quantity of a cart item, or remove it by setting quantity to 0.',
      inputSchema: {
        type: 'object',
        properties: {
          itemIndex: {
            type: 'integer',
            description: 'The 0-based index of the cart item to update (first item is 0, second is 1, etc.).'
          },
          quantity: {
            type: 'integer',
            minimum: 0,
            description: 'New quantity. Set to 0 to remove the item.'
          }
        },
        required: ['itemIndex']
      },
      execute(params) {
        return updateCartItem(params);
      }
    },
    {
      name: 'add-side',
      description: `Add a side item to the cart. Can be called multiple times to add different sides.

AVAILABLE SIDES:
• 'bread-bites': Seasoned bite-sized bread pieces ($6.99)
• 'cheesy-bread': Breadsticks topped with cheese ($7.99)
• 'wings-8pc': 8 chicken wings with sauce choice ($9.99)
• 'loaded-tots': Tater tots with cheese and toppings ($6.99)
• 'mac-cheese': Creamy macaroni and cheese ($7.99)`,
      inputSchema: {
        type: 'object',
        properties: {
          sideId: {
            type: 'string',
            description: 'The ID of the side item (e.g., "bread-bites", "cheesy-bread", "wings-8pc").'
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Number to add. Default: 1.'
          }
        },
        required: ['sideId']
      },
      execute({ sideId, quantity }) {
        return addSide(sideId, quantity || 1);
      }
    },
    {
      name: 'proceed-to-checkout',
      description: `Proceed from cart to checkout.

PREREQUISITE: Cart must have at least one item.

NEXT: You'll enter contact info and place the order.`,
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute() {
        return proceedToCheckout();
      }
    }
  ];
}

// ============ STEP 7: CHECKOUT ============
function getStep7Tools() {
  return [
    {
      name: 'set-checkout-info',
      description: `Set customer contact information and delivery preferences.

REQUIRED FIELDS:
• firstName: Customer's first name
• lastName: Customer's last name
• phone: 10-digit phone number
• email: Valid email for order confirmation

OPTIONAL FIELDS:
• leaveAtDoor: true/false - leave at door without contact
• deliveryInstructions: Special instructions (e.g., "Gate code: 1234")

NEXT: Call 'place-order' to finalize the order.`,
      inputSchema: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            description: 'Customer first name.'
          },
          lastName: {
            type: 'string',
            description: 'Customer last name.'
          },
          phone: {
            type: 'string',
            description: 'Phone number (10 digits).'
          },
          email: {
            type: 'string',
            description: 'Email address for order confirmation.'
          },
          leaveAtDoor: {
            type: 'boolean',
            description: 'Leave at door without contact (default: false).'
          },
          deliveryInstructions: {
            type: 'string',
            description: 'Special delivery instructions (optional).'
          }
        },
        required: ['firstName', 'lastName', 'phone', 'email']
      },
      execute(params) {
        return setCheckoutInfo(params);
      }
    },
    {
      name: 'place-order',
      description: `Place the order.

PREREQUISITE: Must call 'set-checkout-info' first to set contact information.

The system will ask for confirmation before finalizing. After confirmation:
- Order is submitted with confirmation number
- Transitions to confirmation page showing order details
- No more actions available (order complete)`,
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute() {
        return placeOrder();
      }
    }
  ];
}
