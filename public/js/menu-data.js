// menu-data.js — Mock catalog for Checkers Pizza

const STORE = {
  id: 'redmond-01',
  name: 'Checkers Pizza — Redmond',
  address: '16011 NE 36th Way',
  city: 'Redmond',
  state: 'WA',
  zip: '98052',
  phone: '(425) 555-0199',
  deliveryEstimate: '20-35 minutes',
  hours: {
    carryout: { sunThu: '10:00am - 12:00am', friSat: '10:00am - 1:00am' },
    delivery: { sunThu: '10:00am - 12:00am', friSat: '10:00am - 1:00am' }
  }
};

const CATEGORIES = [
  { id: 'build-your-own', name: 'Build Your Own', badge: null },
  { id: 'specialty', name: 'Specialty Pizzas', badge: 'NEW!' },
  { id: 'breads', name: 'Breads', badge: 'NEW!' },
  { id: 'loaded-tots', name: 'Loaded Tots', badge: null },
  { id: 'chicken', name: 'Chicken', badge: null },
  { id: 'desserts', name: 'Desserts', badge: 'NEW!' },
  { id: 'pastas', name: 'Oven-Baked Pastas', badge: null },
  { id: 'sandwiches', name: 'Oven-Baked Sandwiches', badge: null },
  { id: 'salads', name: 'Salads', badge: null },
  { id: 'drinks', name: 'Drinks', badge: null },
  { id: 'extras', name: 'Extras', badge: null }
];

const PIZZAS = [
  {
    id: 'pepperoni',
    name: 'Pepperoni',
    description: 'Classic pepperoni with 100% real mozzarella on our signature sauce.',
    basePrice: 12.99,
    image: 'images/pizzas/pepperoni.jpg',
    tag: 'TRENDING',
    defaultToppings: ['pepperoni'],
    calories: '310 Cal/slice'
  },
  {
    id: 'cheese',
    name: 'Cheese',
    description: 'A timeless classic — 100% real mozzarella on our signature sauce.',
    basePrice: 10.99,
    image: 'images/pizzas/cheese.jpg',
    tag: null,
    defaultToppings: [],
    calories: '280 Cal/slice'
  },
  {
    id: 'meatzza',
    name: 'MeatZZa',
    description: 'Pepperoni, ham, Italian sausage and beef, sandwiched between two layers of mozzarella.',
    basePrice: 15.99,
    image: 'images/pizzas/meatzza.jpg',
    tag: null,
    defaultToppings: ['pepperoni', 'ham', 'italian-sausage', 'beef'],
    calories: '380 Cal/slice'
  },
  {
    id: 'extravaganzza',
    name: 'ExtravaganZZa',
    description: 'Pepperoni, ham, Italian sausage, beef, onions, green peppers, mushrooms, black olives, and mozzarella.',
    basePrice: 16.99,
    image: 'images/pizzas/extravaganzza.jpg',
    tag: null,
    defaultToppings: ['pepperoni', 'ham', 'italian-sausage', 'beef', 'onions', 'green-peppers', 'mushrooms', 'black-olives'],
    calories: '360 Cal/slice'
  },
  {
    id: 'veggie',
    name: 'Veggie Supreme',
    description: 'Mushrooms, green peppers, onions, black olives, tomatoes, and mozzarella on our signature sauce.',
    basePrice: 14.99,
    image: 'images/pizzas/veggie.jpg',
    tag: 'NEW!',
    defaultToppings: ['mushrooms', 'green-peppers', 'onions', 'black-olives', 'tomatoes'],
    calories: '270 Cal/slice'
  },
  {
    id: 'bbq-chicken',
    name: 'BBQ Chicken',
    description: 'Grilled chicken, BBQ sauce, onions, mozzarella and provolone.',
    basePrice: 15.99,
    image: 'images/pizzas/bbq-chicken.jpg',
    tag: null,
    defaultToppings: ['chicken', 'onions'],
    calories: '320 Cal/slice'
  },
  {
    id: 'spicy-bacon',
    name: 'Spicy Chicken Bacon Ranch',
    description: 'Grilled chicken breast, creamy ranch, smoked bacon, jalapeños, provolone and mozzarella.',
    basePrice: 16.99,
    image: 'images/pizzas/spicy-bacon.jpg',
    tag: 'NEW!',
    defaultToppings: ['chicken', 'bacon', 'jalapenos'],
    calories: '350 Cal/slice'
  },
  {
    id: 'hawaiian',
    name: 'Hawaiian',
    description: 'Ham, pineapple, mozzarella, and our signature sauce.',
    basePrice: 13.99,
    image: 'images/pizzas/hawaiian.jpg',
    tag: null,
    defaultToppings: ['ham', 'pineapple'],
    calories: '300 Cal/slice'
  }
];

