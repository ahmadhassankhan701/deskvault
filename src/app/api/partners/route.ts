import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";

// Define the Partner type
export type Partner = {
  id: string;
  type: "individual" | "shop";
  name: string;
  phone: string;
  shop_name?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

// --- GET /api/partners (Read All, exclude soft-deleted) ---
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
      whereClause += " AND name LIKE ?";
      params.push(`%${q}%`);
    }

    const stmt = db.prepare(`
      SELECT id, type, name, phone, shop_name, created_at, updated_at, deleted_at
      FROM partners
      ${whereClause}
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `);

    const partners: Partner[] = stmt.all(...params, limit, offset) as Partner[];

    // Total count for pagination
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM partners ${whereClause}
    `);
    const { count } = countStmt.get(...params) as { count: number };

    return NextResponse.json({ partners, total: count }, { status: 200 });
  } catch (error) {
    console.error("GET Partners DB error:", error);
    return NextResponse.json(
      { message: "Error fetching partners." },
      { status: 500 }
    );
  }
}

// --- POST /api/partners (Create) ---
export async function POST(request: NextRequest) {
  try {
    const { type, name, phone, shop_name } = await request.json();
    const newPartnerId = randomUUID();

    if (!type || !name || !phone) {
      return NextResponse.json(
        { message: "Missing required fields: type, name, and phone." },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      `INSERT INTO partners (id, type, name, phone, shop_name)
       VALUES (?, ?, ?, ?, ?)`
    );

    stmt.run(
      newPartnerId,
      type,
      name,
      phone,
      type === "shop" ? shop_name : null
    );

    return NextResponse.json(
      { id: newPartnerId, message: "Partner added successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Partner API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error during partner creation." },
      { status: 500 }
    );
  }
}

// --- PUT /api/partners?id=... (Update) ---
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("id");

  if (!partnerId) {
    return NextResponse.json(
      { message: "Partner ID is required for update." },
      { status: 400 }
    );
  }

  try {
    const { type, name, phone, shop_name } = await request.json();

    if (!type || !name || !phone) {
      return NextResponse.json(
        { message: "Missing required fields: type, name, and phone." },
        { status: 400 }
      );
    }

    const stmt = db.prepare(
      `UPDATE partners
       SET type = ?, name = ?, phone = ?, shop_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`
    );

    const result = stmt.run(
      type,
      name,
      phone,
      type === "shop" ? shop_name : null,
      partnerId
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Partner not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Partner updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Partner API error:", error);
    return NextResponse.json(
      { message: "Internal Server Error during partner update." },
      { status: 500 }
    );
  }
}

// --- DELETE /api/partners?id=... (Soft Delete) ---
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const partnerId = url.searchParams.get("id");

  if (!partnerId) {
    return NextResponse.json(
      { message: "Partner ID is required for deletion." },
      { status: 400 }
    );
  }

  try {
    const stmt = db.prepare(
      `UPDATE partners
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`
    );
    const result = stmt.run(partnerId);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Partner not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Partner deleted successfully (soft delete)." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Partner DB error:", error);
    return NextResponse.json(
      { message: "Error deleting partner." },
      { status: 500 }
    );
  }
}
