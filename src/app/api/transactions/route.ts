import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";

// Define the Transaction type for consistency
interface Transaction {
  id: string;
  productId: string; // CamelCase for TypeScript
  type: "purchase" | "sale" | "lend-out" | "return";
  quantity: number;
  price: number;
  imei?: string | null; // CamelCase for TypeScript
  totalAmount: number; // CamelCase for TypeScript
  date: string;
  party: string;
  partnerId: string; // CamelCase for TypeScript
  created_at: string;
}
// --- GET /api/transactions (Read All) ---
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE deleted_at IS NULL";
    const params: any[] = [];

    if (q) {
      // Search differently depending on product type
      whereClause += ` AND (imei LIKE ? OR snapshot_partner_name LIKE ? OR type LIKE ?)
      )`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const stmt = db.prepare(`
      SELECT 
        id, 
        product_id AS productId,
        type, 
        quantity, 
        price, 
        imei,
        total_amount AS totalAmount,
        date, 
        snapshot_partner_name AS party, 
        partner_id AS partnerId,
        created_at
      FROM transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const transactions: Transaction[] = stmt.all(
      ...params,
      limit,
      offset
    ) as Transaction[];

    const countStmt = db.prepare(
      `SELECT COUNT(*) as count FROM transactions ${whereClause}`
    );
    const { count } = countStmt.get(...params) as { count: number };

    return NextResponse.json({ transactions, total: count }, { status: 200 });
  } catch (error) {
    console.error("GET Transactions DB error:", error);
    return NextResponse.json(
      { message: "Error fetching transactions." },
      { status: 500 }
    );
  }
}

// --- POST /api/transactions (Create) ---
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      productId,
      type,
      quantity,
      price,
      imei,
      totalAmount,
      date,
      party,
      partyPhone,
      partyShop,
      partnerId,
    } = data;
    const newTransactionId = randomUUID();

    if (
      !productId ||
      !type ||
      quantity === undefined ||
      price === undefined ||
      totalAmount === undefined ||
      imei === undefined ||
      !date
    ) {
      return NextResponse.json(
        { message: "Missing required fields for transaction creation." },
        { status: 400 }
      );
    }
    // 1. Sanitize the incoming ID.
    const sanitizedPartnerId = partnerId ? partnerId.trim() : "";

    // 2. Since the database schema allows partner_id to be NULL,
    // we set it to null for generic/walk-in transactions. This is the efficient approach.
    const partnerIdForDB =
      !sanitizedPartnerId || sanitizedPartnerId === "CUSTOMER"
        ? null
        : sanitizedPartnerId;
    const stmt = db.prepare(
      `INSERT INTO transactions (
            id, product_id, type, quantity, price,imei, total_amount, date, snapshot_partner_name, snapshot_partner_phone, snapshot_partner_shop, partner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      newTransactionId, // 1. id
      productId, // 2. product_id
      type, // 3. type
      quantity, // 4. quantity
      price, // 5. price
      imei, // 6. imei
      totalAmount, // 6. total_amount
      date, // 7. date
      party, // 8. The value (party name) is inserted into the 'snapshot_partner_name' column
      partyPhone || null, // 9. The value (party phone) is inserted into the 'snapshot_partner_phone' column
      partyShop || null, // 10. The value (party shop) is inserted into the 'snapshot_partner_shop' column
      partnerIdForDB
    );

    return NextResponse.json(
      { id: newTransactionId, message: "Transaction recorded successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Transaction API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error during transaction recording." },
      { status: 500 }
    );
  }
}
// --- PUT /api/transactions (Update) ---
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      productId,
      type,
      quantity,
      price,
      totalAmount,
      imei,
      date,
      party,
      partyPhone,
      partyShop,
      partnerId,
    } = data;

    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required for transaction update." },
        { status: 400 }
      );
    }

    // Sanitize partnerId
    const sanitizedPartnerId = partnerId ? partnerId.trim() : "";
    const partnerIdForDB =
      !sanitizedPartnerId || sanitizedPartnerId === "CUSTOMER"
        ? null
        : sanitizedPartnerId;

    const stmt = db.prepare(
      `UPDATE transactions
       SET type = ?, 
           quantity = ?, 
           price = ?, 
            imei = ?,
           total_amount = ?, 
           date = ?, 
           snapshot_partner_name = ?, 
           snapshot_partner_phone = ?, 
           snapshot_partner_shop = ?, 
           partner_id = ?
       WHERE product_id = ?`
    );

    const result = stmt.run(
      type,
      quantity,
      price,
      imei,
      totalAmount,
      date,
      party,
      partyPhone || null,
      partyShop || null,
      partnerIdForDB,
      productId
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "No transaction found for the given productId." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Transaction updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Transaction DB error:", error);
    return NextResponse.json(
      { message: "Error updating transaction." },
      { status: 500 }
    );
  }
}

// --- DELETE /api/transactions?id=... (Delete) ---
// This handles deletion of transactions, often used for correcting errors or marking lent items as returned
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const transactionId = url.searchParams.get("id");

  if (!transactionId) {
    return NextResponse.json(
      { message: "Transaction ID is required for deletion." },
      { status: 400 }
    );
  }

  try {
    const stmt = db.prepare("DELETE FROM transactions WHERE product_id = ?");
    const result = stmt.run(transactionId);
    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Transaction deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Transaction DB error:", error);
    return NextResponse.json(
      { message: "Error deleting transaction." },
      { status: 500 }
    );
  }
}
