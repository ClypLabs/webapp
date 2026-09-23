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

type SwitchControl = "pause-auto-clipping" | "disable-game-detector" | "pause-spotify" | "pause-xbox-activity" | "pause-discord-presence" | "block-update-version";
type StoredSwitch = {
  id: string; control: SwitchControl; target: string | null; reason: string;
  minVersion: string | null; maxVersion: string | null; publishedAt: string; expiresAt: string;
  cleared: boolean;
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
type SwitchDraft = {
  control: SwitchControl; target: string; reason: string;
  minVersion: string; maxVersion: string; expiresAt: string;
};

const EMPTY: Draft = {
  severity: "feature", title: "", body: "", linkLabel: "", linkUrl: "", minVersion: "", maxVersion: "", expiresAt: "",
};
const EMPTY_SWITCH: SwitchDraft = { control: "pause-auto-clipping", target: "", reason: "", minVersion: "", maxVersion: "", expiresAt: "" };
const SWITCH_LABEL: Record<SwitchControl, string> = {
  "pause-auto-clipping": "Pause auto-clipping",
  "disable-game-detector": "Disable one game detector",
  "pause-spotify": "Pause Spotify",
  "pause-xbox-activity": "Pause Xbox activity",
  "pause-discord-presence": "Pause Discord presence",
  "block-update-version": "Block one stable update",
};
const SWITCH_OPTIONS: { control: SwitchControl; name: string; hint: string }[] = [
  { control: "pause-auto-clipping", name: "Auto-clipping", hint: "Pause automatic clip saves" },
  { control: "disable-game-detector", name: "Game detector", hint: "Disable one game's detector" },
  { control: "pause-spotify", name: "Spotify", hint: "Pause the Spotify integration" },
  { control: "pause-xbox-activity", name: "Xbox activity", hint: "Pause Xbox activity updates" },
  { control: "pause-discord-presence", name: "Discord presence", hint: "Pause profile activity sharing" },
  { control: "block-update-version", name: "App update", hint: "Block a specific stable release" },
];
const GAMES = [
  { id: "cs2", name: "Counter-Strike 2" }, { id: "dota2", name: "Dota 2" },
  { id: "fortnite", name: "Fortnite" }, { id: "helldivers2", name: "Helldivers 2" },
  { id: "league", name: "League of Legends" }, { id: "overwatch", name: "Overwatch" },
];

const SEVERITY_LABEL: Record<Severity, string> = { feature: "New feature", info: "Info", critical: "Critical" };
const SEVERITY_STYLE: Record<Severity, string> = {
  feature: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  info: "bg-white/10 text-zinc-300 ring-white/15",
  critical: "bg-red-500/15 text-red-300 ring-red-500/40",
};

const SEVERITIES: { value: Severity; hint: string; dot: string; ring: string }[] = [
  { value: "feature", hint: "Pops up once, then lives on the board.", dot: "bg-teal-400", ring: "border-teal-400/60" },
  { value: "info", hint: "Pops up once. For smaller heads-ups.", dot: "bg-zinc-400", ring: "border-zinc-300/50" },
  { value: "critical", hint: "Every launch until acknowledged. Security or severe bugs only.", dot: "bg-red-400", ring: "border-red-400/70" },
];

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

// A switch rather than a native checkbox: the browser's checkbox ignores the
// page theme and looked dropped in from another site.
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 rounded-full text-xs text-zinc-400 outline-none transition-colors hover:text-zinc-200 focus-visible:outline-none">
      <span className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 group-focus-visible:shadow-[0_0_0_2px_rgba(45,212,191,0.45)] ${
        checked ? "border-teal-300/40 bg-teal-400/80" : "border-white/10 bg-white/10"}`}>
        <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full shadow-sm transition-[left,background-color] duration-200 motion-reduce:transition-none ${
          checked ? "left-[18px] bg-white" : "left-[3px] bg-zinc-400"}`} />
      </span>
      {label}
    </button>
  );
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
  const [switches, setSwitches] = useState<StoredSwitch[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [switchDraft, setSwitchDraft] = useState<SwitchDraft>(EMPTY_SWITCH);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSwitchId, setEditingSwitchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showSwitchHistory, setShowSwitchHistory] = useState(false);
  const [switchNow, setSwitchNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setSwitchNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/notices", { cache: "no-store" });
    if (!response.ok) {
      setError("Notices could not be loaded.");
      return;
    }
    const result = await response.json();
    setNotices(result.notices);
    setSwitches(result.switches ?? []);
  }, []);

  useEffect(() => {
    // Initial load only; every change below reloads explicitly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));
  const setSwitch = (key: keyof SwitchDraft) => (event: { target: { value: string } }) =>
    setSwitchDraft((current) => ({ ...current, [key]: event.target.value }));

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

  async function submitSwitch(event: FormEvent) {
    event.preventDefault();
    const targetText = switchDraft.control === "disable-game-detector" ? ` for ${switchDraft.target}`
      : switchDraft.control === "block-update-version" ? ` for version ${switchDraft.target}` : "";
    if (!window.confirm(`${editingSwitchId ? "Update" : "Publish"} ${SWITCH_LABEL[switchDraft.control]}${targetText}?\n\n${switchDraft.reason || "No reason supplied."}`)) return;
    const payload = { ...switchDraft, expiresAt: switchDraft.expiresAt ? new Date(switchDraft.expiresAt).toISOString() : "" };
    const saved = await send(editingSwitchId ? `/api/admin/notices/${editingSwitchId}` : "/api/admin/notices", editingSwitchId ? "PATCH" : "POST", payload);
    if (saved) { setSwitchDraft(EMPTY_SWITCH); setEditingSwitchId(null); }
  }

  async function clearSwitch(item: StoredSwitch) {
    if (window.confirm(`Clear ${SWITCH_LABEL[item.control]}? The app resumes it on its next policy check.`)) {
      await send(`/api/admin/notices/${item.id}`, "PATCH", { clearSwitch: true });
    }
  }

  const visible = (notices ?? []).filter((notice) => showArchived || !notice.archived);
  const isSwitchActive = (item: StoredSwitch) => !item.cleared && new Date(item.expiresAt).getTime() > switchNow;
  const activeSwitches = (switches ?? []).filter(isSwitchActive);
  const visibleSwitches = showSwitchHistory ? switches ?? [] : activeSwitches;
  // The site-wide focus outline sits 3px outside the element, where it runs into
  // the label above; fields here show focus as a border and inner glow instead.
  const input = "[color-scheme:dark] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:outline-none focus:border-teal-400/70 focus:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.45)]";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-display">Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">Everything here reaches installed apps without an update.</p>
        </div>
        <nav className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
          <a href="/admin/support" className="rounded-full px-4 py-1.5 text-zinc-400 hover:text-zinc-200">Diagnostics</a>
          {(["notices", "switches"] as const).map((key) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 ${tab === key ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
              {key === "notices" ? "Notice Board" : "Kill switches"}
            </button>
          ))}
        </nav>
      </header>

      {tab === "switches" ? (
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <form onSubmit={submitSwitch} className="min-w-0 space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div><h2 className="text-lg font-semibold">{editingSwitchId ? "Edit kill switch" : "New kill switch"}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Temporarily disable a feature in the app.</p></div>
              {editingSwitchId && <button type="button" className="text-sm text-zinc-400 hover:text-zinc-200" onClick={() => { setEditingSwitchId(null); setSwitchDraft(EMPTY_SWITCH); }}>Cancel edit</button>}
            </div>
            <fieldset className="min-w-0">
              <legend className="mb-3 text-sm font-medium text-zinc-200">Feature to disable</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SWITCH_OPTIONS.map((option) => (
                  <label key={option.control} className="relative cursor-pointer">
                    <input type="radio" name="switch-control" value={option.control} checked={switchDraft.control === option.control}
                      onChange={() => setSwitchDraft((current) => ({ ...current, control: option.control, target: "" }))}
                      className="peer sr-only" />
                    <span className="flex h-full items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3.5 transition-colors hover:border-white/25 peer-checked:border-teal-300/50 peer-checked:bg-teal-300/[0.06] peer-focus-visible:ring-2 peer-focus-visible:ring-teal-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950">
                      <span aria-hidden="true" className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${switchDraft.control === option.control ? "border-teal-300 bg-teal-300" : "border-zinc-600"}`}>
                        {switchDraft.control === option.control && <span className="h-1.5 w-1.5 rounded-full bg-teal-950" />}
                      </span>
                      <span><span className="block text-sm font-medium text-zinc-100">{option.name}</span><span className="mt-1 block text-xs leading-5 text-zinc-400">{option.hint}</span></span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {switchDraft.control === "disable-game-detector" && (
              <fieldset className="min-w-0">
                <legend className="mb-3 text-sm font-medium text-zinc-200">Game detector</legend>
                <div className="flex flex-wrap gap-2">
                  {GAMES.map((game) => <label key={game.id} className="relative cursor-pointer">
                    <input type="radio" name="switch-game" value={game.id} required checked={switchDraft.target === game.id} onChange={setSwitch("target")} className="peer sr-only" />
                    <span className="block rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-white/25 peer-checked:border-teal-300/50 peer-checked:bg-teal-300/10 peer-checked:text-teal-200 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-300">{game.name}</span>
                  </label>)}
                </div>
              </fieldset>
            )}
            {switchDraft.control === "block-update-version" && <label className="block space-y-2 text-sm"><span className="font-medium text-zinc-200">Stable version to block</span><input value={switchDraft.target} onChange={setSwitch("target")} placeholder="1.5.4" required className={input} /></label>}
            <label className="block space-y-2 text-sm"><span className="font-medium text-zinc-200">Message for users</span><textarea value={switchDraft.reason} onChange={setSwitch("reason")} maxLength={1000} rows={3} required placeholder="Explain why this feature is temporarily unavailable…" className={`${input} min-h-24 resize-y`} /><span className="block text-xs text-zinc-500">Shown alongside the disabled feature in the app.</span></label>
            <div className="space-y-5 border-t border-white/10 pt-5">
              <label className="block min-w-0 space-y-2 text-sm"><span className="font-medium text-zinc-200">Expires automatically</span><input type="datetime-local" value={switchDraft.expiresAt} onChange={setSwitch("expiresAt")} className={`${input} min-w-0 max-w-full`} /><span className="block text-xs text-zinc-500">Leave blank for 24 hours. Maximum: 7 days.</span></label>
              <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium text-zinc-200">Installed app versions <span className="font-normal text-zinc-500">· optional</span></legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs text-zinc-400">From<input value={switchDraft.minVersion} onChange={setSwitch("minVersion")} placeholder="Any version" className={input} /></label>
                  <label className="block space-y-1.5 text-xs text-zinc-400">Through<input value={switchDraft.maxVersion} onChange={setSwitch("maxVersion")} placeholder="Any version" className={input} /></label>
                </div>
              </fieldset>
            </div>
            <div className="border-l-2 border-rose-300/50 pl-4 text-sm leading-6"><p className="font-medium text-zinc-200">{SWITCH_LABEL[switchDraft.control]}{switchDraft.target && ` · ${GAMES.find((game) => game.id === switchDraft.target)?.name ?? switchDraft.target}`}</p><p className="text-zinc-400">Applies when connected apps next refresh. Clear the switch to restore access sooner.</p></div>
            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-rose-300 px-4 py-3 text-sm font-semibold text-rose-950 transition hover:bg-rose-200 disabled:cursor-wait disabled:opacity-60">{busy ? "Saving…" : editingSwitchId ? "Update switch" : "Publish switch"}</button>
          </form>
          <section className="min-w-0 space-y-4 lg:pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 text-lg font-semibold">Active switches <span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs font-medium tabular-nums text-zinc-400">{switches === null ? "—" : activeSwitches.length}</span></h2>
              <Toggle checked={showSwitchHistory} onChange={setShowSwitchHistory} label="Show history" />
            </div>
            {switches === null && <p className="text-sm text-zinc-500">Loading…</p>}
            {switches !== null && visibleSwitches.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center"><span aria-hidden="true" className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-teal-300/20 bg-teal-300/[0.06] text-teal-200">✓</span><h3 className="text-sm font-medium text-zinc-200">{showSwitchHistory ? "No switches published yet" : "No active kill switches"}</h3><p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-zinc-500">{showSwitchHistory ? "Published switches will appear here, including cleared and expired ones." : "No features are currently disabled by a kill switch."}</p></div>}
            {visibleSwitches.map((item) => { const expired = new Date(item.expiresAt).getTime() <= switchNow; return <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium text-zinc-100">{SWITCH_LABEL[item.control]}</h3><span className={`rounded-full px-2.5 py-1 text-xs ${item.cleared || expired ? "bg-white/5 text-zinc-400" : "bg-rose-300/10 text-rose-200"}`}>{item.cleared ? "Cleared" : expired ? "Expired" : "Active"}</span></div>
              {item.target && <p className="mt-1 text-xs text-zinc-400">{GAMES.find((game) => game.id === item.target)?.name ?? item.target}</p>}
              <p className="mt-3 text-xs text-zinc-500">{expired ? "Expired" : "Expires"} {new Date(item.expiresAt).toLocaleString()}</p>
              <p className="mt-3 text-sm text-zinc-300">{item.reason}</p>
              {(item.minVersion || item.maxVersion) && <p className="mt-2 text-xs text-zinc-500">Installed versions: {item.minVersion ?? "any"} - {item.maxVersion ?? "any"}</p>}
              {!item.cleared && !expired && <div className="mt-3 flex gap-4 text-sm"><button type="button" disabled={busy} className="text-zinc-300 hover:text-white" onClick={() => { setEditingSwitchId(item.id); setSwitchDraft({ control: item.control, target: item.target ?? "", reason: item.reason, minVersion: item.minVersion ?? "", maxVersion: item.maxVersion ?? "", expiresAt: toLocalInput(item.expiresAt) }); window.scrollTo({ top: 0 }); }}>Edit</button><button type="button" disabled={busy} className="text-zinc-400 hover:text-zinc-200" onClick={() => clearSwitch(item)}>Clear</button></div>}
            </article>; })}
          </section>
        </div>
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

            {/* Cards rather than a <select>: the native dropdown opens in the
                OS's light theme, and each choice needs its consequence spelled
                out next to it anyway. */}
            <fieldset className="space-y-1.5 text-sm">
              <legend className="mb-1.5 text-zinc-400">Severity</legend>
              <div role="radiogroup" aria-label="Severity" className="grid gap-2 sm:grid-cols-3">
                {SEVERITIES.map((option) => {
                  const selected = draft.severity === option.value;
                  return (
                    <button key={option.value} type="button" role="radio" aria-checked={selected}
                      onClick={() => setDraft((current) => ({ ...current, severity: option.value }))}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${selected
                        ? `${option.ring} bg-white/[0.06]`
                        : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/[0.03]"}`}>
                      <span className="flex items-center gap-2 font-medium text-zinc-100">
                        <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                        {SEVERITY_LABEL[option.value]}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-400">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
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
                <span className="text-zinc-400">Link</span>
                <input value={draft.linkUrl} onChange={set("linkUrl")} placeholder="https://www.clypdat.xyz/..." className={input} />
                <span className="block text-xs text-zinc-500">clypdat.xyz, github.com/ClypLabs or the ClypDat Discord only.</span>
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
              <Toggle checked={showArchived} onChange={setShowArchived} label="Show taken down" />
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
