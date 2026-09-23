"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupportReport } from "@/app/lib/support";

const button = "rounded-[3px] border border-rule-strong px-3 py-2 text-sm text-paper hover:bg-panel-2 disabled:opacity-40";

export default function SupportInbox({ initialReports, initialError }: { initialReports: SupportReport[]; initialError: string }) {
  const [reports, setReports] = useState(initialReports);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  async function refresh() {
    try {
      const response = await fetch("/api/admin/support", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Inbox unavailable");
      setReports(body.reports);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Inbox unavailable");
    } finally { setLoading(false); }
  }

  async function act(report: SupportReport, action: "download" | "resolve" | "delete") {
    if (action === "delete" && !window.confirm(`Permanently delete report ${report.id} and its diagnostic ZIP?`)) return;
    setBusy(report.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/support/${report.id}`, {
        method: action === "download" ? "GET" : action === "delete" ? "DELETE" : "PATCH",
        cache: "no-store",
        ...(action === "resolve" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: !report.resolved }) } : {}),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Action failed. Try again.");
      }
      if (action === "download") {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `clypdat-diagnostics-${report.id}.zip`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Action failed"); }
    finally { setBusy(null); }
  }

  const visible = reports.filter(report => showResolved || !report.resolved);
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <Link href="/admin" className="text-sm text-dim hover:underline">← Admin</Link>
      <header className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2.5rem,6vw,4rem)]">Diagnostic inbox</h1>
          <p className="mt-2 text-sm text-dim">Private reports sent from ClypDat. Downloads expire after 30 days.</p>
        </div>
        <button className={button} disabled={loading || busy !== null} onClick={() => { setLoading(true); setError(""); void refresh(); }}>Refresh</button>
      </header>
      <label className="mt-6 flex items-center gap-2 text-sm text-paper/80">
        <input type="checkbox" checked={showResolved} onChange={event => setShowResolved(event.target.checked)} /> Show resolved
      </label>
      {error && <p role="alert" className="mt-5 rounded-[3px] border border-rec/30 bg-rec/10 p-4 text-sm text-rec">{error}</p>}
      {loading && <p role="status" className="mt-6 text-dim">Loading reports…</p>}
      {!loading && !error && visible.length === 0 && <p className="mt-8 text-dim">No {showResolved ? "" : "open "}reports.</p>}
      <div className="mt-6 space-y-4">
        {visible.map(report => (
          <article key={report.id} className="rounded-[3px] border border-rule bg-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-paper">{report.name || report.email}</h2>
                <p className="mt-1 text-xs text-dim">{report.accountLinked ? "Linked account" : "Guest · email unverified"}</p>
                <p className="mt-1 text-sm text-dim">{report.email} · {report.createdAt.slice(0, 16).replace("T", " ")} UTC</p>
              </div>
              <span className={`rounded-[3px] px-3 py-1 text-xs ${report.resolved ? "bg-panel-2 text-dim" : "bg-saved/10 text-saved"}`}>{report.resolved ? "Resolved" : "Open"}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-paper">{report.message}</p>
            <p className="mt-4 break-all font-mono text-xs text-faint">{report.id}</p>
            <p className="mt-1 break-words text-xs text-dim">ClypDat {report.version} · Build {report.build} · {(report.bytes / 1024).toFixed(0)} KiB · Expires {report.expiresAt.slice(0, 10)} UTC</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={button} disabled={busy !== null} onClick={() => void act(report, "download")}>Download ZIP</button>
              <button className={button} disabled={busy !== null} onClick={() => void act(report, "resolve")}>{report.resolved ? "Reopen" : "Mark resolved"}</button>
              <button className={`${button} text-rec`} disabled={busy !== null} onClick={() => void act(report, "delete")}>Delete</button>
              {busy === report.id && <span role="status" className="self-center text-sm text-dim">Working…</span>}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
