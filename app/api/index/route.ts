// The page at https://api.clypdat.xyz/ (rewritten here in next.config.ts).
// Self-contained HTML - inline styles and script, no /_next assets - because
// the api host sends every path it does not know to a JSON 404, and a page
// that needed the site's bundles would have to carve out exceptions for them.

const endpoints = [
  {
    method: "GET",
    path: "/v1/stats/clips",
    description:
      "Clips saved with ClypDat, and the seconds of gameplay they hold - totals, and the split by clip, auto-clip and full session.",
    example: `{
  "clip": 5,
  "auto_clip": 2,
  "full_session": 1,
  "total": 8,
  "seconds": {
    "clip": 300,
    "auto_clip": 40,
    "full_session": 5400,
    "total": 5740
  }
}`,
  },
  {
    method: "POST",
    path: "/v1/stats/clips",
    description:
      "Used by the desktop app when it saves a clip, auto-clip or full session: a count per kind and the seconds they hold. Nothing else is sent or stored.",
    example: `{ "clip": 1, "clip_seconds": 60 }`,
  },
  {
    method: "GET",
    path: "/v1/releases/latest",
    description: "The current release, in the shape of GitHub's releases API. Mirrors GitHub for the in-app updater.",
    example: null,
  },
  {
    method: "GET",
    path: "/v1/releases",
    description: "Recent releases, same shape as GitHub's list endpoint.",
    example: null,
  },
];

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>ClypDat API</title>
<link rel="icon" href="https://www.clypdat.xyz/favicon.ico">
<style>
  :root { color-scheme: dark; --bg:#0a0d11; --card:rgba(255,255,255,.03); --line:rgba(255,255,255,.09);
    --text:#e9eef4; --muted:#8a94a3; --faint:#5b6472; --accent:#34d399; }
  * { box-sizing: border-box; }
  body { margin:0; background:
      radial-gradient(900px 500px at 50% -120px, rgba(16,185,129,.16), transparent),
      var(--bg);
    color:var(--text); font:15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    min-height:100vh; padding:0 20px; }
  main { max-width:760px; margin:0 auto; padding:72px 0 64px; }
  a { color:var(--accent); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .brand { display:flex; align-items:center; gap:10px; color:var(--text); font-weight:600; font-size:17px; }
  .brand img { height:16px; }
  h1 { font-size:40px; line-height:1.1; letter-spacing:-.02em; margin:28px 0 10px; }
  h1 span { background:linear-gradient(100deg,#6ee7b7,#34d399 55%,#2dd4bf); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .lead { color:var(--muted); margin:0; max-width:560px; }
  .stats { margin:36px 0 44px; position:relative; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media (max-width:560px) { .stats { grid-template-columns:1fr; } }
  .stat { padding:22px 24px; border:1px solid var(--line); border-radius:18px; background:var(--card); }
  .stats .live { position:absolute; top:-34px; right:0; }
  .stat .n { font-size:34px; font-weight:700; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
  .stat .l { color:var(--muted); font-size:14px; }
  .live { display:inline-flex; align-items:center; gap:8px; font-size:11px; letter-spacing:.16em; text-transform:uppercase;
    color:var(--accent); border:1px solid rgba(52,211,153,.25); background:rgba(52,211,153,.07); border-radius:999px; padding:4px 10px; }
  .dot { width:6px; height:6px; border-radius:50%; background:var(--accent); animation:p 2.6s ease-in-out infinite; }
  @keyframes p { 50% { opacity:.35; } }
  @media (prefers-reduced-motion: reduce) { .dot { animation:none; } }
  h2 { font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:var(--faint); margin:0 0 14px; font-weight:600; }
  .ep { border:1px solid var(--line); border-radius:16px; background:var(--card); padding:18px 20px; margin-bottom:12px; }
  .row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .m { font:600 11px/1 ui-monospace, "Cascadia Mono", Consolas, monospace; padding:5px 8px; border-radius:6px; letter-spacing:.04em; }
  .GET { color:#6ee7b7; background:rgba(52,211,153,.12); }
  .POST { color:#93c5fd; background:rgba(96,165,250,.12); }
  code, pre { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; }
  .path { font-size:14px; color:var(--text); }
  .path a { color:inherit; }
  .desc { color:var(--muted); margin:8px 0 0; font-size:14px; }
  pre { margin:12px 0 0; padding:12px 14px; border-radius:10px; background:rgba(0,0,0,.35); border:1px solid var(--line);
    color:#cbd5e1; font-size:13px; overflow-x:auto; }
  footer { margin-top:40px; color:var(--faint); font-size:13px; display:flex; gap:16px; flex-wrap:wrap; }
</style>
</head>
<body>
<main>
  <a class="brand" href="https://www.clypdat.xyz/"><img src="https://www.clypdat.xyz/logo.svg" alt="">ClypDat</a>
  <h1>ClypDat <span>API</span></h1>
  <p class="lead">Public endpoints behind the ClypDat desktop app and website. Responses are JSON; no key is needed to read them.</p>

  <section class="stats" aria-label="ClypDat totals">
    <span class="live"><span class="dot"></span>Live</span>
    <div class="stat">
      <div class="n" id="total">&ndash;</div>
      <div class="l" id="total-label">clips saved</div>
    </div>
    <div class="stat">
      <div class="n" id="gameplay">&ndash;</div>
      <div class="l" id="gameplay-label">of gameplay saved</div>
    </div>
  </section>

  <h2>Endpoints</h2>
  ${endpoints
    .map(
      (endpoint) => `<div class="ep">
    <div class="row"><span class="m ${endpoint.method}">${endpoint.method}</span>
      <code class="path">${
        endpoint.method === "GET"
          ? `<a href="${endpoint.path}">${endpoint.path}</a>`
          : endpoint.path
      }</code></div>
    <p class="desc">${escape(endpoint.description)}</p>
    ${endpoint.example ? `<pre>${escape(endpoint.example)}</pre>` : ""}
  </div>`,
    )
    .join("\n  ")}

  <footer>
    <a href="https://www.clypdat.xyz/">clypdat.xyz</a>
    <a href="https://github.com/ClypLabs/ClypDat">GitHub</a>
    <a href="https://www.clypdat.xyz/privacy">Privacy</a>
  </footer>
</main>
<script>
  (function () {
    var total = document.getElementById("total");
    var totalLabel = document.getElementById("total-label");
    var gameplay = document.getElementById("gameplay");
    var gameplayLabel = document.getElementById("gameplay-label");
    var shownTotal = 0, shownSeconds = 0;
    // Seconds as the largest unit that still reads naturally: 45 sec, 12 min,
    // 3.4 hours, then whole hours with separators once it is in the hundreds.
    function duration(s) {
      if (s < 60) return [String(Math.round(s)), "sec"];
      if (s < 3600) return [String(Math.round(s / 60)), "min"];
      var h = s / 3600;
      if (h < 100) return [(Math.round(h * 10) / 10).toLocaleString("en-US"), h < 1.05 ? "hour" : "hours"];
      return [Math.round(h).toLocaleString("en-US"), "hours"];
    }
    function load() {
      // A unique query string misses the CDN's 10s copy, so a refresh right
      // after a save shows it; other callers of the endpoint keep the cache.
      fetch("/v1/stats/clips?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d) return;
        // Never step backwards: a stale cache edge can answer with less.
        if (typeof d.total === "number" && d.total >= shownTotal) {
          shownTotal = d.total;
          total.textContent = d.total.toLocaleString("en-US");
          totalLabel.textContent = (d.total === 1 ? "clip" : "clips") + " saved";
        }
        var secs = d.seconds && d.seconds.total;
        if (typeof secs === "number" && secs >= shownSeconds) {
          shownSeconds = secs;
          var parts = duration(secs);
          gameplay.textContent = parts[0];
          gameplayLabel.textContent = parts[1] + " of gameplay saved";
        }
      }).catch(function () {});
    }
    load();
    setInterval(function () { if (document.visibilityState === "visible") load(); }, 10000);
  })();
</script>
</body>
</html>`;

export function GET() {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
