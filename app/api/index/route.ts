// The page at https://api.clypdat.xyz/ (rewritten here in next.config.ts):
// live totals, a 30-day chart, service status, and README badges. The app's
// POST and the release mirror still work but are deliberately not listed; the
// first is a how-to for inflating the counter, the second is internal.
// Self-contained HTML - inline styles and script, no /_next assets - because
// the api host sends every path it does not know to a JSON 404, and a page
// that needed the site's bundles would have to carve out exceptions for them.
// The one exception is /fonts (next.config.ts), so the page can use the
// site's own Archivo and JetBrains Mono without a request to another origin.

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
<meta name="description" content="Live totals from every copy of ClypDat: clips saved and gameplay saved.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://api.clypdat.xyz/">
<meta property="og:site_name" content="ClypDat">
<meta property="og:title" content="ClypDat API">
<meta property="og:description" content="Live totals from every copy of ClypDat: clips saved and gameplay saved.">
<meta property="og:image" content="https://api.clypdat.xyz/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ClypDat clips saved and gameplay saved totals">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://api.clypdat.xyz/og.png">
<meta name="theme-color" content="#0a0c0e">
<link rel="icon" href="https://www.clypdat.xyz/favicon.ico">
<link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>
  /* The site's broadcast look, rebuilt inline: ink, paper, grey rules, tally
     red for anything live, saved green for a healthy status. The two faces are
     the same files the site uses, served from this host's /fonts so nothing is
     fetched from another origin. */
  @font-face { font-family:"Archivo"; src:url("/fonts/archivo-latin.woff2") format("woff2");
    font-weight:100 900; font-stretch:62% 125%; font-display:swap; }
  @font-face { font-family:"JetBrains Mono"; src:url("/fonts/jetbrains-mono-latin.woff2") format("woff2");
    font-weight:100 800; font-display:swap; }
  :root { color-scheme:dark; --ink:#0a0c0e; --panel:#101316; --panel-2:#161a1e; --rule:#22272c; --rule-strong:#343b42;
    --paper:#eceef0; --dim:#9aa3ab; --faint:#5f6870; --rec:#ff4136; --saved:#3ddc84;
    --mono:"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ink); color:var(--paper);
    font:15px/1.6 "Archivo", ui-sans-serif, system-ui, "Segoe UI", sans-serif; min-height:100vh; }
  a { color:var(--paper); text-decoration:underline; text-decoration-color:var(--rule-strong); text-underline-offset:4px; }
  a:hover { text-decoration-color:var(--paper); }
  :where(a, button):focus-visible { outline:2px solid var(--paper); outline-offset:3px; }
  .slate { font-family:var(--mono); font-size:11px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); }

  .bar { border-bottom:1px solid var(--rule); }
  .bar-in { max-width:960px; margin:0 auto; height:56px; padding:0 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .brand { display:flex; align-items:center; gap:10px; color:var(--paper); text-decoration:none; font-weight:700; font-size:17px; font-stretch:87%; }
  .brand img { width:28px; height:16px; }

  main { max-width:960px; margin:0 auto; padding:48px 20px 64px; }
  .chapter { display:flex; align-items:center; gap:12px; }
  .chapter .mark { width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-top:7px solid var(--rec); }
  .chapter .rule { flex:1; height:1px; background:var(--rule); }
  h1 { font-stretch:62%; font-weight:800; text-transform:uppercase; line-height:.86; letter-spacing:-.005em;
    font-size:clamp(56px, 12vw, 112px); margin:32px 0 20px; color:#f4f5f6; }
  .lead { color:var(--dim); margin:0; max-width:600px; font-size:17px; }
  /* Styled on .status itself: the script below replaces the link's className
     with "status ok" or "status bad" once the check lands. */
  .status { display:inline-flex; align-items:center; gap:10px; margin-top:20px; text-decoration:none;
    font-family:var(--mono); font-size:11px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--dim); }
  .status .sd { width:8px; height:8px; border-radius:50%; background:var(--faint); }
  .status.ok .sd { background:var(--saved); }
  .status.bad .sd { background:var(--rec); }
  .status:hover #status-text { color:var(--paper); }

  .stats-head { display:flex; align-items:center; justify-content:space-between; margin:48px 0 12px; }
  .live { display:inline-flex; align-items:center; gap:8px; color:var(--dim); }
  .dot { width:8px; height:8px; border-radius:50%; background:var(--rec); animation:tally 1s steps(1, end) infinite; }
  /* A tally light blinks; it does not fade. */
  @keyframes tally { 50% { opacity:.2; } }
  @media (prefers-reduced-motion: reduce) { .dot { animation:none; } }
  .stats { display:grid; grid-template-columns:repeat(3, 1fr); border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); }
  .stat { padding:22px 20px 20px 0; }
  .stat + .stat { border-left:1px solid var(--rule); padding-left:20px; }
  @media (max-width:640px) { .stats { grid-template-columns:1fr; } .stat + .stat { border-left:0; border-top:1px solid var(--rule); padding-left:0; } }
  .stat .n { font-stretch:62%; font-weight:800; font-size:56px; line-height:1; font-variant-numeric:tabular-nums; color:#f4f5f6; }
  .stat .l { margin-top:10px; }

  .panel { margin-top:48px; }
  .panel-head { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap;
    padding-bottom:12px; border-bottom:1px solid var(--rule); margin-bottom:16px; }
  .panel-head .sum { color:var(--dim); font-size:13px; }
  #chart { width:100%; height:140px; display:block; }
  /* Every day sits on a full-height track; the busiest day is the one bar in
     paper, and today is outlined rather than filled. */
  #chart .track { fill:var(--panel); }
  #chart .bar { fill:var(--rule-strong); }
  #chart .peak .bar { fill:var(--paper); }
  #chart .today .track { stroke:var(--dim); stroke-width:1; }
  #chart g:hover .bar { fill:var(--faint); }
  #chart g.peak:hover .bar { fill:#fff; }
  .axis { display:flex; justify-content:space-between; margin-top:10px; }
  code { font-family:var(--mono); font-size:13px; }
  .json { margin:28px 0 0; color:var(--dim); font-size:14px; }
  .badges { display:grid; }
  /* Badge, snippet, button - the snippet column takes what is left and cuts off
     with an ellipsis; Copy puts the whole line on the clipboard regardless. */
  .badge-row { display:grid; grid-template-columns:auto minmax(0, 1fr) auto; align-items:center; gap:12px;
    padding:12px 0; border-bottom:1px solid var(--rule); }
  .badge-row img { height:20px; }
  .badge-row code { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dim); background:var(--panel);
    border:1px solid var(--rule); padding:6px 10px; }
  @media (max-width:560px) { .badge-row { grid-template-columns:minmax(0, 1fr) auto; } .badge-row img { grid-column:1 / -1; } }
  .copy { border:1px solid var(--rule-strong); background:transparent; color:var(--dim); border-radius:3px; padding:6px 12px;
    font-family:var(--mono); font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; }
  .copy:hover { color:var(--paper); border-color:var(--faint); }
  footer { margin-top:56px; padding-top:20px; border-top:1px solid var(--rule); display:flex; gap:24px; flex-wrap:wrap; }
  footer a { color:var(--dim); text-decoration:none; }
  footer a:hover { color:var(--paper); }
