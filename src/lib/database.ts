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

  // Wrap the setup in a transaction to ensure all table creations are atomic.
  db.transaction(() => {
    // --- Table 1: Products (Name remains UNIQUE as products usually have unique SKUs/names) ---
    db.prepare(
      `
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK(type IN ('individual', 'sku')),
                name TEXT NOT NULL UNIQUE, 
                category TEXT NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                price REAL NOT NULL DEFAULT 0.0,
                imei TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `
    ).run();

    // --- Table 2: Partners (UPDATED: 'name' is no longer UNIQUE) ---
    db.prepare(
      `
            CREATE TABLE IF NOT EXISTS partners (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK(type IN ('individual', 'shop')),
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                shopName TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `
    ).run();

    // --- Table 3: Transactions (Now correctly using partnerId and including created_at) ---
    db.prepare(
      `
           CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                productId TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('purchase', 'sale', 'lend-out', 'return')),
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                totalAmount REAL NOT NULL,
                date DATETIME NOT NULL,
                party TEXT NOT NULL,
                partnerId TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (partnerId) REFERENCES partners(id) ON DELETE SET NULL
            );
        `
    ).run();

    // --- Table 4: Expenses (Now correctly including created_at) ---
    db.prepare(
      `
           CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                date DATETIME NOT NULL,
                category TEXT NOT NULL CHECK(category IN ('rent', 'salaries', 'utilities', 'stock', 'other')),
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `
    ).run();
    console.log("[DB] Schema setup complete and connection established.");
  })(); // Immediately execute the transaction function
}

// Run the setup function
initializeDatabase();

// Export the connected database object. All API routes will import this to interact with SQLite.
export { db };
