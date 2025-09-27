import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";
import { Expense } from "@/lib/types";

// --- Helper Response ---
function jsonResponse(
  success: boolean,
  data: any = null,
  message: string = ""
) {
  return NextResponse.json({ success, data, message });
}

// --- GET /api/expenses ---
export async function GET() {
  try {
    const stmt = db.prepare(`
      SELECT id, date, category, description, amount, created_at, updated_at, deleted_at
      FROM expenses
      WHERE deleted_at IS NULL
      ORDER BY date DESC
    `);
    const expenses: Expense[] = stmt.all() as Expense[];
    return jsonResponse(true, expenses);
  } catch (error) {
    console.error("GET Expenses DB error:", error);
    return jsonResponse(false, null, "Error fetching expenses.");
  }
}

// --- POST /api/expenses ---
export async function POST(request: NextRequest) {
  try {
    const { category, description, amount, date } = await request.json();
    const id = randomUUID();
    const now = new Date().toISOString();

    if (!category || !description || amount === undefined || !date) {
      return jsonResponse(false, null, "Missing required expense fields.");
    }
    if (typeof amount !== "number" || amount <= 0) {
      return jsonResponse(false, null, "Amount must be a positive number.");
    }

    const stmt = db.prepare(`
      INSERT INTO expenses (id, category, description, amount, date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, category, description, amount, date, now, now);

    return jsonResponse(true, { id }, "Expense added successfully.");
  } catch (error) {
    console.error("POST Expense API error:", error);
    return jsonResponse(
      false,
      null,
      "Internal Server Error during expense creation."
    );
  }
}

// --- PUT /api/expenses?id=... ---
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id)
    return jsonResponse(false, null, "Expense ID is required for update.");

  try {
    const { category, description, amount, date } = await request.json();
    const now = new Date().toISOString();

    if (!category || !description || amount === undefined || !date) {
      return jsonResponse(
        false,
        null,
        "Missing required expense fields for update."
      );
    }
    if (typeof amount !== "number" || amount <= 0) {
      return jsonResponse(false, null, "Amount must be a positive number.");
    }

    const stmt = db.prepare(`
      UPDATE expenses
      SET category = ?, description = ?, amount = ?, date = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(category, description, amount, date, now, id);

    if (result.changes === 0) {
      return jsonResponse(false, null, "Expense not found or no changes made.");
    }

    return jsonResponse(true, null, "Expense updated successfully.");
  } catch (error) {
    console.error("PUT Expense API error:", error);
    return jsonResponse(
      false,
      null,
      "Internal Server Error during expense update."
    );
  }
}

// --- DELETE /api/expenses?id=... ---
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id)
    return jsonResponse(false, null, "Expense ID is required for deletion.");

  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE expenses
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(now, id);

    if (result.changes === 0) {
      return jsonResponse(false, null, "Expense not found.");
    }

    return jsonResponse(true, null, "Expense deleted successfully.");
  } catch (error) {
    console.error("DELETE Expense DB error:", error);
    return jsonResponse(false, null, "Error deleting expense.");
  }
}
