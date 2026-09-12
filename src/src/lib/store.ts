import { randomUUID } from "crypto";
import { redis } from "@/lib/kv";
import { AccountType, Submission } from "@/lib/types";

const TYPE_IDS_KEY = "account_type_ids";
const typeKey = (id: string) => `account_type:${id}`;
const assignedKey = (id: string) => `assigned:${id}`;
const SUBMISSIONS_KEY = "submissions";

// Redis may hand back hash values that look numeric (e.g. "1", "0") already
// coerced to actual numbers by the client's auto-deserialization. Comparing
// through String(...) makes the check work no matter which shape comes back.
function isOpenFlag(value: unknown): boolean {
  return String(value) === "1";
}

function toAccountType(id: string, hash: Record<string, string>, assignedRaw: unknown): AccountType {
  return {
    id,
    name: hash.name,
    required: Number(hash.required ?? 0),
    assigned: Number(assignedRaw ?? 0),
    price: Number(hash.price ?? 0),
    open: isOpenFlag(hash.open),
    createdAt: hash.createdAt ?? "",
  };
}

export async function listAccountTypes(): Promise<AccountType[]> {
  const ids = (await redis.smembers(TYPE_IDS_KEY)) as string[];
  if (!ids || ids.length === 0) return [];

  const types = await Promise.all(
    ids.map(async (id) => {
      const [hash, assignedRaw] = await Promise.all([
        redis.hgetall<Record<string, string>>(typeKey(id)),
        redis.get<number | string>(assignedKey(id)),
      ]);
      if (!hash || !hash.name) return null;
      return toAccountType(id, hash, assignedRaw);
    })
  );

  return types
    .filter((t): t is AccountType => t !== null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createAccountType(
  name: string,
  required: number,
  price: number
): Promise<AccountType> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await redis.sadd(TYPE_IDS_KEY, id);
  await redis.hset(typeKey(id), {
    name,
    required: String(required),
    price: String(price),
    open: "1",
    createdAt,
  });
  await redis.set(assignedKey(id), 0);
  return { id, name, required, assigned: 0, price, open: true, createdAt };
}

export async function updateAccountType(
  id: string,
  updates: Partial<Pick<AccountType, "name" | "required" | "open" | "price">>
): Promise<AccountType | null> {
  const exists = await redis.sismember(TYPE_IDS_KEY, id);
  if (!exists) return null;

  const patch: Record<string, string> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.required !== undefined) patch.required = String(updates.required);
  if (updates.price !== undefined) patch.price = String(updates.price);
  if (updates.open !== undefined) patch.open = updates.open ? "1" : "0";

  if (Object.keys(patch).length > 0) {
    await redis.hset(typeKey(id), patch);
  }

  const [hash, assignedRaw] = await Promise.all([
    redis.hgetall<Record<string, string>>(typeKey(id)),
    redis.get<number | string>(assignedKey(id)),
  ]);
  if (!hash) return null;

  return toAccountType(id, hash, assignedRaw);
}

export async function deleteAccountType(id: string): Promise<void> {
  await redis.srem(TYPE_IDS_KEY, id);
  await redis.del(typeKey(id));
  await redis.del(assignedKey(id));
}

export async function getAccountType(id: string): Promise<AccountType | null> {
  const exists = await redis.sismember(TYPE_IDS_KEY, id);
  if (!exists) return null;
  const [hash, assignedRaw] = await Promise.all([
    redis.hgetall<Record<string, string>>(typeKey(id)),
    redis.get<number | string>(assignedKey(id)),
  ]);
  if (!hash || !hash.name) return null;
  return toAccountType(id, hash, assignedRaw);
}

/**
 * Atomically reserves `quantity` units of an account type. Increments first
 * (atomic on Redis), then validates and rolls back on overshoot, so two
 * concurrent submissions can never push assigned above required.
 */
export async function reserveQuantity(
  id: string,
  quantity: number
): Promise<{ ok: true; remaining: number } | { ok: false; reason: string }> {
  const type = await getAccountType(id);
  if (!type) return { ok: false, reason: "Account type not found" };
  if (!type.open) return { ok: false, reason: "This account type is closed" };

  const newAssigned = await redis.incrby(assignedKey(id), quantity);

  if (newAssigned > type.required) {
    await redis.decrby(assignedKey(id), quantity);
    const remaining = Math.max(type.required - type.assigned, 0);
    return {
      ok: false,
      reason: `Only ${remaining} remaining for this account type`,
    };
  }

  return { ok: true, remaining: type.required - newAssigned };
}

export async function releaseQuantity(id: string, quantity: number): Promise<void> {
  await redis.decrby(assignedKey(id), quantity);
}

export async function addSubmission(submission: Submission): Promise<void> {
  await redis.rpush(SUBMISSIONS_KEY, JSON.stringify(submission));
}

export async function listSubmissions(limit = 200): Promise<Submission[]> {
  const len = await redis.llen(SUBMISSIONS_KEY);
  if (!len) return [];
  const start = Math.max(0, len - limit);
  const raw = await redis.lrange<string>(SUBMISSIONS_KEY, start, len - 1);
  return raw
    .map((r) => {
      try {
        return typeof r === "string" ? (JSON.parse(r) as Submission) : (r as unknown as Submission);
      } catch {
        return null;
      }
    })
    .filter((s): s is Submission => s !== null)
    .reverse();
}
