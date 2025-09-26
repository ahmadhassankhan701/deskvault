import { subDays, subMonths } from "date-fns";
import type { Product, Transaction, Expense, Partner } from "./types";

export const products: Product[] = [
  { id: "prod-1", type: "sku", name: "Ergo-Comfort Keyboard", stock: 50, price: 79.99, category: "Peripherals", imei: "8901234567890" },
  { id: "prod-2", type: "individual", name: "4K Ultra-Wide Monitor", stock: 1, price: 499.99, category: "Displays", imei: "123456789012345" },
  { id: "prod-3", type: "sku", name: "Vertical Ergonomic Mouse", stock: 75, price: 45.50, category: "Peripherals", imei: "8901234567891" },
  { id: "prod-4", type: "sku", name: "Standing Desk Converter", stock: 8, price: 250.00, category: "Furniture", imei: "8901234567892" },
  { id: "prod-5", type: "individual", name: "Noise-Cancelling Headphones", stock: 1, price: 199.99, category: "Audio", imei: "543210987654321"},
  { id: "prod-6", type: "sku", name: "Docking Station (USB-C)", stock: 30, price: 120.00, category: "Accessories", imei: "8901234567893" },
  { id: "prod-7", type: "individual", name: "Macbook Pro 14 inch", stock: 1, price: 2499.00, category: "Laptops", imei: "112233445566778"},
  { id: "prod-8", type: "individual", name: "iPhone 15 Pro", stock: 0, price: 999.00, category: "Mobiles", imei: "887766554433221"},
  { id: "prod-9", type: "individual", name: "iPad Air", stock: 1, price: 799.00, category: "Tablets", imei: "123123123123123"},
  { id: "prod-10", type: "individual", name: "Galaxy S24 Ultra", stock: 0, price: 1299.00, category: "Mobiles", imei: "321321321321321"},
];

export const partners: Partner[] = [
    { id: "partner-1", type: "shop", name: "Innovate LLC", phone: "555-0101", shopName: "Innovate LLC" },
    { id: "partner-2", type: "shop", name: "Office Solutions Inc.", phone: "555-0102", shopName: "Office Solutions Inc." },
    { id: "partner-3", type: "shop", name: "Design Co.", phone: "555-0103", shopName: "Design Co." },
    { id: "partner-4", type: "individual", name: "Freelancer Bob", phone: "555-0104" },
    { id: "partner-5", type: "shop", name: "Tech Distributors", phone: "555-0105", shopName: "Tech Distributors" },
    { id: "partner-6", type: "individual", name: "Alice", phone: "555-0106" },
    { id: "partner-7", type: "individual", name: "Startup Hub", phone: "555-0107" },
    { id: "partner-8", type: "individual", name: "Creative Agency", phone: "555-0108" },
];

export const transactions: Transaction[] = [
  {
    id: "txn-1",
    productId: "prod-1",
    type: "sale",
    quantity: 2,
    price: 79.99,
    totalAmount: 159.98,
    date: subDays(new Date(), 2).toISOString(),
    party: "Innovate LLC",
  },
  {
    id: "txn-2",
    productId: "prod-4",
    type: "purchase",
    quantity: 10,
    price: 220.00,
    totalAmount: 2200.00,
    date: subDays(new Date(), 28).toISOString(),
    party: "Office Solutions Inc.",
  },
  {
    id: "txn-3",
    productId: "prod-2",
    type: "sale",
    quantity: 1,
    price: 499.99,
    totalAmount: 499.99,
    date: subDays(new Date(), 5).toISOString(),
    party: "Design Co.",
  },
  {
    id: "txn-4",
    productId: "prod-5",
    type: "lend-out",
    quantity: 1,
    price: 0,
    totalAmount: 0,
    date: subDays(new Date(), 10).toISOString(),
    party: "Freelancer Bob",
  },
  {
    id: "txn-5",
    productId: "prod-6",
    type: "purchase",
    quantity: 20,
    price: 95.00,
    totalAmount: 1900.00,
    date: subMonths(new Date(), 2).toISOString(),
    party: "Tech Distributors",
  },
  {
    id: "txn-6",
    productId: "prod-1",
    type: "sale",
    quantity: 10,
    price: 79.99,
    totalAmount: 799.90,
    date: subMonths(new Date(), 2).toISOString(),
    party: "Startup Hub",
  },
  {
    id: "txn-8",
    productId: "prod-8",
    type: "sale",
    quantity: 1,
    price: 999.00,
    totalAmount: 999.00,
    date: subMonths(new Date(), 1).toISOString(),
    party: "Creative Agency",
  },
  {
    id: "txn-9",
    productId: "prod-9",
    type: "lend-out",
    quantity: 1,
    price: 0,
    totalAmount: 0,
    date: subDays(new Date(), 3).toISOString(),
    party: "Design Co.",
  },
  {
    id: "txn-10",
    productId: "prod-10",
    type: "sale",
    quantity: 1,
    price: 1350,
    totalAmount: 1350.00,
    date: subDays(new Date(), 1).toISOString(),
    party: "Alice",
  },
];

export const expenses: Expense[] = [
    {
        id: "exp-1",
        date: subMonths(new Date(), 1).toISOString(),
        category: "rent",
        description: "Office Space Rent - May",
        amount: 2500.00
    },
    {
        id: "exp-2",
        date: subDays(new Date(), 15).toISOString(),
        category: "utilities",
        description: "Electricity Bill",
        amount: 350.75
    },
    {
        id: "exp-3",
        date: subDays(new Date(), 5).toISOString(),
        category: "stock",
        description: "New inventory purchase",
        amount: 800.00
    },
    {
        id: "exp-4",
        date: subDays(new Date(), 2).toISOString(),
        category: "salaries",
        description: "Part-time employee salary",
        amount: 1200.00
    },
    {
        id: "exp-5",
        date: subMonths(new Date(), 2).toISOString(),
        category: "rent",
        description: "Office Space Rent - April",
        amount: 2500.00
    },
];
