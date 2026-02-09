// webmcp-tools.js — WebMCP tool definitions per step
// Uses navigator.modelContext.provideContext() to swap tools at each step transition.

function registerToolsForStep(step) {
  if (!('modelContext' in navigator)) return;

  const tools = getToolsForStep(step);
  navigator.modelContext.provideContext({ tools });
}

function getToolsForStep(step) {
  switch (step) {
    case 1: return getStep1Tools();
    case 2: return getStep2Tools();
    case 3: return getStep3Tools();
    case 4: return getStep4Tools();
    case 5: return getStep5Tools();
    case 6: return getStep6Tools();
    case 7: return getStep7Tools();
    default: return []; // Step 8 (confirmation) — no tools
  }
}

// ============ STEP 1: ORDER TYPE ============
function getStep1Tools() {
  return [
    {
      name: 'select-order-type',
      description: 'Select delivery or carryout for this order. This is the first step — choose how the customer wants to receive their pizza.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['delivery', 'carryout'],
            description: 'The order type: "delivery" to have it delivered, or "carryout" to pick it up.'
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
      description: 'Set the delivery address and find the nearest store. Enter the full street address.',
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
      description: 'Confirm the delivery location and order timing, then proceed to the menu. Must set an address first.',
      inputSchema: {
        type: 'object',
        properties: {
          timing: {
            type: 'string',
            enum: ['now', 'later'],
            description: 'When to place the order. Default: "now".'
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
      description: 'Select a menu category to browse items. Available categories: build-your-own, specialty, breads, loaded-tots, chicken, desserts, pastas, sandwiches, salads, drinks, extras.',
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
      description: 'Select a pizza to customize. Available pizzas: pepperoni, cheese, meatzza, extravaganzza, veggie, bbq-chicken, spicy-bacon, hawaiian.',
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
      description: 'Set the size, crust, toppings, and quantity for the selected pizza. All parameters are optional — omitted fields keep their current values.',
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
            description: 'Array of topping IDs. Available: pepperoni, italian-sausage, beef, ham, bacon, chicken, mushrooms, onions, green-peppers, black-olives, jalapenos, pineapple, tomatoes. Extra toppings beyond the pizza default are +$1.50 each.'
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
      description: 'Add the currently customized pizza to the cart and proceed to the cart view.',
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
            description: 'The 0-based index of the cart item to update.'
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
      description: 'Add a side item to the cart. Available sides: bread-bites ($6.99), cheesy-bread ($7.99), wings-8pc ($9.99), loaded-tots ($6.99), mac-cheese ($7.99).',
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
      description: 'Proceed from the cart to the checkout page. Cart must have at least one item.',
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
      description: 'Set contact information and delivery instructions for the order. All contact fields are required.',
      inputSchema: {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: 'Customer first name.' },
          lastName: { type: 'string', description: 'Customer last name.' },
          phone: { type: 'string', description: '10-digit phone number.' },
          email: { type: 'string', description: 'Email address for order confirmation.' },
          leaveAtDoor: { type: 'boolean', description: 'Whether to leave the order at the door. Default: false.' },
          deliveryInstructions: { type: 'string', description: 'Additional delivery instructions (optional).' }
        },
        required: ['firstName', 'lastName', 'phone', 'email']
      },
      execute(params) {
        return setCheckoutInfo(params);
      }
    },
    {
      name: 'place-order',
      description: 'Place the order. Will ask for user confirmation before processing. All contact fields must be filled first.',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      async execute(params, agent) {
        return await placeOrder(params, agent);
      }
    }
  ];
}