const SIZES = [
  { id: 'small', name: 'Small 10"', priceModifier: -3.00 },
  { id: 'medium', name: 'Medium 12"', priceModifier: 0 },
  { id: 'large', name: 'Large 14"', priceModifier: 4.00 }
];

const CRUSTS = [
  { id: 'hand-tossed', name: 'Hand Tossed', priceModifier: 0, image: 'images/crusts/hand-tossed.jpg', default: true },
  { id: 'handmade-pan', name: 'Handmade Pan', priceModifier: 1.00, image: 'images/crusts/handmade-pan.jpg', default: false },
  { id: 'thin', name: 'Crunchy Thin', priceModifier: 0, image: 'images/crusts/thin.jpg', default: false },
  { id: 'brooklyn', name: 'Brooklyn Style', priceModifier: 0, image: 'images/crusts/brooklyn.jpg', default: false }
];

const TOPPINGS = [
  { id: 'pepperoni', name: 'Pepperoni', price: 1.50 },
  { id: 'italian-sausage', name: 'Italian Sausage', price: 1.50 },
  { id: 'beef', name: 'Beef', price: 1.50 },
  { id: 'ham', name: 'Ham', price: 1.50 },
  { id: 'bacon', name: 'Bacon', price: 1.50 },
  { id: 'chicken', name: 'Chicken', price: 1.50 },
  { id: 'mushrooms', name: 'Mushrooms', price: 1.50 },
  { id: 'onions', name: 'Onions', price: 1.50 },
  { id: 'green-peppers', name: 'Green Peppers', price: 1.50 },
  { id: 'black-olives', name: 'Black Olives', price: 1.50 },
  { id: 'jalapenos', name: 'Jalapeños', price: 1.50 },
  { id: 'pineapple', name: 'Pineapple', price: 1.50 },
  { id: 'tomatoes', name: 'Tomatoes', price: 1.50 }
];

const SIDES = [
  { id: 'bread-bites', name: 'Parmesan Bread Bites', price: 6.99, image: 'images/sides/bread-bites.jpg', description: '16-piece bread bites baked to a golden brown, tossed in parmesan.' },
  { id: 'cheesy-bread', name: 'Stuffed Cheesy Bread', price: 7.99, image: 'images/sides/cheesy-bread.jpg', description: 'Oven-baked breadsticks stuffed with cheese and drizzled with garlic butter.' },
  { id: 'wings-8pc', name: '8pc Chicken Wings', price: 9.99, image: 'images/sides/wings.jpg', description: 'Crispy, juicy chicken wings with your choice of sauce.' },
  { id: 'loaded-tots', name: 'Loaded Tots', price: 6.99, image: 'images/sides/loaded-tots.jpg', description: 'Crispy tots loaded with cheese, bacon, and ranch.' },
  { id: 'mac-cheese', name: '5-Cheese Mac & Cheese', price: 7.99, image: 'images/sides/mac-cheese.jpg', description: 'Creamy mac & cheese made with five real cheeses, oven-baked to perfection.' }
];

const DELIVERY_FEE = 5.99;
const TAX_RATE = 0.095;
