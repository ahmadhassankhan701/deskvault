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
      whereClause += " AND description LIKE ?";
      params.push(`%${q}%`);
    }

    const stmt = db.prepare(`
      SELECT id, date, category, description, amount, created_at, updated_at, deleted_at
      FROM expenses
      ${whereClause}
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `);

    const expenses: Expense[] = stmt.all(...params, limit, offset) as Expense[];

    // Get total count for pagination
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM expenses ${whereClause}
    `);
    const { count } = countStmt.get(...params) as { count: number };

    return jsonResponse(true, { expenses, total: count });
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
