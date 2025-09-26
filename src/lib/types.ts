export type TransactionType = "purchase" | "sale" | "borrow-in" | "lend-out" | "borrow-return" | "lend-return";

export type Product = {
  id: string;
  type: 'individual' | 'sku';
  name: string;
  category: string;
  stock: number;
  price: number;
  imei?: string;
  barcode: string;
};

export type Partner = {
  id: string;
  type: 'individual' | 'shop';
  name: string;
  phone: string;
  shopName?: string;
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
