import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// IMPORTANT: Define the absolute path to the database file.
const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}
const dbPath = path.join(dbDir, "local_db.sqlite");

// Create the connection object. This opens the connection to the database file.
const db = new Database(dbPath);

/**
 * Initializes the database tables if they do not already exist.
 * This function runs immediately upon the first import of this module.
 */
function initializeDatabase() {
  console.log("[DB] Checking and initializing database schema...");

  db.transaction(() => {
    // --- Table 1: Products ---
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('individual', 'sku')),
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        price REAL NOT NULL DEFAULT 0.0,
        imei TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );
      `
    ).run();

    // --- Table 2: Partners ---
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('individual', 'shop')),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        shop_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );
      `
    ).run();

    // --- Table 3: Transactions ---
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('purchase', 'sale', 'lend-out', 'return')),
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total_amount REAL NOT NULL,
        date DATETIME NOT NULL,
        partner_id TEXT NOT NULL,
        snapshot_partner_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL
      );
      `
    ).run();

    // --- Table 4: Expenses ---
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date DATETIME NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('rent', 'salaries', 'utilities', 'stock', 'other')),
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );
      `
    ).run();

    // --- Indexes for performance ---
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`
    ).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`
    ).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone);`
    ).run();
  })();

  console.log("[DB] Schema setup complete and connection established.");
}

// Run the setup function
initializeDatabase();

export { db };
