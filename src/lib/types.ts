// --- Data Types shared between API routes and Frontend ---

export type Expense = {
  id: string;
  date: string;
  category: "rent" | "salaries" | "utilities" | "stock" | "other";
  description: string;
  amount: number;
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
};

export type Partner = {
  id: string;
  name: string;
  type: "individual" | "shop";
  phone: string;
  shop_name?: string;
  created_at: string; // DATETIME ISO string
};

export type Transaction = {
  id: string;
  productId: string;
  type: "purchase" | "sale" | "lend-out";
  quantity: number;
  price: number; // Price per unit at time of transaction (e.g., Sale Price)
  totalAmount: number;
  date: string; // DATETIME ISO string
  party: string; // Partner Name (soft foreign key to partners.name)
};
