import { NextRequest, NextResponse } from "next/server";
import { createAccountType, listAccountTypes, listSubmissions } from "@/lib/store";

export async function GET() {
  const [types, submissions] = await Promise.all([listAccountTypes(), listSubmissions()]);
  return NextResponse.json({ types, submissions });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const required = Number(body?.required);
  const price = Number(body?.price);

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!Number.isInteger(required) || required < 0) {
    return NextResponse.json(
      { error: "Required quantity must be a whole number of 0 or more" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Price must be a number of 0 or more" },
      { status: 400 }
    );
  }

  const type = await createAccountType(name, required, price);
  return NextResponse.json({ type }, { status: 201 });
}
