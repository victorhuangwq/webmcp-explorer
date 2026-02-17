// app.js — Wizard controller, order state, DOM rendering

// ============ ORDER STATE ============
const orderState = {
  orderType: null,        // 'delivery' | 'carryout'
  address: null,
  store: null,
  timing: 'now',
  currentCategory: null,
  selectedPizza: null,
  currentPizza: {
    size: 'medium',
    crust: 'hand-tossed',
    toppings: [],
    quantity: 1
  },
  cart: [],
  contact: {
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  },
  delivery: {
    leaveAtDoor: false,
    instructions: ''
  },
  confirmation: null
};

let currentStep = 1;

// ============ STEP NAVIGATION ============
function goToStep(step, skipHistoryUpdate = false) {
  // Hide all steps
  document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
  // Show target step
  document.getElementById(`step-${step}`).style.display = 'block';
  currentStep = step;

  // Render step content
  switch (step) {
    case 1: renderHomeCategoryGrid(); break;
    case 2: renderLocation(); break;
    case 3: renderCategories(); break;
    case 4: renderPizzaList(); break;
    case 5: renderCustomize(); break;
    case 6: renderCart(); break;
    case 7: renderCheckout(); break;
    case 8: renderConfirmation(); break;
  }

  // Update nav delivery info
  updateNavDeliveryInfo();

  // Update cart badge
  updateCartBadge();

  // Register WebMCP tools for this step
  if (typeof registerToolsForStep === 'function') {
    registerToolsForStep(step);
  }

  // Update URL
  if (!skipHistoryUpdate) {
    updateURL();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ============ STEP 1: ORDER TYPE ============
function selectOrderType(type) {
  orderState.orderType = type;
  goToStep(2);

  // Update location question based on type
  const q = document.getElementById('locationQuestion');
  if (type === 'delivery') {
    q.textContent = 'Where should we deliver to?';
    document.getElementById('addressInput').placeholder = 'Enter delivery address';
  } else {
    q.textContent = 'Find a store near you';
    document.getElementById('addressInput').placeholder = 'Enter city, state, or zip';
  }

  return {
    content: [{ type: 'text', text: `Order type set to ${type}. Please provide a ${type === 'delivery' ? 'delivery address' : 'location to find nearby stores'}.` }],
    orderState: { orderType: type }
  };
}

// ============ STEP 2: LOCATION ============
function renderLocation() {
  // Update location question based on order type
  const q = document.getElementById('locationQuestion');
  if (orderState.orderType === 'delivery') {
    q.textContent = 'Where should we deliver to?';
    document.getElementById('addressInput').placeholder = 'Enter delivery address';
  } else if (orderState.orderType === 'carryout') {
    q.textContent = 'Find a store near you';
    document.getElementById('addressInput').placeholder = 'Enter city, state, or zip';
  }
  
  // If address already set, show store result
  if (orderState.address && orderState.store) {
    document.getElementById('addressEntry').style.display = 'none';
    const result = document.getElementById('storeResult');
    result.style.display = 'block';
    document.getElementById('storeAddressDisplay').textContent = orderState.address.toUpperCase();
    document.getElementById('storeCityDisplay').textContent = `${orderState.store.city}, ${orderState.store.state} ${orderState.store.zip}`;
    document.getElementById('storeEstimateDisplay').textContent = `Delivery in ${orderState.store.deliveryEstimate}`;
    document.getElementById('storePhoneDisplay').textContent = orderState.store.phone;
  } else {
    document.getElementById('addressEntry').style.display = 'block';
    document.getElementById('storeResult').style.display = 'none';
  }
}

function findStore() {
  const address = document.getElementById('addressInput').value.trim();
  return setDeliveryAddress(address);
}

function setDeliveryAddress(address) {
  if (!address) {
    showError('addressError', 'Please enter a delivery address');
    return { content: [{ type: 'text', text: 'Error: Please enter a delivery address.' }] };
  }
  hideError('addressError');

  orderState.address = address;
  orderState.store = STORE;

  // Show store result
  document.getElementById('addressEntry').style.display = 'none';
  const result = document.getElementById('storeResult');
  result.style.display = 'block';
  document.getElementById('storeAddressDisplay').textContent = address.toUpperCase();
  document.getElementById('storeCityDisplay').textContent = `${STORE.city}, ${STORE.state} ${STORE.zip}`;
  document.getElementById('storeEstimateDisplay').textContent = `Delivery in ${STORE.deliveryEstimate}`;
  document.getElementById('storePhoneDisplay').textContent = STORE.phone;

  return {
    content: [{ type: 'text', text: `Found nearest store: ${STORE.name} at ${STORE.address}, ${STORE.city}, ${STORE.state} ${STORE.zip}. Delivery estimate: ${STORE.deliveryEstimate}. Phone: ${STORE.phone}. Please confirm location to proceed.` }],
    orderState: { orderType: orderState.orderType, address, store: STORE }
  };
}

function setTiming(timing) {
  orderState.timing = timing;
  document.getElementById('timingNow').classList.toggle('active', timing === 'now');
  document.getElementById('timingLater').classList.toggle('active', timing === 'later');
}

function confirmLocation(timing) {
  if (!orderState.address) {
    return { content: [{ type: 'text', text: 'Error: Please enter a delivery address before confirming location.' }] };
  }
  if (timing) setTiming(timing);
  goToStep(3);

  const categories = CATEGORIES.map(c => c.name).join(', ');
  return {
    content: [{ type: 'text', text: `Location confirmed. Order will be ${orderState.orderType} to ${orderState.address}. Showing menu categories: ${categories}. Select a category to browse items.` }],
    orderState: { orderType: orderState.orderType, address: orderState.address, store: orderState.store, timing: orderState.timing }
  };
}

// ============ STEP 3: MENU CATEGORIES ============
const CATEGORY_EMOJIS = {
  'build-your-own': '🍕', 'specialty': '🍕', 'breads': '🥖',
  'loaded-tots': '🥔', 'chicken': '🍗', 'desserts': '🍫',
  'pastas': '🍝', 'sandwiches': '🥪', 'salads': '🥗',
  'drinks': '🥤', 'extras': '🧂'
};

function renderHomeCategoryGrid() {
  const grid = document.getElementById('homeCategoryGrid');
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map(cat => `
    <div class="home-cat-card" onclick="selectOrderType('delivery')">
      ${cat.badge ? `<span class="home-cat-badge">${cat.badge}</span>` : ''}
      <div class="home-cat-img-placeholder">${CATEGORY_EMOJIS[cat.id] || '🍽️'}</div>
      <div class="home-cat-label">${cat.name}</div>
    </div>
  `).join('');
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = CATEGORIES.map(cat => `
    <div class="category-card" onclick="selectCategoryUI('${cat.id}')">
      ${cat.badge ? `<span class="category-card-badge">${cat.badge}</span>` : ''}
      <div class="category-card-img-placeholder">${CATEGORY_EMOJIS[cat.id] || '🍽️'}</div>
      <div class="category-card-label">${cat.name}</div>
    </div>
  `).join('');
}

function selectCategoryUI(categoryId) {
  return selectCategory(categoryId);
}

function selectCategory(categoryId) {
  orderState.currentCategory = categoryId;
  goToStep(4);

  const cat = CATEGORIES.find(c => c.id === categoryId);
  const items = PIZZAS; // For now, all categories show pizzas
  const categoryName = cat ? cat.name : categoryId;

  document.getElementById('categoryTitle').textContent = categoryName.toUpperCase();

  return {
    content: [{ type: 'text', text: `Showing ${categoryName}. ${items.length} items available: ${items.map(p => p.name).join(', ')}. Select a pizza to customize.` }],
    orderState: { ...getStateSnapshot(), currentCategory: categoryId },
    availableItems: items.map(p => ({ id: p.id, name: p.name, description: p.description, basePrice: p.basePrice, tags: p.tag }))
  };
}

// ============ STEP 4: PIZZA SELECTION ============
function renderPizzaList() {
  const grid = document.getElementById('pizzaGrid');
  grid.innerHTML = PIZZAS.map(pizza => `
    <div class="pizza-card" onclick="selectPizzaUI('${pizza.id}')">
      <div class="pizza-card-img-wrap">
        ${pizza.tag ? `<span class="pizza-card-badge ${pizza.tag === 'TRENDING' ? 'trending' : ''}">${pizza.tag}</span>` : ''}
        <div class="pizza-card-img-placeholder">🍕</div>
        <button class="pizza-card-cart-btn" onclick="event.stopPropagation(); quickAddPizza('${pizza.id}')">🛒</button>
      </div>
      <div class="pizza-card-info">
        <div class="pizza-card-name">${pizza.name}</div>
        <div class="pizza-card-desc">${pizza.description}</div>
        <div class="pizza-card-price">From $${pizza.basePrice.toFixed(2)}</div>
      </div>
    </div>
  `).join('');
}

function selectPizzaUI(pizzaId) {
  return selectPizza(pizzaId);
}

function selectPizza(pizzaId) {
  const pizza = PIZZAS.find(p => p.id === pizzaId);
  if (!pizza) {
    return { content: [{ type: 'text', text: `Error: Pizza "${pizzaId}" not found. Available: ${PIZZAS.map(p => p.id).join(', ')}` }] };
  }

  orderState.selectedPizza = pizza;
  orderState.currentPizza = {
    size: 'medium',
    crust: 'hand-tossed',
    toppings: [...pizza.defaultToppings],
    quantity: 1
  };

  goToStep(5);

  const sizesAvail = SIZES.map(s => s.id).join(', ');
  const crustsAvail = CRUSTS.map(c => c.id).join(', ');
  const toppingsAvail = TOPPINGS.map(t => t.id).join(', ');

  return {
    content: [{ type: 'text', text: `Selected ${pizza.name} ($${pizza.basePrice.toFixed(2)} base). Default toppings: ${pizza.defaultToppings.join(', ') || 'none'}. Ready to customize. Available sizes: ${sizesAvail}. Available crusts: ${crustsAvail}. Available toppings: ${toppingsAvail}. Use customize-pizza to set options, then add-to-cart.` }],
    orderState: { ...getStateSnapshot(), selectedPizza: { id: pizza.id, name: pizza.name, basePrice: pizza.basePrice } },
    customizationOptions: { sizes: SIZES, crusts: CRUSTS, toppings: TOPPINGS }
  };
}

// Quick add with defaults
function quickAddPizza(pizzaId) {
  selectPizza(pizzaId);
  addToCart();
}

// ============ STEP 5: CUSTOMIZE PIZZA ============
function renderCustomize() {
  const pizza = orderState.selectedPizza;
  if (!pizza) return;
  const cp = orderState.currentPizza;

  document.getElementById('customizePizzaName').textContent = pizza.name.toUpperCase();
  document.getElementById('customizePizzaDesc').textContent = pizza.description;
  document.getElementById('customizeThumbName').textContent = pizza.name.toUpperCase();

  // Quantity
  document.getElementById('qtyValue').textContent = cp.quantity;

  // Crusts
  document.getElementById('crustOptions').innerHTML = CRUSTS.map(crust => `
    <div class="crust-card ${cp.crust === crust.id ? 'selected' : ''}" onclick="setCrust('${crust.id}')">
      <input type="radio" name="crust" class="crust-radio" ${cp.crust === crust.id ? 'checked' : ''} />
      <span class="crust-card-label">${crust.name}${crust.priceModifier > 0 ? ` (+$${crust.priceModifier.toFixed(2)})` : ''}</span>
    </div>
  `).join('');

  // Sizes
  document.getElementById('sizeOptions').innerHTML = SIZES.map(size => `
    <button class="size-btn ${cp.size === size.id ? 'selected' : ''}" onclick="setSize('${size.id}')">${size.name}</button>
  `).join('');

  // Toppings
  document.getElementById('toppingGrid').innerHTML = TOPPINGS.map(topping => `
    <button class="topping-chip ${cp.toppings.includes(topping.id) ? 'selected' : ''}" onclick="toggleTopping('${topping.id}')">${topping.name}</button>
  `).join('');
}

function setCrust(crustId) {
  orderState.currentPizza.crust = crustId;
  renderCustomize();
}

function setSize(sizeId) {
  orderState.currentPizza.size = sizeId;
  renderCustomize();
}

function toggleTopping(toppingId) {
  const toppings = orderState.currentPizza.toppings;
  const idx = toppings.indexOf(toppingId);
  if (idx >= 0) toppings.splice(idx, 1);
  else toppings.push(toppingId);
  renderCustomize();
}

function changeQuantity(delta) {
  orderState.currentPizza.quantity = Math.max(1, orderState.currentPizza.quantity + delta);
  document.getElementById('qtyValue').textContent = orderState.currentPizza.quantity;
}

function customizePizza({ size, crust, toppings, quantity } = {}) {
  if (!orderState.selectedPizza) {
    return { content: [{ type: 'text', text: 'Error: No pizza selected. Use select-pizza first.' }] };
  }

  if (size && SIZES.find(s => s.id === size)) orderState.currentPizza.size = size;
  if (crust && CRUSTS.find(c => c.id === crust)) orderState.currentPizza.crust = crust;
  if (toppings && Array.isArray(toppings)) orderState.currentPizza.toppings = toppings;
  if (quantity && quantity >= 1) orderState.currentPizza.quantity = quantity;

  renderCustomize();

  const price = calculatePizzaPrice();
  const cp = orderState.currentPizza;
  const sizeObj = SIZES.find(s => s.id === cp.size);
  const crustObj = CRUSTS.find(c => c.id === cp.crust);

  return {
    content: [{ type: 'text', text: `Pizza customized: ${sizeObj.name} ${crustObj.name} ${orderState.selectedPizza.name}. Toppings: ${cp.toppings.join(', ') || 'none'}. Quantity: ${cp.quantity}. Price: $${price.toFixed(2)}. Use add-to-cart to add to cart.` }],
    orderState: { ...getStateSnapshot(), currentPizza: { ...cp, price } }
  };
}

function calculatePizzaPrice() {
  const pizza = orderState.selectedPizza;
  const cp = orderState.currentPizza;
  if (!pizza) return 0;

  const sizeObj = SIZES.find(s => s.id === cp.size);
  const crustObj = CRUSTS.find(c => c.id === cp.crust);

  let price = pizza.basePrice;
  price += sizeObj ? sizeObj.priceModifier : 0;
  price += crustObj ? crustObj.priceModifier : 0;

  // Extra toppings beyond default
  const extraToppings = cp.toppings.filter(t => !pizza.defaultToppings.includes(t));
  price += extraToppings.length * 1.50;

  return price * cp.quantity;
}

// ============ ADD TO CART ============
function addToCart() {
  if (!orderState.selectedPizza) {
    return { content: [{ type: 'text', text: 'Error: No pizza selected.' }] };
  }

  const cp = orderState.currentPizza;
  const sizeObj = SIZES.find(s => s.id === cp.size);
  const crustObj = CRUSTS.find(c => c.id === cp.crust);
  const price = calculatePizzaPrice();

  const item = {
    type: 'pizza',
    pizza: orderState.selectedPizza,
    size: cp.size,
    sizeName: sizeObj.name,
    crust: cp.crust,
    crustName: crustObj.name,
    toppings: [...cp.toppings],
    quantity: cp.quantity,
    price: price,
    name: `${sizeObj.name} ${crustObj.name} ${orderState.selectedPizza.name}`,
    calories: orderState.selectedPizza.calories
  };

  orderState.cart.push(item);
  goToStep(6);

  const subtotal = getCartSubtotal();
  return {
    content: [{ type: 'text', text: `Added ${item.name} to cart (qty: ${cp.quantity}). Cart total: $${subtotal.toFixed(2)} (${orderState.cart.length} item${orderState.cart.length > 1 ? 's' : ''}). You can add sides or proceed-to-checkout.` }],
    orderState: { ...getStateSnapshot(), cart: { items: orderState.cart, subtotal } }
  };
}

// ============ STEP 6: CART ============
function renderCart() {
  const subtotal = getCartSubtotal();
  document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;

  // Cart items
  const itemsEl = document.getElementById('cartItems');
  if (orderState.cart.length === 0) {
    itemsEl.innerHTML = '<p style="color:#888; padding:16px 0;">Your cart is empty.</p>';
  } else {
    itemsEl.innerHTML = orderState.cart.map((item, i) => `
      <div class="cart-item">
        <div class="cart-item-img-placeholder">🍕</div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.calories || ''}</div>
          <div class="cart-item-actions">
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="updateCartItemQty(${i}, -1)">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn qty-plus" onclick="updateCartItemQty(${i}, 1)">+</button>
            </div>
            <button class="cart-action-link" onclick="editCartItem(${i})">Edit</button>
            <button class="cart-action-link" onclick="removeCartItem(${i})">Remove</button>
          </div>
        </div>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');
  }

  // Sides
  document.getElementById('sidesGrid').innerHTML = SIDES.map(side => `
    <div class="side-card">
      <div class="side-card-img-placeholder">🥖</div>
      <button class="side-card-cart-btn" onclick="addSideUI('${side.id}')">🛒</button>
      <div class="side-card-name">${side.name}</div>
    </div>
  `).join('');
}

function updateCartItemQty(index, delta) {
  if (index < 0 || index >= orderState.cart.length) return;
  const item = orderState.cart[index];
  item.quantity = Math.max(0, item.quantity + delta);

  // Recalculate price based on quantity
  if (item.type === 'pizza') {
    const sizeObj = SIZES.find(s => s.id === item.size);
    const crustObj = CRUSTS.find(c => c.id === item.crust);
    let unitPrice = item.pizza.basePrice + (sizeObj ? sizeObj.priceModifier : 0) + (crustObj ? crustObj.priceModifier : 0);
    const extraToppings = item.toppings.filter(t => !item.pizza.defaultToppings.includes(t));
    unitPrice += extraToppings.length * 1.50;
    item.price = unitPrice * item.quantity;
  } else if (item.type === 'side') {
    item.price = item.unitPrice * item.quantity;
  }

  if (item.quantity === 0) orderState.cart.splice(index, 1);
  renderCart();
}

function removeCartItem(index) {
  orderState.cart.splice(index, 1);
  renderCart();
}

function editCartItem(index) {
  // Go back to customize with this item's settings
  const item = orderState.cart[index];
  if (item.type === 'pizza') {
    orderState.selectedPizza = item.pizza;
    orderState.currentPizza = {
      size: item.size,
      crust: item.crust,
      toppings: [...item.toppings],
      quantity: item.quantity
    };
    orderState.cart.splice(index, 1);
    goToStep(5);
  }
}

function updateCartItem({ itemIndex, quantity }) {
  if (itemIndex < 0 || itemIndex >= orderState.cart.length) {
    return { content: [{ type: 'text', text: `Error: Invalid item index ${itemIndex}. Cart has ${orderState.cart.length} items.` }] };
  }

  if (quantity !== undefined) {
    if (quantity <= 0) {
      orderState.cart.splice(itemIndex, 1);
    } else {
      const delta = quantity - orderState.cart[itemIndex].quantity;
      updateCartItemQty(itemIndex, delta);
    }
  }

  renderCart();
  const subtotal = getCartSubtotal();
  return {
    content: [{ type: 'text', text: `Cart updated. ${orderState.cart.length} item${orderState.cart.length !== 1 ? 's' : ''}, subtotal: $${subtotal.toFixed(2)}.` }],
    orderState: { ...getStateSnapshot(), cart: { items: orderState.cart, subtotal } }
  };
}

function addSideUI(sideId) {
  return addSide(sideId);
}

function addSide(sideId, quantity = 1) {
  const side = SIDES.find(s => s.id === sideId);
  if (!side) {
    return { content: [{ type: 'text', text: `Error: Side "${sideId}" not found. Available: ${SIDES.map(s => s.id).join(', ')}` }] };
  }

  // Check if already in cart
  const existing = orderState.cart.find(item => item.type === 'side' && item.sideId === sideId);
  if (existing) {
    existing.quantity += quantity;
    existing.price = existing.unitPrice * existing.quantity;
  } else {
    orderState.cart.push({
      type: 'side',
      sideId: side.id,
      name: side.name,
      unitPrice: side.price,
      price: side.price * quantity,
      quantity: quantity,
      calories: ''
    });
  }

  renderCart();
  const subtotal = getCartSubtotal();
  return {
    content: [{ type: 'text', text: `Added ${side.name} ($${side.price.toFixed(2)}) to cart. Subtotal: $${subtotal.toFixed(2)} (${orderState.cart.length} items). You can add more sides or proceed-to-checkout.` }],
    orderState: { ...getStateSnapshot(), cart: { items: orderState.cart, subtotal } }
  };
}

function proceedToCheckout() {
  if (orderState.cart.length === 0) {
    showError('cartError', 'Your cart is empty');
    return { content: [{ type: 'text', text: 'Error: Your cart is empty. Add items before proceeding to checkout.' }] };
  }
  hideError('cartError');
  goToStep(7);

  const totals = calculateTotals();
  return {
    content: [{ type: 'text', text: `Proceeding to checkout. Subtotal: $${totals.subtotal.toFixed(2)}, Delivery Fee: $${totals.deliveryFee.toFixed(2)}, Tax: $${totals.tax.toFixed(2)}, Total: $${totals.total.toFixed(2)}. Please set checkout info (firstName, lastName, phone, email) and delivery instructions, then place-order.` }],
    orderState: { ...getStateSnapshot(), checkout: totals }
  };
}

// ============ STEP 7: CHECKOUT ============
function renderCheckout() {
  const totals = calculateTotals();

  // Restore form values from state
  document.getElementById('firstName').value = orderState.contact.firstName;
  document.getElementById('lastName').value = orderState.contact.lastName;
  document.getElementById('phone').value = orderState.contact.phone;
  document.getElementById('email').value = orderState.contact.email;
  document.getElementById('leaveAtDoor').checked = orderState.delivery.leaveAtDoor;
  document.getElementById('deliveryInstructions').value = orderState.delivery.instructions;

  // Summary
  document.getElementById('summaryItemCount').textContent = `${orderState.cart.length} Item${orderState.cart.length !== 1 ? 's' : ''}`;
  document.getElementById('summaryItems').innerHTML = orderState.cart.map(item => `
    <div class="summary-line" style="font-size:12px;color:#555;">
      <span>${item.quantity}x ${item.name}</span>
      <span>$${item.price.toFixed(2)}</span>
    </div>
  `).join('');
  document.getElementById('summarySubtotal').textContent = `$${totals.subtotal.toFixed(2)}`;
  document.getElementById('summaryDeliveryFee').textContent = `$${totals.deliveryFee.toFixed(2)}`;
  document.getElementById('summaryTax').textContent = `$${totals.tax.toFixed(2)}`;
  document.getElementById('summaryTotal').textContent = `$${totals.total.toFixed(2)}`;
  document.getElementById('placeOrderTotal').textContent = `$${totals.total.toFixed(2)}`;
}

function updateCheckoutState() {
  orderState.contact.firstName = document.getElementById('firstName').value;
  orderState.contact.lastName = document.getElementById('lastName').value;
  orderState.contact.phone = document.getElementById('phone').value;
  orderState.contact.email = document.getElementById('email').value;
  orderState.delivery.leaveAtDoor = document.getElementById('leaveAtDoor').checked;
  orderState.delivery.instructions = document.getElementById('deliveryInstructions').value;
}

function setCheckoutInfo({ firstName, lastName, phone, email, leaveAtDoor, deliveryInstructions } = {}) {
  // Validate
  const errors = [];
  if (!firstName) errors.push('First name is required');
  if (!lastName) errors.push('Last name is required');
  if (!phone || phone.replace(/\D/g, '').length < 10) errors.push('Please enter a valid phone number');
  if (!email || !email.includes('@')) errors.push('Please enter a valid email address');

  if (errors.length > 0) {
    // Show individual field errors
    showError('firstNameError', !firstName ? 'First name is required' : '');
    showError('lastNameError', !lastName ? 'Last name is required' : '');
    showError('phoneError', !phone || phone.replace(/\D/g, '').length < 10 ? 'Please enter a valid phone number' : '');
    showError('emailError', !email || !email.includes('@') ? 'Please enter a valid email address' : '');
    return { content: [{ type: 'text', text: `Validation errors: ${errors.join('. ')}.` }] };
  }

  // Clear errors
  ['firstNameError', 'lastNameError', 'phoneError', 'emailError'].forEach(id => hideError(id));

  orderState.contact = { firstName, lastName, phone, email };
  if (leaveAtDoor !== undefined) orderState.delivery.leaveAtDoor = leaveAtDoor;
  if (deliveryInstructions !== undefined) orderState.delivery.instructions = deliveryInstructions;

  // Update form
  document.getElementById('firstName').value = firstName;
  document.getElementById('lastName').value = lastName;
  document.getElementById('phone').value = phone;
  document.getElementById('email').value = email;
  document.getElementById('leaveAtDoor').checked = orderState.delivery.leaveAtDoor;
  document.getElementById('deliveryInstructions').value = orderState.delivery.instructions || '';

  const totals = calculateTotals();
  return {
    content: [{ type: 'text', text: `Checkout info saved for ${firstName} ${lastName}. Ready to place order. Total: $${totals.total.toFixed(2)}. Use place-order to complete.` }],
    orderState: { ...getStateSnapshot(), contact: orderState.contact, delivery: orderState.delivery, checkout: totals }
  };
}

async function placeOrder(params, agent) {
  // Validate contact
  updateCheckoutState();
  const c = orderState.contact;
  if (!c.firstName || !c.lastName || !c.phone || !c.email) {
    showError('checkoutError', 'Please fill in all required contact fields');
    return { content: [{ type: 'text', text: 'Error: Please fill in all required contact fields before placing order.' }] };
  }
  hideError('checkoutError');

  const totals = calculateTotals();

  // Use requestUserInteraction if agent is available
  if (agent && typeof agent.requestUserInteraction === 'function') {
    const confirmed = await agent.requestUserInteraction(async () => {
      return new Promise((resolve) => {
        const ok = confirm(
          `Place order for $${totals.total.toFixed(2)}?\n` +
          `${orderState.orderType === 'delivery' ? `Delivery to: ${orderState.address}` : `Carryout from: ${orderState.store.name}`}\n` +
          `${orderState.cart.map(i => `  ${i.quantity}x ${i.name}`).join('\n')}\n\n` +
          `Click OK to confirm.`
        );
        resolve(ok);
      });
    });
    if (!confirmed) {
      return { content: [{ type: 'text', text: 'Order cancelled by user.' }] };
    }
  } else {
    // No agent — confirm via browser dialog
    const ok = confirm(`Place order for $${totals.total.toFixed(2)}?`);
    if (!ok) return { content: [{ type: 'text', text: 'Order cancelled by user.' }] };
  }

  // Generate order number
  const orderNumber = `CP-${String(Math.floor(10000 + Math.random() * 90000))}`;
  orderState.confirmation = {
    orderNumber,
    estimatedDelivery: orderState.store.deliveryEstimate,
    totals
  };

  goToStep(8);

  return {
    content: [{ type: 'text', text: `Order placed! Order ${orderNumber}. Estimated ${orderState.orderType}: ${orderState.store.deliveryEstimate}. Total charged: $${totals.total.toFixed(2)}.` }],
    orderState: { ...getStateSnapshot(), confirmation: orderState.confirmation }
  };
}

// ============ STEP 8: CONFIRMATION ============
function renderConfirmation() {
  const conf = orderState.confirmation;
  if (!conf) return;

  document.getElementById('confirmOrderNumber').textContent = `Order ${conf.orderNumber}`;
  document.getElementById('confirmEstimate').textContent =
    `Estimated ${orderState.orderType}: ${conf.estimatedDelivery}`;

  document.getElementById('confirmSummary').innerHTML = `
    ${orderState.cart.map(item => `
      <div class="confirmation-summary-line">
        <span>${item.quantity}x ${item.name}</span>
        <span>$${item.price.toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="confirmation-summary-line">
      <span>Delivery Fee</span>
      <span>$${conf.totals.deliveryFee.toFixed(2)}</span>
    </div>
    <div class="confirmation-summary-line">
      <span>Tax</span>
      <span>$${conf.totals.tax.toFixed(2)}</span>
    </div>
    <div class="confirmation-summary-line total">
      <span>Total</span>
      <span>$${conf.totals.total.toFixed(2)}</span>
    </div>
  `;
}

function startNewOrder() {
  // Reset state
  orderState.orderType = null;
  orderState.address = null;
  orderState.store = null;
  orderState.timing = 'now';
  orderState.currentCategory = null;
  orderState.selectedPizza = null;
  orderState.currentPizza = { size: 'medium', crust: 'hand-tossed', toppings: [], quantity: 1 };
  orderState.cart = [];
  orderState.contact = { firstName: '', lastName: '', phone: '', email: '' };
  orderState.delivery = { leaveAtDoor: false, instructions: '' };
  orderState.confirmation = null;

  // Reset UI
  document.getElementById('addressEntry').style.display = 'block';
  document.getElementById('storeResult').style.display = 'none';
  document.getElementById('addressInput').value = '';

  goToStep(1);
}

// ============ HELPERS ============
function getCartSubtotal() {
  return orderState.cart.reduce((sum, item) => sum + item.price, 0);
}

function calculateTotals() {
  const subtotal = getCartSubtotal();
  const deliveryFee = orderState.orderType === 'delivery' ? DELIVERY_FEE : 0;
  const tax = Math.round((subtotal + deliveryFee) * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
  return { subtotal, deliveryFee, tax, total };
}

function updateNavDeliveryInfo() {
  const el = document.getElementById('navDeliveryInfo');
  const pill = document.getElementById('navLocationPill');
  if (orderState.address && orderState.store && currentStep >= 3) {
    el.style.display = 'flex';
    if (pill) pill.style.display = 'none';
    document.getElementById('navDeliveryText').textContent =
      `Delivery \u00B7 ${orderState.store.deliveryEstimate} \u00B7 ${orderState.address.substring(0, 30)}${orderState.address.length > 30 ? '...' : ''}`;
  } else {
    el.style.display = 'none';
    if (pill) pill.style.display = 'flex';
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const count = orderState.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (count > 0) {
    badge.style.display = 'flex';
    badge.textContent = count;
  } else {
    badge.style.display = 'none';
  }
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el && message) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

function getStateSnapshot() {
  return {
    orderType: orderState.orderType,
    address: orderState.address,
    timing: orderState.timing
  };
}

// ============ URL STATE MANAGEMENT ============
const BASE_PATH = '/pizza-order-demo';

const STEP_PATHS = {
  1: BASE_PATH + '/',
  2: BASE_PATH + '/location',
  3: BASE_PATH + '/menu',
  4: BASE_PATH + '/pizzas',
  5: BASE_PATH + '/customize',
  6: BASE_PATH + '/cart',
  7: BASE_PATH + '/checkout',
  8: BASE_PATH + '/confirmation'
};

const PATH_TO_STEP = {
  [BASE_PATH + '/']: 1,
  [BASE_PATH + '/location']: 2,
  [BASE_PATH + '/menu']: 3,
  [BASE_PATH + '/pizzas']: 4,
  [BASE_PATH + '/customize']: 5,
  [BASE_PATH + '/cart']: 6,
  [BASE_PATH + '/checkout']: 7,
  [BASE_PATH + '/confirmation']: 8
};

function updateURL() {
  const path = STEP_PATHS[currentStep] || '/';
  const params = new URLSearchParams();
  
  if (orderState.orderType) {
    params.set('orderType', orderState.orderType);
  }
  
  if (orderState.address) {
    params.set('address', orderState.address);
  }
  
  if (orderState.currentCategory) {
    params.set('category', orderState.currentCategory);
  }
  
  if (orderState.selectedPizza) {
    params.set('pizza', orderState.selectedPizza.id);
  }
  
  if (orderState.cart.length > 0) {
    params.set('cartItems', orderState.cart.length);
  }
  
  const search = params.toString();
  const url = search ? `${path}?${search}` : path;
  history.pushState({ step: currentStep, orderState: JSON.parse(JSON.stringify(orderState)) }, '', url);
}

function restoreFromURL() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const step = PATH_TO_STEP[path] || 1;
  
  // Restore order state from URL
  if (params.has('orderType')) {
    orderState.orderType = params.get('orderType');
  }
  
  if (params.has('address')) {
    orderState.address = params.get('address');
    orderState.store = STORE;
  }
  
  if (params.has('category')) {
    orderState.currentCategory = params.get('category');
  }
  
  if (params.has('pizza')) {
    const pizzaId = params.get('pizza');
    orderState.selectedPizza = PIZZAS.find(p => p.id === pizzaId);
  }
  
  // Go to the step from URL (skip history update since we're restoring)
  goToStep(step, true);
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.step) {
    // Restore state from history
    if (event.state.orderState) {
      Object.assign(orderState, event.state.orderState);
    }
    goToStep(event.state.step, true);
  } else {
    // No state, restore from URL params
    restoreFromURL();
  }
});

function goToHome() {
  startNewOrder();
}

// ============ INIT ============
// Start on Step 1 — register tools once webmcp-tools.js loads
document.addEventListener('DOMContentLoaded', () => {
  // Check if there's a path indicating a specific step, otherwise start at step 1
  const path = window.location.pathname;
  if (path !== BASE_PATH + '/' && PATH_TO_STEP[path]) {
    restoreFromURL();
  } else {
    goToStep(1);
  }
});
