import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";

// Define the Partner type for consistency
export type Partner = {
  id: string;
  type: "individual" | "shop";
  name: string;
  phone: string;
  shopName?: string | null;
  created_at: string;
};

// --- GET /api/partners (Read All) ---
export async function GET() {
  try {
    const stmt = db.prepare(
      "SELECT id, type, name, phone, shopName, created_at FROM partners ORDER BY name ASC"
    );
    const partners: Partner[] = stmt.all() as Partner[];
    return NextResponse.json({ partners }, { status: 200 });
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
    const data = await request.json(); // Move parsing inside try block
    const { type, name, phone, shopName } = data;
    const newPartnerId = randomUUID();

    if (!type || !name || !phone) {
      return NextResponse.json(
        { message: "Missing required fields: type, name, and phone." },
        { status: 400 }
      );
    }

    const shopNameValue = type === "shop" && shopName ? shopName : null;

    const stmt = db.prepare(
      "INSERT INTO partners (id, type, name, phone, shopName) VALUES (?, ?, ?, ?, ?)"
    );

    stmt.run(newPartnerId, type, name, phone, shopNameValue);

    return NextResponse.json(
      { id: newPartnerId, message: "Partner added successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Partner API error:", error);
    const err = error as Error;

    if (err.name === "SyntaxError" || err.message.includes("invalid json")) {
      return NextResponse.json(
        { message: "Invalid JSON payload received." },
        { status: 400 }
      );
    }

    if (err.message.includes("UNIQUE constraint failed: partners.name")) {
      return NextResponse.json(
        {
          message:
            "A partner with this name already exists. Names must be unique.",
        },
        { status: 409 }
      );
    }
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
    const data = await request.json(); // Move parsing inside try block
    const { type, name, phone, shopName } = data;

    if (!type || !name || !phone) {
      return NextResponse.json(
        { message: "Missing required fields: type, name, and phone." },
        { status: 400 }
      );
    }

    // Ensure shopName is correctly nullified if the type is not 'shop'
    const shopNameValue = type === "shop" && shopName ? String(shopName) : null;

    const stmt = db.prepare(
      "UPDATE partners SET type = ?, name = ?, phone = ?, shopName = ? WHERE id = ?"
    );
    const result = stmt.run(type, name, phone, shopNameValue, partnerId);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Partner not found or no changes made." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Partner updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Partner API error:", error);
    const err = error as Error;

    if (err.name === "SyntaxError" || err.message.includes("invalid json")) {
      return NextResponse.json(
        { message: "Invalid JSON payload received." },
        { status: 400 }
      );
    }

    if (err.message.includes("UNIQUE constraint failed: partners.name")) {
      return NextResponse.json(
        {
          message:
            "A partner with this name already exists. Names must be unique.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error during partner update." },
      { status: 500 }
    );
  }
}

// --- DELETE /api/partners?id=... (Delete) ---
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
    const stmt = db.prepare("DELETE FROM partners WHERE id = ?");
    const result = stmt.run(partnerId);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Partner not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Partner deleted successfully." },
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