</style>
</head>
<body>
<header class="bar">
  <div class="bar-in">
    <a class="brand" href="https://www.clypdat.xyz/"><img src="https://www.clypdat.xyz/logo-mark.png" alt="">ClypDat</a>
    <span class="slate">api.clypdat.xyz</span>
  </div>
</header>
<main>
  <div class="chapter"><span class="mark"></span><span class="slate" style="color:var(--dim)">v1</span><span class="rule"></span><span class="slate">Public API</span></div>
  <h1>ClypDat API</h1>
  <p class="lead">Live totals from every copy of ClypDat: each clip, auto-clip and full session saved, and how much gameplay they hold. Only the numbers are sent, never the clips.</p>
  <a class="status" id="status" href="https://status.clypdat.xyz"><span class="sd"></span><span id="status-text">Checking services&hellip;</span></a>

  <div class="stats-head">
    <span class="slate">Totals</span>
    <span class="live slate"><span class="dot"></span>Live</span>
  </div>
  <section class="stats" aria-label="ClypDat totals">
    <div class="stat">
      <div class="n" id="total">&ndash;</div>
      <div class="l slate" id="total-label">clips saved</div>
    </div>
    <div class="stat">
      <div class="n" id="gameplay">&ndash;</div>
      <div class="l slate" id="gameplay-label">of gameplay saved</div>
    </div>
    <div class="stat">
      <div class="n" id="downloads">&ndash;</div>
      <div class="l slate" id="downloads-label">downloads from clypdat.xyz</div>
    </div>
  </section>

  <section class="panel" aria-label="Clips saved per day">
    <div class="panel-head"><span class="slate">Last 30 days</span><span class="sum" id="history-sum"></span></div>
    <svg id="chart" viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Clips saved per day, last 30 days"></svg>
    <div class="axis slate"><span id="axis-start"></span><span id="axis-end"></span></div>
  </section>

  <p class="json">JSON: <a href="/v1/stats/clips"><code>/v1/stats/clips</code></a> &middot; <a href="/v1/stats/clips/history"><code>/v1/stats/clips/history</code></a> &middot; <a href="/v1/stats/downloads"><code>/v1/stats/downloads</code></a> &middot; <a href="/v1/status"><code>/v1/status</code></a></p>

  <section class="panel" aria-label="README badges">
    <div class="panel-head" style="margin-bottom:0"><span class="slate">README badges</span></div>
    <div class="badges">
      ${BADGES.map(
        (name) => `<div class="badge-row"><img src="${badgeUrl(name)}" alt="${name} badge"><code>![${name}](${badgeUrl(name)})</code><button class="copy" type="button">Copy</button></div>`,
      ).join("\n      ")}
    </div>
  </section>

  <footer class="slate">
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
    // Always show total minutes, including totals above an hour.
    function duration(s) {
      return [Math.round(s / 60).toLocaleString("en-US"), "min"];
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
        var slot = 300 / n, width = slot * 0.8, svg = "";
        days.forEach(function (day, i) {
          // A sliver even for zero, so the empty days read as days, not gaps.
          var h = Math.max(1.5, (day.total / max) * 100);
          var x = (i * slot + (slot - width) / 2).toFixed(2), w = width.toFixed(2);
          // Ties all light up; an empty month lights nothing.
          var peak = day.total > 0 && day.total === max;
          var label = day.date + ": " + day.total + " " + plural(day.total, "clip", "clips") + (peak ? " (most in 30 days)" : "");
          var cls = (peak ? "peak " : "") + (i === n - 1 ? "today" : "");
          // The viewBox is stretched non-uniformly, so the outline opts out of
          // scaling or it would be thick on the sides and hairline on top.
          svg += '<g class="' + cls + '"><title>' + label + '</title>' +
            '<rect class="track" x="' + x + '" y="0" width="' + w + '" height="100" rx="1" vector-effect="non-scaling-stroke"></rect>' +
            '<rect class="bar" x="' + x + '" y="' + (100 - h).toFixed(2) + '" width="' + w + '" height="' + h.toFixed(2) + '" rx="1"></rect></g>';
        });
        $("chart").innerHTML = svg;
        var fmt = function (iso) { return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Australia/Melbourne" }); };
        $("axis-start").textContent = fmt(days[0].date);
        $("axis-end").textContent = "Today (Sydney)";
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
