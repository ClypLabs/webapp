// The page at https://api.clypdat.xyz/ (rewritten here in next.config.ts):
// live totals, a 30-day chart, service status, and README badges. The app's
// POST and the release mirror still work but are deliberately not listed; the
// first is a how-to for inflating the counter, the second is internal.
// Self-contained HTML - inline styles and script, no /_next assets - because
// the api host sends every path it does not know to a JSON 404, and a page
// that needed the site's bundles would have to carve out exceptions for them.

const badgeUrl = (name: string) =>
  `https://img.shields.io/endpoint?url=${encodeURIComponent(`https://api.clypdat.xyz/v1/badges/${name}`)}`;
const BADGES = ["clips", "gameplay", "downloads"];

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
    --text:#e9eef4; --muted:#8a94a3; --faint:#5b6472; --accent:#34d399; --bad:#f87171; }
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
  h2 { font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:var(--faint); margin:0 0 12px; font-weight:600; }
  .lead { color:var(--muted); margin:0; max-width:560px; }
  .status { display:inline-flex; align-items:center; gap:8px; margin-top:18px; font-size:13px; color:var(--muted); }
  .status .sd { width:8px; height:8px; border-radius:50%; background:var(--faint); }
  .status.ok .sd { background:var(--accent); }
  .status.bad .sd { background:var(--bad); }
  .stats { margin:44px 0 12px; position:relative; display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
  @media (max-width:640px) { .stats { grid-template-columns:1fr; } }
  .stat { padding:20px 22px; border:1px solid var(--line); border-radius:18px; background:var(--card); }
  .stats .live { position:absolute; top:-34px; right:0; }
  .stat .n { font-size:32px; font-weight:700; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
  .stat .l { color:var(--muted); font-size:14px; }
  .live { display:inline-flex; align-items:center; gap:8px; font-size:11px; letter-spacing:.16em; text-transform:uppercase;
    color:var(--accent); border:1px solid rgba(52,211,153,.25); background:rgba(52,211,153,.07); border-radius:999px; padding:4px 10px; }
  .dot { width:6px; height:6px; border-radius:50%; background:var(--accent); animation:p 2.6s ease-in-out infinite; }
  @keyframes p { 50% { opacity:.35; } }
  @media (prefers-reduced-motion: reduce) { .dot { animation:none; } }
  .panel { margin-top:12px; padding:20px 22px; border:1px solid var(--line); border-radius:18px; background:var(--card); }
  .panel-head { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
  .panel-head .sum { color:var(--muted); font-size:13px; }
  #chart { width:100%; height:140px; display:block; }
  #chart rect { fill:rgba(52,211,153,.55); }
  #chart rect.today { fill:var(--accent); }
  #chart rect:hover { fill:#6ee7b7; }
  .axis { display:flex; justify-content:space-between; color:var(--faint); font-size:12px; margin-top:8px; }
  code { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size:13px; }
  .json { color:var(--muted); font-size:14px; margin:14px 0 0; }
  .badges { display:grid; gap:10px; }
  /* Badge, snippet, button - the snippet column takes what is left and cuts off
     with an ellipsis; Copy puts the whole line on the clipboard regardless. */
  .badge-row { display:grid; grid-template-columns:auto minmax(0, 1fr) auto; align-items:center; gap:12px; }
  .badge-row img { height:20px; }
  .badge-row code { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#cbd5e1; background:rgba(0,0,0,.35);
    border:1px solid var(--line); border-radius:8px; padding:6px 10px; }
  @media (max-width:560px) { .badge-row { grid-template-columns:minmax(0, 1fr) auto; } .badge-row img { grid-column:1 / -1; } }
  .copy { border:1px solid var(--line); background:transparent; color:var(--muted); border-radius:8px; padding:5px 10px; font:inherit; font-size:12px; cursor:pointer; }
  .copy:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
  footer { margin-top:40px; color:var(--faint); font-size:13px; display:flex; gap:16px; flex-wrap:wrap; }
</style>
</head>
<body>
<main>
  <a class="brand" href="https://www.clypdat.xyz/"><img src="https://www.clypdat.xyz/logo.svg" alt="">ClypDat</a>
  <h1>ClypDat <span>API</span></h1>
  <p class="lead">Live totals from every copy of ClypDat: each clip, auto-clip and full session saved, and how much gameplay they hold. Only the numbers are sent, never the clips.</p>
  <a class="status" id="status" href="/v1/status"><span class="sd"></span><span id="status-text">Checking services&hellip;</span></a>

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
    <div class="stat">
      <div class="n" id="downloads">&ndash;</div>
      <div class="l" id="downloads-label">downloads from clypdat.xyz</div>
    </div>
  </section>

  <section class="panel" aria-label="Clips saved per day">
    <div class="panel-head"><h2 style="margin:0">Last 30 days</h2><span class="sum" id="history-sum"></span></div>
    <svg id="chart" viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Clips saved per day, last 30 days"></svg>
    <div class="axis"><span id="axis-start"></span><span id="axis-end"></span></div>
  </section>

  <p class="json">JSON: <a href="/v1/stats/clips"><code>/v1/stats/clips</code></a> &middot; <a href="/v1/stats/clips/history"><code>/v1/stats/clips/history</code></a> &middot; <a href="/v1/stats/downloads"><code>/v1/stats/downloads</code></a> &middot; <a href="/v1/status"><code>/v1/status</code></a></p>

  <section class="panel" aria-label="README badges" style="margin-top:28px">
    <h2>README badges</h2>
    <div class="badges">
      ${BADGES.map(
        (name) => `<div class="badge-row"><img src="${badgeUrl(name)}" alt="${name} badge"><code>![${name}](${badgeUrl(name)})</code><button class="copy" type="button">Copy</button></div>`,
      ).join("\n      ")}
    </div>
  </section>

  <footer>
    <a href="https://www.clypdat.xyz/">clypdat.xyz</a>
    <a href="https://github.com/ClypLabs/ClypDat">GitHub</a>
    <a href="https://www.clypdat.xyz/privacy">Privacy</a>
  </footer>
</main>
<script>
  (function () {
    function $(id) { return document.getElementById(id); }
    // A unique query string misses the CDN's short-lived copy, so a refresh
    // right after a save shows it; other callers keep the cache.
    function get(path) {
      return fetch(path + (path.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    function plural(n, one, many) { return n === 1 ? one : many; }
    // Seconds as the largest unit that still reads naturally: 45 sec, 12 min,
    // 3.4 hours, then whole hours with separators once it is in the hundreds.
    function duration(s) {
      if (s < 60) return [String(Math.round(s)), "sec"];
      if (s < 3600) return [String(Math.round(s / 60)), "min"];
      var h = s / 3600;
      if (h < 100) return [(Math.round(h * 10) / 10).toLocaleString("en-US"), h < 1.05 ? "hour" : "hours"];
      return [Math.round(h).toLocaleString("en-US"), "hours"];
    }

    // Never step backwards: a stale cache edge can answer with less.
    var shown = { total: 0, seconds: 0, downloads: 0 };
    function loadTotals() {
      get("/v1/stats/clips").then(function (d) {
        if (!d) return;
        if (typeof d.total === "number" && d.total >= shown.total) {
          shown.total = d.total;
          $("total").textContent = d.total.toLocaleString("en-US");
          $("total-label").textContent = plural(d.total, "clip", "clips") + " saved";
        }
        var secs = d.seconds && d.seconds.total;
        if (typeof secs === "number" && secs >= shown.seconds) {
          shown.seconds = secs;
          var parts = duration(secs);
          $("gameplay").textContent = parts[0];
          $("gameplay-label").textContent = parts[1] + " of gameplay saved";
        }
      });
      get("/v1/stats/downloads").then(function (d) {
        if (!d || typeof d.total !== "number" || d.total < shown.downloads) return;
        shown.downloads = d.total;
        $("downloads").textContent = d.total.toLocaleString("en-US");
        $("downloads-label").textContent = plural(d.total, "download", "downloads") + " from clypdat.xyz";
      });
    }

    function drawHistory() {
      get("/v1/stats/clips/history?days=30").then(function (d) {
        if (!d || !d.history || !d.history.length) return;
        var days = d.history, n = days.length, max = 1, sum = 0;
        days.forEach(function (day) { max = Math.max(max, day.total); sum += day.total; });
        var slot = 300 / n, width = slot * 0.7, svg = "";
        days.forEach(function (day, i) {
          // A sliver even for zero, so the empty days read as days, not gaps.
          var h = Math.max(1.5, (day.total / max) * 96);
          var label = day.date + ": " + day.total + " " + plural(day.total, "clip", "clips");
          svg += '<rect class="' + (i === n - 1 ? "today" : "") + '" x="' + (i * slot + (slot - width) / 2).toFixed(2) +
            '" y="' + (100 - h).toFixed(2) + '" width="' + width.toFixed(2) + '" height="' + h.toFixed(2) +
            '" rx="1"><title>' + label + '</title></rect>';
        });
        $("chart").innerHTML = svg;
        var fmt = function (iso) { return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); };
        $("axis-start").textContent = fmt(days[0].date);
        $("axis-end").textContent = "Today (UTC)";
        $("history-sum").textContent = sum.toLocaleString("en-US") + " " + plural(sum, "clip", "clips") + " in 30 days";
      });
    }

    function loadStatus() {
      get("/v1/status").then(function (d) {
        var el = $("status"), text = $("status-text");
        if (!d) { el.className = "status bad"; text.textContent = "Status unavailable"; return; }
        var down = Object.keys(d.services).filter(function (k) { return d.services[k] === "down"; });
        el.className = "status " + (down.length ? "bad" : "ok");
        var ago = Math.max(0, Math.round((Date.now() - Date.parse(d.checked_at)) / 60000));
        text.textContent = (down.length ? "Degraded: " + down.join(", ") + " unreachable" : "All systems operational") +
          " \\u00b7 checked " + (ago < 1 ? "just now" : ago + " min ago");
      });
    }

    document.querySelectorAll(".copy").forEach(function (button) {
      button.addEventListener("click", function () {
        var code = button.parentNode.querySelector("code").textContent;
        navigator.clipboard.writeText(code).then(function () {
          button.textContent = "Copied";
          setTimeout(function () { button.textContent = "Copy"; }, 1500);
        }).catch(function () {});
      });
    });

    loadTotals(); drawHistory(); loadStatus();
    // Totals are live; the chart only changes when a save lands, so it follows
    // at a slower pace. Status is fetched once - it is cached for ten minutes.
    setInterval(function () { if (document.visibilityState === "visible") loadTotals(); }, 10000);
    setInterval(function () { if (document.visibilityState === "visible") drawHistory(); }, 60000);
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
