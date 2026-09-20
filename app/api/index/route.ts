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
<meta name="theme-color" content="#34d399">
<link rel="icon" href="https://www.clypdat.xyz/favicon.ico">
<style>
  :root { color-scheme: dark; --bg:#0a0d11; --card:rgba(255,255,255,.03); --line:rgba(255,255,255,.09);
    --text:#e9eef4; --muted:#8a94a3; --faint:#5b6472; --accent:#34d399; --bad:#f87171; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg);
    color:var(--text); font:15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    min-height:100vh; padding:0 20px; }

  /* The same page-wide atmosphere the other hosts use, rebuilt here so this
     page stays self-contained. It is drawn by the shader below, with these CSS
     washes as the fallback. A wash this faint has only ~20 shades of green to
     spread over hundreds of pixels, so as a plain gradient it shows as rings,
     and grain at a strength that stays invisible is far too weak to break them
     up. The shader mixes in full precision and dithers the final colour, which
     is what removes them. Fixed, so the light stays put while the page scrolls
     past it. The layout is deliberately not the site's: the main wash sits top
     right here, where the site puts it top left. */
  .amb { position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none; }
  .amb canvas { position:absolute; inset:0; width:100%; height:100%; display:none; }
  .amb[data-live] canvas { display:block; }
  .amb[data-live] .css-washes { display:none; }
  /* Radial gradients, not blurred circles: a blur that size is re-rasterised on
     every frame it moves, while a gradient is painted once and then costs only
     a composite to translate. Translate and opacity only, for the same reason. */
  .amb i { position:absolute; display:block; will-change:transform, opacity; }
  .amb .b1 { right:-12%; top:-20%; width:1240px; height:1080px;
    background:radial-gradient(closest-side, rgba(16,185,129,.13), transparent);
    animation:amb-a 19s ease-in-out infinite; }
  .amb .b2 { left:-10%; top:42%; width:1120px; height:940px;
    background:radial-gradient(closest-side, rgba(45,212,191,.10), transparent);
    animation:amb-b 23s ease-in-out infinite; }
  .amb .b3 { left:44%; bottom:-16%; width:1200px; height:920px;
    background:radial-gradient(closest-side, rgba(6,182,212,.08), transparent);
    animation:amb-c 31s ease-in-out infinite; }
  .amb .b4 { left:10%; top:6%; width:920px; height:840px;
    background:radial-gradient(closest-side, rgba(52,211,153,.07), transparent);
    animation:amb-d 41s ease-in-out infinite; }
  /* Grain over whichever layer is showing: it takes the plastic sheen off the
     flat areas. No mix-blend-mode - a full-viewport blend layer forces the GPU
     to re-read what is under it every frame. */
  .amb .grain { position:absolute; inset:0; opacity:.025;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); }
  @keyframes amb-a { 0%,100% { transform:translate3d(0,0,0); opacity:.7; } 50% { transform:translate3d(-6%,4%,0); opacity:1; } }
  @keyframes amb-b { 0%,100% { transform:translate3d(0,0,0); opacity:.6; } 50% { transform:translate3d(7%,-5%,0); opacity:.95; } }
  @keyframes amb-c { 0%,100% { transform:translate3d(0,0,0); opacity:.5; } 50% { transform:translate3d(-5%,-6%,0); opacity:.85; } }
  @keyframes amb-d { 0%,100% { transform:translate3d(0,0,0); opacity:.45; } 50% { transform:translate3d(4%,6%,0); opacity:.8; } }
  /* Phones get two washes, still. Four viewport-sized layers compositing for
     the whole visit is not worth it on a battery. */
  @media (max-width:767px) { .amb .b3, .amb .b4 { display:none; }
    .amb .b1, .amb .b2 { animation:none; opacity:1; } }
  @media (prefers-reduced-motion: reduce) { .amb i { animation:none; opacity:1; } }
  main { max-width:760px; margin:0 auto; padding:72px 0 64px; }
  a { color:var(--accent); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .brand { display:flex; align-items:center; gap:10px; color:var(--text); font-weight:600; font-size:17px; }
  .brand img { width:28px; height:28px; }
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
  /* Every day sits on a full-height track; bars are muted so the busiest day,
     the one lit bar, stands out. Today is outlined rather than filled. */
  #chart .track { fill:rgba(255,255,255,.035); }
  #chart .bar { fill:rgba(255,255,255,.2); }
  #chart .peak .bar { fill:var(--accent); }
  #chart .today .track { stroke:rgba(52,211,153,.6); stroke-width:1; }
  #chart g:hover .bar { fill:rgba(255,255,255,.35); }
  #chart g.peak:hover .bar { fill:#6ee7b7; }
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
<div class="amb" id="amb" aria-hidden="true">
  <canvas id="amb-canvas"></canvas>
  <div class="css-washes"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>
  <span class="grain"></span>
</div>
<script>
  // The drawn field. Same technique as the site's ambience layer: every wash is
  // mixed in full precision and the final colour gets +-1 step of triangular
  // noise before the display rounds it to 8 bits, so the rings a plain CSS
  // gradient shows at this faintness never form. The washes drift on mismatched
  // periods, which is why this redraws rather than painting once.
  (function () {
    var layer = document.getElementById("amb");
    var canvas = document.getElementById("amb-canvas");
    var gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return; // The CSS washes stay.

    var VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
    var FRAG = [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "uniform vec2 size;",    // viewport, CSS px
      "uniform float scale;",  // device px per CSS px
      "uniform float extras;", // 1 when the two extra washes are shown
      "uniform float time;",   // seconds since load
      "vec3 wash(vec3 base, vec2 point, vec2 center, vec2 radii, vec3 rgb, float peak) {",
      "  float f = clamp(1.0 - length((point - center) / radii), 0.0, 1.0);",
      "  return mix(base, rgb / 255.0, peak * f);",
      "}",
      // Sine-free hash (Hoskins), so it holds up at large pixel coordinates.
      "float hash(vec2 p) {",
      "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
      "  p3 += dot(p3, p3.yzx + 33.33);",
      "  return fract((p3.x + p3.y) * p3.z);",
      "}",
      "void main() {",
      "  vec2 point = vec2(gl_FragCoord.x, size.y * scale - gl_FragCoord.y) / scale;",
      "  vec3 colour = vec3(10.0, 13.0, 17.0) / 255.0;",
      "  float a = time * 0.331, b = time * 0.273, c = time * 0.203, d = time * 0.153;",
      "  colour = wash(colour, point, vec2(1.12 * size.x - 560.0 + 70.0 * sin(a), -0.20 * size.y + 540.0 + 50.0 * cos(a * 0.8)),",
      "    vec2(620.0, 540.0), vec3(16.0, 185.0, 129.0), 0.13);",
      "  colour = wash(colour, point, vec2(-0.10 * size.x + 560.0 + 60.0 * cos(b), 0.42 * size.y + 470.0 + 55.0 * sin(b * 0.9)),",
      "    vec2(560.0, 470.0), vec3(45.0, 212.0, 191.0), 0.10);",
      "  if (extras > 0.5) {",
      "    colour = wash(colour, point, vec2(0.44 * size.x + 600.0 + 55.0 * sin(c), 1.16 * size.y - 460.0 + 45.0 * cos(c * 1.1)),",
      "      vec2(600.0, 460.0), vec3(6.0, 182.0, 212.0), 0.08);",
      "    colour = wash(colour, point, vec2(0.10 * size.x + 460.0 + 45.0 * cos(d), 0.06 * size.y + 420.0 + 50.0 * sin(d * 1.2)),",
      "      vec2(460.0, 420.0), vec3(52.0, 211.0, 153.0), 0.07);",
      "  }",
      // Triangular noise of +-1 step, which the output's rounding turns into
      // dither rather than error. It has to go on the final colour: dithering
      // each translucent layer on its own is undone when the browser stores it
      // premultiplied.
      "  float noise = hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 91.7) - 1.0;",
      "  gl_FragColor = vec4(colour + noise / 255.0, 1.0);",
      "}"
    ].join("\\n");

    function compile(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    }
    var vertex = compile(gl.VERTEX_SHADER, VERT);
    var fragment = compile(gl.FRAGMENT_SHADER, FRAG);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // One triangle that covers the whole viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    var sizeU = gl.getUniformLocation(program, "size");
    var scaleU = gl.getUniformLocation(program, "scale");
    var extrasU = gl.getUniformLocation(program, "extras");
    var timeU = gl.getUniformLocation(program, "time");
    var wide = window.matchMedia("(min-width: 768px)");
    var still = window.matchMedia("(prefers-reduced-motion: reduce)");
    var seconds = 0;

    function draw() {
      var width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      // Device pixels, so the dither lands one step per physical pixel. Capped
      // at 2x - past that the grain is finer than anyone can see anyway.
      var scale = Math.min(window.devicePixelRatio || 1, 2);
      var pixelWidth = Math.round(width * scale), pixelHeight = Math.round(height * scale);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        gl.viewport(0, 0, pixelWidth, pixelHeight);
      }
      gl.uniform2f(sizeU, width, height);
      gl.uniform1f(scaleU, pixelWidth / width);
      gl.uniform1f(extrasU, wide.matches ? 1 : 0);
      gl.uniform1f(timeU, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    var started = 0, drawn = -1;
    function frame(now) {
      if (!started) started = now;
      seconds = (now - started) / 1000;
      // ~20fps. The washes take 19 to 41 seconds to cross the viewport, so
      // nothing is lost by skipping two thirds of the full-viewport redraws.
      if (seconds - drawn >= 0.05) {
        draw();
        drawn = seconds;
      }
      if (!still.matches) requestAnimationFrame(frame);
    }

    // Swap on a frame boundary: the CSS washes go and the drawn field appears
    // in the same paint, so there is no frame of either both or neither.
    requestAnimationFrame(function (now) {
      layer.dataset.live = "";
      frame(now);
    });

    window.addEventListener("resize", draw);
    wide.addEventListener("change", draw);
    canvas.addEventListener("webglcontextlost", function () { delete layer.dataset.live; });
  })();
</script>
<main>
  <a class="brand" href="https://www.clypdat.xyz/"><img src="https://www.clypdat.xyz/logo.svg" alt="">ClypDat</a>
  <h1>ClypDat <span>API</span></h1>
  <p class="lead">Live totals from every copy of ClypDat: each clip, auto-clip and full session saved, and how much gameplay they hold. Only the numbers are sent, never the clips.</p>
  <a class="status" id="status" href="https://status.clypdat.xyz"><span class="sd"></span><span id="status-text">Checking services&hellip;</span></a>

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
