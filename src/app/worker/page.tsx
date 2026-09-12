"use client";

import { useEffect, useState } from "react";
import { PublicAccountType } from "@/lib/types";

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

type Phase = "form" | "review";

export default function WorkerPage() {
  const [types, setTypes] = useState<PublicAccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [discordUsername, setDiscordUsername] = useState("");
  const [accountTypeId, setAccountTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phase, setPhase] = useState<Phase>("form");
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
  const total = selected ? Math.round(selected.price * quantity * 100) / 100 : 0;

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!discordUsername.trim()) {
      setError("Enter your Discord username");
      return;
    }
    if (!selected) {
      setError("Choose an account type");
      return;
    }
    if (quantity < 1 || quantity > selected.remaining) {
      setError(`Quantity must be between 1 and ${selected.remaining}`);
      return;
    }
    setPhase("review");
  }

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordUsername, accountTypeId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      setSuccessMsg(
        `Submitted ${quantity} × ${selected.name} for ${formatMoney(data.total)}. Remaining: ${data.remaining}.`
      );
      setQuantity(1);
      setPhase("form");
      await loadTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setPhase("form");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-5">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-gold">Account Ops</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-parch">Submit accounts</h1>
        </div>

        {phase === "form" && (
          <form onSubmit={handleReview} className="card p-5 sm:p-6">
            <label className="label" htmlFor="discord">
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

            <label className="label mt-5" htmlFor="type">
              Account type
            </label>
            {loading ? (
              <p className="mt-1.5 text-sm text-mute">Loading types…</p>
            ) : types.length === 0 ? (
              <p className="mt-1.5 rounded-md border border-line bg-ink px-3.5 py-2.5 text-sm text-mute">
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
                    {t.name} — {formatMoney(t.price)} each ({t.remaining} left)
                  </option>
                ))}
              </select>
            )}

            {selected && (
              <>
                <label className="label mt-5" htmlFor="qty">
                  Quantity (max {selected.remaining})
                </label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  max={selected.remaining}
                  inputMode="numeric"
                  className="field mt-1.5"
                  value={quantity}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setQuantity(Math.min(Math.max(v, 1), selected.remaining));
                  }}
                  required
                />

                <div className="mt-4 flex items-center justify-between rounded-md border border-line bg-ink px-3.5 py-3">
                  <span className="text-sm text-mute">
                    {quantity} × {formatMoney(selected.price)}
                  </span>
                  <span className="font-display text-lg font-semibold text-gold">
                    {formatMoney(total)}
                  </span>
                </div>
              </>
            )}

            {error && <p className="mt-4 text-sm text-rust">{error}</p>}
            {successMsg && <p className="mt-4 text-sm text-moss">{successMsg}</p>}

            <button type="submit" className="btn-primary mt-6 w-full" disabled={!selected}>
              Review order
            </button>
          </form>
        )}

        {phase === "review" && selected && (
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-parch">Confirm your submission</h2>
            <dl className="mt-4 divide-y divide-line">
              <Row label="Discord username" value={discordUsername} />
              <Row label="Account type" value={selected.name} />
              <Row label="Price per account" value={formatMoney(selected.price)} />
              <Row label="Quantity" value={String(quantity)} />
            </dl>
            <div className="mt-4 flex items-center justify-between rounded-md border border-gold/30 bg-gold/10 px-3.5 py-3">
              <span className="text-sm font-medium text-parch">Total</span>
              <span className="font-display text-xl font-semibold text-gold">{formatMoney(total)}</span>
            </div>

            {error && <p className="mt-4 text-sm text-rust">{error}</p>}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-ghost flex-1"
                disabled={submitting}
                onClick={() => setPhase("form")}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={submitting}
                onClick={handleConfirm}
              >
                {submitting ? "Submitting…" : "Confirm & submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-mute">{label}</dt>
      <dd className="wrap-anywhere text-right text-sm font-medium text-parch">{value}</dd>
    </div>
  );
}
