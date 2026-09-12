import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { addSubmission, getAccountType, releaseQuantity, reserveQuantity } from "@/lib/store";
import { Submission } from "@/lib/types";

function isValidDiscordUsername(name: string): boolean {
  // Loose check: 2-32 chars, discord usernames allow letters, numbers, . and _
  return /^[a-z0-9._]{2,32}$/i.test(name) || (name.length >= 2 && name.length <= 37);
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const discordUsername = typeof body?.discordUsername === "string" ? body.discordUsername.trim() : "";
  const accountTypeId = typeof body?.accountTypeId === "string" ? body.accountTypeId : "";
  const quantity = Number(body?.quantity);

  if (!discordUsername || !isValidDiscordUsername(discordUsername)) {
    return NextResponse.json({ error: "Enter a valid Discord username" }, { status: 400 });
  }
  if (!accountTypeId) {
    return NextResponse.json({ error: "Choose an account type" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
  }

  const type = await getAccountType(accountTypeId);
  if (!type) {
    return NextResponse.json({ error: "That account type no longer exists" }, { status: 404 });
  }

  const reservation = await reserveQuantity(accountTypeId, quantity);
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.reason }, { status: 400 });
  }

  const total = Math.round(type.price * quantity * 100) / 100;

  const submission: Submission = {
    id: randomUUID(),
    discordUsername,
    accountTypeId,
    accountTypeName: type.name,
    quantity,
    price: type.price,
    total,
    timestamp: new Date().toISOString(),
  };

  try {
    await addSubmission(submission);
  } catch (err) {
    // Roll back the reservation if we failed to persist the submission record.
    await releaseQuantity(accountTypeId, quantity);
    return NextResponse.json({ error: "Failed to save submission, please try again" }, { status: 500 });
  }

  // Fire the Discord webhook. This should never block a successful submission
  // from being confirmed to the worker, so failures here are logged only.
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "New account submission",
              color: 0xc9a24b,
              fields: [
                { name: "Worker", value: submission.discordUsername, inline: true },
                { name: "Account type", value: submission.accountTypeName, inline: true },
                { name: "Quantity", value: String(submission.quantity), inline: true },
                { name: "Price per account", value: formatMoney(submission.price), inline: true },
                { name: "Total price", value: formatMoney(submission.total), inline: true },
                { name: "Remaining after this", value: String(reservation.remaining), inline: true },
              ],
              footer: { text: new Date(submission.timestamp).toUTCString() },
              timestamp: submission.timestamp,
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Discord webhook failed", err);
    }
  }

  return NextResponse.json({ ok: true, remaining: reservation.remaining, total });
}
