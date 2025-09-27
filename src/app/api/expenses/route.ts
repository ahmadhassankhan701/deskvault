import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";

// Define the Expense type, derived from the frontend schema
export type Expense = {
  id: string;
  category: "rent" | "salaries" | "utilities" | "stock" | "other";
  description: string;
  amount: number;
  // Date is stored as an ISO string in the database
  date: string;
};

// --- GET /api/expenses (Read All) ---
export async function GET() {
  try {
    // UPDATED: Removed created_at from SELECT and ORDER BY
    const stmt = db.prepare(
      "SELECT id, category, description, amount, date FROM expenses ORDER BY date DESC"
    );
    const expenses: Expense[] = stmt.all() as Expense[];
    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error) {
    console.error("GET Expenses DB error:", error);
    return NextResponse.json(
      { message: "Error fetching expenses." },
      { status: 500 }
    );
  }
}

// --- POST /api/expenses (Create) ---
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { category, description, amount, date } = data;
    const newExpenseId = randomUUID();

    // Basic validation
    if (!category || !description || amount === undefined || !date) {
      return NextResponse.json(
        { message: "Missing required expense fields." },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { message: "Amount must be a positive number." },
        { status: 400 }
      );
    }

    // NOTE: date is explicitly inserted by the frontend, overriding the DB default.
    const stmt = db.prepare(
      "INSERT INTO expenses (id, category, description, amount, date) VALUES (?, ?, ?, ?, ?)"
    );

    // date is already an ISO string from the frontend, ready for DB storage
    stmt.run(newExpenseId, category, description, amount, date);

    return NextResponse.json(
      { id: newExpenseId, message: "Expense added successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Expense API error:", error);
    const err = error as Error;

    if (err.name === "SyntaxError" || err.message.includes("invalid json")) {
      return NextResponse.json(
        { message: "Invalid JSON payload received." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal Server Error during expense creation." },
      { status: 500 }
    );
  }
}

// --- PUT /api/expenses?id=... (Update) ---
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const expenseId = url.searchParams.get("id");

  if (!expenseId) {
    return NextResponse.json(
      { message: "Expense ID is required for update." },
      { status: 400 }
    );
  }

  try {
    const { category, description, amount, date } = await request.json();

    // Basic validation
    if (!category || !description || amount === undefined || !date) {
      return NextResponse.json(
        { message: "Missing required expense fields for update." },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { message: "Amount must be a positive number." },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      "UPDATE expenses SET category = ?, description = ?, amount = ?, date = ? WHERE id = ?"
    );

    const result = stmt.run(category, description, amount, date, expenseId);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Expense not found or no changes made." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Expense updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Expense API error:", error);
    const err = error as Error;

    if (err.name === "SyntaxError" || err.message.includes("invalid json")) {
      return NextResponse.json(
        { message: "Invalid JSON payload received." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal Server Error during expense update." },
      { status: 500 }
    );
  }
}

// --- DELETE /api/expenses?id=... (Delete) ---
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const expenseId = url.searchParams.get("id");

  if (!expenseId) {
    return NextResponse.json(
      { message: "Expense ID is required for deletion." },
      { status: 400 }
    );
  }

  try {
    const stmt = db.prepare("DELETE FROM expenses WHERE id = ?");
    const result = stmt.run(expenseId);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Expense deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Expense DB error:", error);
    return NextResponse.json(
      { message: "Error deleting expense." },
      { status: 500 }
    );
  }
}
