"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountType, Submission } from "@/lib/types";

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

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-mute">Account Ops</p>
          <h1 className="font-display text-2xl font-semibold text-parch sm:text-3xl">Dashboard</h1>
        </div>
        <button onClick={handleLogout} className="btn-ghost">
          Sign out
        </button>
      </header>

      <section className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-parch">Worker link</p>
          <p className="text-sm text-mute">Send this to workers. No login required.</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="rounded-md border border-line bg-ink px-3 py-2 text-sm text-gold">
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

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-parch">Account types</h2>
        {loading ? (
          <p className="mt-3 text-mute">Loading…</p>
        ) : types.length === 0 ? (
          <p className="mt-3 text-mute">No account types yet. Add one above.</p>
        ) : (
          <div className="mt-3 grid gap-3">
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
          <div className="card mt-3 overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-raised text-mute">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Worker</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Qty</th>
                    <th className="px-4 py-2.5 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="px-4 py-2.5 text-parch">{s.discordUsername}</td>
                      <td className="px-4 py-2.5 text-parch">{s.accountTypeName}</td>
                      <td className="px-4 py-2.5 text-parch">{s.quantity}</td>
                      <td className="px-4 py-2.5 text-mute">
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

function NewTypeForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [required, setRequired] = useState("");
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
        body: JSON.stringify({ name, required: Number(required) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setName("");
      setRequired("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="block text-sm text-mute" htmlFor="new-name">
          New account type
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
      <div className="sm:w-40">
        <label className="block text-sm text-mute" htmlFor="new-required">
          Required qty
        </label>
        <input
          id="new-required"
          type="number"
          min={0}
          step={1}
          className="field mt-1.5"
          value={required}
          onChange={(e) => setRequired(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary sm:w-auto" disabled={saving}>
        {saving ? "Adding…" : "Add type"}
      </button>
      {error && <p className="text-sm text-rust sm:basis-full">{error}</p>}
    </form>
  );
}

function TypeRow({ type, onChanged }: { type: AccountType; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [required, setRequired] = useState(String(type.required));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const remaining = Math.max(type.required - type.assigned, 0);

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
    <div className="card p-4">
      {editing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs text-mute">Name</label>
            <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:w-32">
            <label className="block text-xs text-mute">Required</label>
            <input
              type="number"
              min={0}
              className="field mt-1"
              value={required}
              onChange={(e) => setRequired(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => patch({ name, required: Number(required) })}
            >
              Save
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-parch">{type.name}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  type.open ? "bg-moss/15 text-moss" : "bg-rust/15 text-rust"
                }`}
              >
                {type.open ? "Open" : "Closed"}
              </span>
            </div>
            <p className="mt-1 text-sm text-mute">
              {type.assigned} assigned / {type.required} required ·{" "}
              <span className="text-parch">{remaining} remaining</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() => patch({ open: !type.open })}
            >
              {type.open ? "Close" : "Open"}
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              className="btn-ghost border-rust/40 text-rust hover:border-rust hover:text-rust"
              disabled={busy}
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rust">{error}</p>}
    </div>
  );
}
