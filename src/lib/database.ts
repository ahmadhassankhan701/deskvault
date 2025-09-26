import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// IMPORTANT: Define the absolute path to the database file.
// We use process.cwd() to get the project root directory, which is essential
// for Node.js environments like Next.js API routes to find the file correctly.
const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}
const dbPath = path.join(dbDir, "local_db.sqlite");

// Create the connection object. This opens the connection to the database file.
// If the file does not exist, it will be created automatically.
const db = new Database(dbPath);

/**
 * Initializes the database tables if they do not already exist.
 * This function runs immediately upon the first import of this module.
 */
function initializeDatabase() {
  console.log("[DB] Checking and initializing database schema...");

  // Wrap the setup in a transaction to ensure all table creations are atomic.
  db.transaction(() => {
    // --- Table 1: Products (For your inventory/shop items) ---
    db.prepare(
      `
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK(type IN ('individual', 'sku')),
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                price REAL NOT NULL DEFAULT 0.0,
                imei TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `
    ).run();

    // --- Table 2: Partners (For partner tracking/CRM) ---
    db.prepare(
      `
            CREATE TABLE IF NOT EXISTS partners (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK(type IN ('individual', 'shop')),
                name TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                shopName TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `
    ).run();
    db.prepare(
      `
           CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                productId TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('purchase', 'sale', 'lend-out')),
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                totalAmount REAL NOT NULL,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                party TEXT NOT NULL,
                FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (party) REFERENCES partners(name) ON DELETE SET NULL
            );
        `
    ).run();
    db.prepare(
      `
           CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                category TEXT NOT NULL CHECK(category IN ('rent', 'salaries', 'utilities', 'stock', 'other')),
                description TEXT NOT NULL,
                amount REAL NOT NULL
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
