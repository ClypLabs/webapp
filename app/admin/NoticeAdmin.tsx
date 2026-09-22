"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Severity = "feature" | "info" | "critical";

type StoredNotice = {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt: string | null;
  minVersion: string | null;
  maxVersion: string | null;
  link: { label: string; url: string } | null;
  archived: boolean;
  updatedAt: string;
};

type Draft = {
  severity: Severity;
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  minVersion: string;
  maxVersion: string;
  expiresAt: string;
};

const EMPTY: Draft = {
  severity: "feature", title: "", body: "", linkLabel: "", linkUrl: "", minVersion: "", maxVersion: "", expiresAt: "",
};

const SEVERITY_LABEL: Record<Severity, string> = { feature: "New feature", info: "Info", critical: "Critical" };
const SEVERITY_STYLE: Record<Severity, string> = {
  feature: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  info: "bg-white/10 text-zinc-300 ring-white/15",
  critical: "bg-red-500/15 text-red-300 ring-red-500/40",
};

// <input type="datetime-local"> speaks local time without a zone.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function draftFrom(notice: StoredNotice): Draft {
  return {
    severity: notice.severity,
    title: notice.title,
    body: notice.body,
    linkLabel: notice.link?.label ?? "",
    linkUrl: notice.link?.url ?? "",
    minVersion: notice.minVersion ?? "",
    maxVersion: notice.maxVersion ?? "",
    expiresAt: toLocalInput(notice.expiresAt),
  };
}

function Pill({ severity }: { severity: Severity }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${SEVERITY_STYLE[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export default function NoticeAdmin() {
  const [tab, setTab] = useState<"notices" | "switches">("notices");
  const [notices, setNotices] = useState<StoredNotice[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/notices", { cache: "no-store" });
    if (!response.ok) {
      setError("Notices could not be loaded.");
      return;
    }
    setNotices((await response.json()).notices);
  }, []);

  useEffect(() => {
    // Initial load only; every change below reloads explicitly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  async function send(url: string, method: "POST" | "PATCH", body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "That did not save.");
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const verb = editingId ? "Update" : "Publish";
    const reach = draft.severity === "critical"
      ? "It opens on every app it applies to, each launch, until the user acknowledges it."
      : "It opens once on every app it applies to within a few minutes.";
    if (!window.confirm(`${verb} "${draft.title}"?\n\n${reach}`)) return;
    const payload = { ...draft, expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : "" };
    const saved = editingId
      ? await send(`/api/admin/notices/${editingId}`, "PATCH", payload)
      : await send("/api/admin/notices", "POST", payload);
    if (saved) {
      setDraft(EMPTY);
      setEditingId(null);
    }
  }

  async function archive(notice: StoredNotice, archived: boolean) {
    const question = archived
      ? `Take "${notice.title}" down? Apps stop showing it on their next check.`
      : `Put "${notice.title}" back up? Apps that already dismissed it will not show it again.`;
    if (window.confirm(question)) await send(`/api/admin/notices/${notice.id}`, "PATCH", { archived });
  }

  const visible = (notices ?? []).filter((notice) => showArchived || !notice.archived);
  const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-400/60";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-display">Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">Everything here reaches installed apps without an update.</p>
        </div>
        <nav className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
          {(["notices", "switches"] as const).map((key) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 ${tab === key ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
              {key === "notices" ? "Notice Board" : "Kill switches"}
            </button>
          ))}
        </nav>
      </header>

      {tab === "switches" ? (
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-sm text-zinc-400">
          Not built yet. The notice feed already carries an empty <code className="text-zinc-300">flags</code> object,
          so kill switches can be added here without changing how apps fetch or verify it.
        </section>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? "Edit notice" : "New notice"}</h2>
              {editingId && (
                <button type="button" className="text-sm text-zinc-400 hover:text-zinc-200"
                  onClick={() => { setEditingId(null); setDraft(EMPTY); }}>
                  Cancel edit
                </button>
              )}
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Severity</span>
              <select value={draft.severity} onChange={set("severity")} className={input}>
                <option value="feature">New feature - shows once</option>
                <option value="info">Info - shows once</option>
                <option value="critical">Critical - shows every launch until acknowledged</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Title</span>
              <input value={draft.title} onChange={set("title")} maxLength={120} required className={input} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-zinc-400">Body (Markdown: headings, bullets, **bold**)</span>
              <textarea value={draft.body} onChange={set("body")} maxLength={4000} required rows={9} className={input} />
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <label className="block space-y-1.5 text-sm">
                <span className="text-zinc-400">Link label</span>
                <input value={draft.linkLabel} onChange={set("linkLabel")} placeholder="Read more" maxLength={40} className={input} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-zinc-400">Link (clypdat.xyz, github.com/ClypLabs or the Discord)</span>
                <input value={draft.linkUrl} onChange={set("linkUrl")} placeholder="https://www.clypdat.xyz/..." className={input} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1.5 text-sm">
                <span className="text-zinc-400">From version</span>
                <input value={draft.minVersion} onChange={set("minVersion")} placeholder="any" className={input} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-zinc-400">Up to version</span>
                <input value={draft.maxVersion} onChange={set("maxVersion")} placeholder="any" className={input} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-zinc-400">Expires</span>
                <input type="datetime-local" value={draft.expiresAt} onChange={set("expiresAt")} className={input} />
              </label>
            </div>

            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full rounded-full bg-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60">
              {editingId ? "Update notice" : "Publish notice"}
            </button>

            <div className="rounded-2xl border border-white/10 bg-[#111920] p-5">
              <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Preview</p>
              <div className="flex items-center gap-2"><Pill severity={draft.severity} /></div>
              <h3 className="mt-3 text-lg font-semibold text-zinc-100">{draft.title || "Title"}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{draft.body || "Body"}</p>
              {draft.linkUrl && (
                <span className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-200">
                  {draft.linkLabel || "Read more"}
                </span>
              )}
            </div>
          </form>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Published</h2>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
                Show taken down
              </label>
            </div>
            {notices === null && <p className="text-sm text-zinc-500">Loading…</p>}
            {notices !== null && visible.length === 0 && <p className="text-sm text-zinc-500">Nothing published.</p>}
            {visible.map((notice) => (
              <article key={notice.id}
                className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${notice.archived ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <Pill severity={notice.severity} />
                  <span>{new Date(notice.publishedAt).toLocaleString()}</span>
                  {(notice.minVersion || notice.maxVersion) && (
                    <span>v{notice.minVersion ?? "any"} - v{notice.maxVersion ?? "any"}</span>
                  )}
                  {notice.expiresAt && <span>expires {new Date(notice.expiresAt).toLocaleString()}</span>}
                  {notice.archived && <span className="text-zinc-400">taken down</span>}
                </div>
                <h3 className="mt-2 font-semibold text-zinc-100">{notice.title}</h3>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-400">{notice.body}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <button type="button" disabled={busy} className="text-zinc-300 hover:text-white"
                    onClick={() => { setEditingId(notice.id); setDraft(draftFrom(notice)); window.scrollTo({ top: 0 }); }}>
                    Edit
                  </button>
                  <button type="button" disabled={busy} className="text-zinc-400 hover:text-zinc-200"
                    onClick={() => archive(notice, !notice.archived)}>
                    {notice.archived ? "Put back up" : "Take down"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
