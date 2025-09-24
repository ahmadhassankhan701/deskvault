export type TransactionType = "purchase" | "sale" | "borrow-in" | "lend-out" | "borrow-return" | "lend-return";

export type Product = {
  id: string;
  name: string;
  stock: number;
  price: number;
  category: string;
};

export type Transaction = {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  price: number; // price per unit
  totalAmount: number;
  date: string;
  party: string; // Customer, Supplier, or other Partner
};

export type Expense = {
  id: string;
  date: string;
  category: "rent" | "salaries" | "utilities" | "marketing" | "other";
  description: string;
  amount: number;
};
