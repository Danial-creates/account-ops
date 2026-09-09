"use client";

import { useEffect, useState } from "react";
import { PublicAccountType } from "@/lib/types";

export default function WorkerPage() {
  const [types, setTypes] = useState<PublicAccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [discordUsername, setDiscordUsername] = useState("");
  const [accountTypeId, setAccountTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadTypes() {
    setLoading(true);
    try {
      const res = await fetch("/api/account-types", { cache: "no-store" });
      const data = await res.json();
      setTypes(data.types ?? []);
      if (data.types?.length && !data.types.some((t: PublicAccountType) => t.id === accountTypeId)) {
        setAccountTypeId(data.types[0].id);
        setQuantity(1);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = types.find((t) => t.id === accountTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selected) {
      setError("Choose an account type");
      return;
    }
    if (quantity < 1 || quantity > selected.remaining) {
      setError(`Quantity must be between 1 and ${selected.remaining}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordUsername, accountTypeId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      setSuccessMsg(`Submitted ${quantity} × ${selected.name}. Remaining: ${data.remaining}.`);
      setQuantity(1);
      await loadTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm text-mute">Account Ops</p>
          <h1 className="font-display text-2xl font-semibold text-parch">Submit accounts</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <label className="block text-sm text-mute" htmlFor="discord">
            Discord username
          </label>
          <input
            id="discord"
            className="field mt-1.5"
            placeholder="yourname"
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            required
          />

          <label className="mt-5 block text-sm text-mute" htmlFor="type">
            Account type
          </label>
          {loading ? (
            <p className="mt-1.5 text-sm text-mute">Loading types…</p>
          ) : types.length === 0 ? (
            <p className="mt-1.5 rounded-md border border-line bg-ink px-3 py-2.5 text-sm text-mute">
              No account types are open right now. Check back later.
            </p>
          ) : (
            <select
              id="type"
              className="field mt-1.5"
              value={accountTypeId}
              onChange={(e) => {
                setAccountTypeId(e.target.value);
                setQuantity(1);
              }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.remaining} remaining)
                </option>
              ))}
            </select>
          )}

          {selected && (
            <>
              <label className="mt-5 block text-sm text-mute" htmlFor="qty">
                Quantity (max {selected.remaining})
              </label>
              <input
                id="qty"
                type="number"
                min={1}
                max={selected.remaining}
                className="field mt-1.5"
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setQuantity(Math.min(Math.max(v, 1), selected.remaining));
                }}
                required
              />
            </>
          )}

          {error && <p className="mt-4 text-sm text-rust">{error}</p>}
          {successMsg && <p className="mt-4 text-sm text-moss">{successMsg}</p>}

          <button
            type="submit"
            className="btn-primary mt-6 w-full"
            disabled={submitting || !selected}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </main>
  );
}
