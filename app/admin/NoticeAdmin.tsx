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
const GAME_IDS = ["cs2", "dota2", "fortnite", "helldivers2", "league", "overwatch"];

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
          {(["notices", "switches"] as const).map((key) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 ${tab === key ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
              {key === "notices" ? "Notice Board" : "Kill switches"}
            </button>
          ))}
        </nav>
      </header>

      {tab === "switches" ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={submitSwitch} className="space-y-4 rounded-3xl border border-red-400/20 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-semibold">{editingSwitchId ? "Edit kill switch" : "New kill switch"}</h2>
                <p className="mt-1 text-xs text-zinc-500">Required expiry defaults to 24 hours. Maximum is seven days.</p></div>
              {editingSwitchId && <button type="button" className="text-sm text-zinc-400 hover:text-zinc-200" onClick={() => { setEditingSwitchId(null); setSwitchDraft(EMPTY_SWITCH); }}>Cancel edit</button>}
            </div>
            <label className="block space-y-1.5 text-sm"><span className="text-zinc-400">Control</span>
              <select value={switchDraft.control} onChange={setSwitch("control")} className={input}>
                {(Object.keys(SWITCH_LABEL) as SwitchControl[]).map((control) => <option key={control} value={control}>{SWITCH_LABEL[control]}</option>)}
              </select>
            </label>
            {(switchDraft.control === "disable-game-detector" || switchDraft.control === "block-update-version") &&
              <label className="block space-y-1.5 text-sm"><span className="text-zinc-400">{switchDraft.control === "block-update-version" ? "Stable version" : "Game detector"}</span>
                {switchDraft.control === "disable-game-detector" ? <select value={switchDraft.target} onChange={setSwitch("target")} className={input}><option value="">Pick a game</option>{GAME_IDS.map((id) => <option key={id}>{id}</option>)}</select>
                  : <input value={switchDraft.target} onChange={setSwitch("target")} placeholder="1.5.4" className={input} />}
              </label>}
            <label className="block space-y-1.5 text-sm"><span className="text-zinc-400">Reason shown in app</span><textarea value={switchDraft.reason} onChange={setSwitch("reason")} maxLength={1000} rows={4} required className={input} /></label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1.5 text-sm"><span className="text-zinc-400">Installed from</span><input value={switchDraft.minVersion} onChange={setSwitch("minVersion")} placeholder="any" className={input} /></label>
              <label className="block space-y-1.5 text-sm"><span className="text-zinc-400">Installed through</span><input value={switchDraft.maxVersion} onChange={setSwitch("maxVersion")} placeholder="any" className={input} /></label>
              <label className="block space-y-1.5 text-sm"><span className="text-zinc-400">Expires</span><input type="datetime-local" value={switchDraft.expiresAt} onChange={setSwitch("expiresAt")} className={input} /></label>
            </div>
            <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-100">Affected capability: <strong>{SWITCH_LABEL[switchDraft.control]}</strong>{switchDraft.target && ` (${switchDraft.target})`}. Active clients poll within one minute and disable it immediately.</div>
            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-red-300 px-4 py-3 text-sm font-semibold text-red-950 transition hover:bg-red-200 disabled:cursor-wait disabled:opacity-60">{editingSwitchId ? "Update switch" : "Publish switch"}</button>
          </form>
          <section className="space-y-3"><h2 className="text-lg font-semibold">Active and expired</h2>
            {switches === null && <p className="text-sm text-zinc-500">Loading…</p>}
            {switches?.map((item) => { const expired = new Date(item.expiresAt).getTime() <= Date.now(); return <article key={item.id} className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${item.cleared || expired ? "opacity-50" : ""}`}>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500"><span className="rounded-full bg-red-400/15 px-2.5 py-0.5 text-red-300">{SWITCH_LABEL[item.control]}</span>{item.target && <span>{item.target}</span>}<span>{expired ? "expired" : item.cleared ? "cleared" : `expires ${new Date(item.expiresAt).toLocaleString()}`}</span></div>
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
