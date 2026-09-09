import { NextResponse } from "next/server";
import { listAccountTypes } from "@/lib/store";
import { PublicAccountType } from "@/lib/types";

export async function GET() {
  const types = await listAccountTypes();
  const publicTypes: PublicAccountType[] = types
    .filter((t) => t.open && t.required - t.assigned > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      remaining: t.required - t.assigned,
    }));
  return NextResponse.json({ types: publicTypes });
}
