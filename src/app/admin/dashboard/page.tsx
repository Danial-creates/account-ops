"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountType, Submission } from "@/lib/types";

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function statusOf(type: AccountType): { label: string; className: string } {
  const remaining = Math.max(type.required - type.assigned, 0);
  if (!type.open) return { label: "Closed", className: "badge-closed" };
  if (remaining <= 0) return { label: "Sold out", className: "badge-soldout" };
  return { label: "Open", className: "badge-open" };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [types, setTypes] = useState<AccountType[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerLink, setWorkerLink] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/account-types", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTypes(data.types);
      setSubmissions(data.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      setWorkerLink(`${window.location.origin}/worker`);
    }
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function copyLink() {
    navigator.clipboard.writeText(workerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const openCount = types.filter((t) => statusOf(t).label === "Open").length;
  const totalRemaining = types.reduce((sum, t) => sum + Math.max(t.required - t.assigned, 0), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gold">Account Ops</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-parch sm:text-3xl">
            Dashboard
          </h1>
        </div>
        <button onClick={handleLogout} className="btn-ghost shrink-0">
          Sign out
        </button>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Account types" value={String(types.length)} />
        <StatTile label="Currently open" value={String(openCount)} />
        <StatTile label="Total remaining" value={String(totalRemaining)} />
        <StatTile label="Submissions" value={String(submissions.length)} />
      </section>

      <section className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-parch">Worker link</p>
          <p className="text-sm text-mute">Send this to workers. No login required.</p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-ink px-3 py-2 text-sm text-gold sm:flex-none">
            {workerLink || "loading…"}
          </code>
          <button onClick={copyLink} className="btn-ghost shrink-0" disabled={!workerLink}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      {error && (
        <p className="mt-6 rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
          {error}
        </p>
      )}

      <NewTypeForm onCreated={load} />

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-parch">Account types</h2>
        {loading ? (
          <p className="mt-3 text-mute">Loading…</p>
        ) : types.length === 0 ? (
          <p className="mt-3 text-mute">No account types yet. Add one above.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {types.map((t) => (
              <TypeRow key={t.id} type={t} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-parch">Recent submissions</h2>
        {submissions.length === 0 ? (
          <p className="mt-3 text-mute">No submissions yet.</p>
        ) : (
          <div className="card mt-4 overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-raised text-mute">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Worker</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Qty</th>
                    <th className="px-4 py-2.5 font-medium">Price</th>
                    <th className="px-4 py-2.5 font-medium">Total</th>
                    <th className="px-4 py-2.5 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="max-w-[160px] truncate px-4 py-2.5 text-parch">
                        {s.discordUsername}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-parch">
                        {s.accountTypeName}
                      </td>
                      <td className="px-4 py-2.5 text-parch">{s.quantity}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-mute">
                        {formatMoney(s.price ?? 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gold">
                        {formatMoney(s.total ?? 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-mute">
                        {new Date(s.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold text-parch">{value}</p>
    </div>
  );
}

function NewTypeForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [required, setRequired] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, required: Number(required), price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setName("");
      setRequired("");
      setPrice("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-10 p-5">
      <h2 className="font-display text-lg font-semibold text-parch">New account type</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_140px_auto] sm:items-end">
        <div className="min-w-0">
          <label className="label" htmlFor="new-name">
            Name
          </label>
          <input
            id="new-name"
            className="field mt-1.5"
            placeholder="e.g. Main accounts, Botting mules"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="min-w-0">
          <label className="label" htmlFor="new-required">
            Required qty
          </label>
          <input
            id="new-required"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="field mt-1.5"
            value={required}
            onChange={(e) => setRequired(e.target.value)}
            required
          />
        </div>
        <div className="min-w-0">
          <label className="label" htmlFor="new-price">
            Price / account
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute">
              $
            </span>
            <input
              id="new-price"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              className="field pl-7"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
          {saving ? "Adding…" : "Add type"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rust">{error}</p>}
    </form>
  );
}

function TypeRow({ type, onChanged }: { type: AccountType; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [required, setRequired] = useState(String(type.required));
  const [price, setPrice] = useState(String(type.price));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const remaining = Math.max(type.required - type.assigned, 0);
  const status = statusOf(type);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/account-types/${type.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      onChanged();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${type.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/account-types/${type.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto] sm:items-end">
          <div className="min-w-0">
            <label className="label">Name</label>
            <input className="field mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="min-w-0">
            <label className="label">Required</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="field mt-1.5"
              value={required}
              onChange={(e) => setRequired(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label className="label">Price</label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute">
                $
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                className="field pl-7"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => patch({ name, required: Number(required), price: Number(price) })}
            >
              Save
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap
