// --- Data Types shared between API routes and Frontend ---
// Centralized shared types

export type Expense = {
  id: string;
  date: string;
  category: "rent" | "salaries" | "utilities" | "stock" | "other";
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

// Types used in InventoryPage for enriched display
export type EnrichedProduct = Product & {
  transaction?: Transaction;
  partner?: Partner;
};

export type EnrichedTransaction = Transaction & {
  product?: Product;
  partner?: Partner;
};

export type Product = {
  id: string;
  type: "individual" | "sku";
  name: string;
  category: string;
  stock: number;
  price: number; // Cost Price
  imei?: string;
  created_at: string; // DATETIME ISO string
  updated_at: string;
  deleted_at?: string | null;
};

export type Partner = {
  id: string;
  name: string;
  type: "individual" | "shop";
  phone: string;
  shop_name?: string;
  created_at: string; // DATETIME ISO string
  updated_at: string;
  deleted_at?: string | null;
};

export type Transaction = {
  id: string;
  product_id: string;
  type: "purchase" | "sale" | "lend-out" | "return";
  quantity: number;
  price: number; // Price per unit at time of transaction (e.g., Sale Price)
  total_amount: number;
  date: string; // DATETIME ISO string
  partner_id: string;
  snapshot_partner_name?: string; // store name at the time of transaction
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};
