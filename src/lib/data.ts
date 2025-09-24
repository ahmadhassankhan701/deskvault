import { subDays, subMonths } from "date-fns";
import type { Product, Transaction, Expense } from "./types";

export const products: Product[] = [
  { id: "prod-1", name: "Ergo-Comfort Keyboard", stock: 50, price: 79.99, category: "Peripherals" },
  { id: "prod-2", name: "4K Ultra-Wide Monitor", stock: 25, price: 499.99, category: "Displays" },
  { id: "prod-3", name: "Vertical Ergonomic Mouse", stock: 75, price: 45.50, category: "Peripherals" },
  { id: "prod-4", name: "Standing Desk Converter", stock: 8, price: 250.00, category: "Furniture" },
  { id: "prod-5", name: "Noise-Cancelling Headphones", stock: 0, price: 199.99, category: "Audio" },
  { id: "prod-6", name: "Docking Station (USB-C)", stock: 30, price: 120.00, category: "Accessories" },
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
    productId: "prod-3",
    type: "lend-out",
    quantity: 5,
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
    id: "txn-7",
    productId: "prod-2",
    type: "sale",
    quantity: 5,
    price: 499.99,
    totalAmount: 2499.95,
    date: subMonths(new Date(), 1).toISOString(),
    party: "Creative Agency",
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
        category: "marketing",
        description: "Social Media Campaign",
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
