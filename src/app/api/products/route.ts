import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { randomUUID } from "crypto";

// Define the Product type for consistency
export type Product = {
  id: string;
  type: "individual" | "sku";
  name: string;
  category: string;
  price: number;
  stock: number;
  imei?: string | null;
  created_at: string;
};

// --- GET /api/products (Read All) ---
export async function GET() {
  try {
    const stmt = db.prepare(
      "SELECT id, type, name, category, price, stock, imei, created_at FROM products ORDER BY name ASC"
    );
    const products: Product[] = stmt.all() as Product[];
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("GET Products DB error:", error);
    return NextResponse.json(
      { message: "Error fetching products." },
      { status: 500 }
    );
  }
}

// --- POST /api/products (Create) ---
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { type, name, category, price, stock, imei } = data;
    const newProductId = randomUUID();
    const createdAt = new Date().toISOString();

    if (
      !type ||
      !name ||
      !category ||
      price === undefined ||
      stock === undefined
    ) {
      return NextResponse.json(
        { message: "Missing required fields for product creation." },
        { status: 400 }
      );
    }

    const imeiValue = type === "individual" && imei ? imei : null;

    const stmt = db.prepare(
      "INSERT INTO products (id, type, name, category, price, stock, imei, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    stmt.run(
      newProductId,
      type,
      name,
      category,
      price,
      stock,
      imeiValue,
      createdAt
    );

    return NextResponse.json(
      { id: newProductId, message: "Product added successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Product API error:", error);
    const err = error as Error;

    if (err.message.includes("UNIQUE constraint failed: products.name")) {
      return NextResponse.json(
        { message: "A product with this name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error during product creation." },
      { status: 500 }
    );
  }
}

// --- PUT /api/products?id=... (Update) ---
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("id");

  if (!productId) {
    return NextResponse.json(
      { message: "Product ID is required for update." },
      { status: 400 }
    );
  }

  try {
    const data = await request.json();
    const { type, name, category, price, stock, imei } = data;

    if (
      !type ||
      !name ||
      !category ||
      price === undefined ||
      stock === undefined
    ) {
      return NextResponse.json(
        { message: "Missing required fields for product update." },
        { status: 400 }
      );
    }

    const imeiValue = type === "individual" && imei ? imei : null;

    const stmt = db.prepare(
      "UPDATE products SET type = ?, name = ?, category = ?, price = ?, stock = ?, imei = ? WHERE id = ?"
    );
    const result = stmt.run(
      type,
      name,
      category,
      price,
      stock,
      imeiValue,
      productId
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Product not found or no changes made." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Product updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Product API error:", error);
    const err = error as Error;

    if (err.message.includes("UNIQUE constraint failed: products.name")) {
      return NextResponse.json(
        { message: "A product with this name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error during product update." },
      { status: 500 }
    );
  }
}

// --- DELETE /api/products?id=... (Delete) ---
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("id");

  if (!productId) {
    return NextResponse.json(
      { message: "Product ID is required for deletion." },
      { status: 400 }
    );
  }

  try {
    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    const result = stmt.run(productId);

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    // Optionally delete related transactions (cascading delete if foreign keys are set up, but safer to delete manually here)
    const deleteTransactionsStmt = db.prepare(
      "DELETE FROM transactions WHERE productId = ?"
    );
    deleteTransactionsStmt.run(productId);

    return NextResponse.json(
      { message: "Product and related transactions deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Product DB error:", error);
    return NextResponse.json(
      { message: "Error deleting product." },
      { status: 500 }
    );
  }
}
