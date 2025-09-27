import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";

// Define the Transaction type for consistency
export type Transaction = {
  id: string;
  productId: string;
  type: "sale" | "lend-out" | "return";
  quantity: number;
  price: number; // Unit price at time of transaction
  totalAmount: number;
  date: string; // ISO date string
  party: string; // Buyer/Partner Name (for display/search)
  partnerId: string; // ID of the associated partner
  created_at: string;
};

// --- GET /api/transactions (Read All) ---
export async function GET() {
  try {
    const stmt = db.prepare(
      "SELECT id, productId, type, quantity, price, totalAmount, date, party, partnerId, created_at FROM transactions ORDER BY created_at DESC"
    );
    const transactions: Transaction[] = stmt.all() as Transaction[];
    return NextResponse.json({ transactions }, { status: 200 });
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
      totalAmount,
      date,
      party,
      partnerId,
    } = data;
    const newTransactionId = randomUUID();
    const createdAt = new Date().toISOString();

    if (
      !productId ||
      !type ||
      quantity === undefined ||
      price === undefined ||
      totalAmount === undefined ||
      !date ||
      !party ||
      !partnerId
    ) {
      return NextResponse.json(
        { message: "Missing required fields for transaction creation." },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      "INSERT INTO transactions (id, productId, type, quantity, price, totalAmount, date, party, partnerId, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    stmt.run(
      newTransactionId,
      productId,
      type,
      quantity,
      price,
      totalAmount,
      date,
      party,
      partnerId,
      createdAt
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
    const stmt = db.prepare("DELETE FROM transactions WHERE id = ?");
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
