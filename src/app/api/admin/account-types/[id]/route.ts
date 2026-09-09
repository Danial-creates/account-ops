import { NextRequest, NextResponse } from "next/server";
import { deleteAccountType, getAccountType, updateAccountType } from "@/lib/store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const updates: { name?: string; required?: number; open?: boolean } = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updates.name = name;
  }

  if (body?.required !== undefined) {
    const required = Number(body.required);
    if (!Number.isInteger(required) || required < 0) {
      return NextResponse.json(
        { error: "Required quantity must be a whole number of 0 or more" },
        { status: 400 }
      );
    }
    const existing = await getAccountType(params.id);
    if (existing && required < existing.assigned) {
      return NextResponse.json(
        {
          error: `Required can't be less than the ${existing.assigned} already assigned. Close the type instead if you want to stop new submissions.`,
        },
        { status: 400 }
      );
    }
    updates.required = required;
  }

  if (body?.open !== undefined) {
    updates.open = Boolean(body.open);
  }

  const type = await updateAccountType(params.id, updates);
  if (!type) {
    return NextResponse.json({ error: "Account type not found" }, { status: 404 });
  }
  return NextResponse.json({ type });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteAccountType(params.id);
  return NextResponse.json({ ok: true });
}
