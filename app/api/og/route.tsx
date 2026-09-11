import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getClipStats } from "@/app/lib/clip-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The link preview for api.clypdat.xyz (served as /og.png there): the live
// totals, so a link pasted into Discord or X shows the numbers themselves.
// getClipStats is the cached read, so a crawler fetching this does not wake
// the database any more than the page does.

const WIDTH = 1200;
const HEIGHT = 630;

// Read once per instance. The fonts sit next to this route rather than in
// public/ so they ship with the function; next/og's built-in font has no bold.
const assets = Promise.all([
  readFile(join(process.cwd(), "app/api/og/geist-400.ttf")),
  readFile(join(process.cwd(), "app/api/og/geist-700.ttf")),
  readFile(join(process.cwd(), "public/logo.svg"), "utf8"),
]);

// Same units as the page: 45 sec, 12 min, 3.4 hours, then whole hours.
function duration(seconds: number): [string, string] {
  if (seconds < 60) return [String(Math.round(seconds)), "sec"];
  if (seconds < 3600) return [String(Math.round(seconds / 60)), "min"];
  const hours = seconds / 3600;
  if (hours < 100) return [(Math.round(hours * 10) / 10).toLocaleString("en-US"), hours < 1.05 ? "hour" : "hours"];
  return [Math.round(hours).toLocaleString("en-US"), "hours"];
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "34px 40px",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: "#e9eef4" }}>{value}</div>
      <div style={{ fontSize: 32, color: "#8a94a3", marginTop: 16 }}>{label}</div>
    </div>
  );
}

export async function GET() {
  const [regular, bold, logo] = await assets;

  let clips = "–";
  let clipsLabel = "clips saved";
  let gameplay = "–";
  try {
    const stats = await getClipStats();
    clips = stats.total.toLocaleString("en-US");
    clipsLabel = stats.total === 1 ? "clip saved" : "clips saved";
    const [amount, unit] = duration(stats.seconds.total);
    gameplay = `${amount} ${unit}`;
  } catch {
    // Render the card without numbers rather than fail the preview.
  }

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          fontFamily: "Geist",
          color: "#e9eef4",
          backgroundColor: "#0a0d11",
          backgroundImage: "radial-gradient(900px 480px at 50% -80px, rgba(16,185,129,0.24), rgba(10,13,17,0))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
            <img src={`data:image/svg+xml,${encodeURIComponent(logo)}`} width={64} height={36} alt="" />
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
              ClypDat<span style={{ color: "#34d399", marginLeft: 12 }}>API</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 22,
              letterSpacing: "0.16em",
              color: "#34d399",
              border: "1px solid rgba(52,211,153,0.3)",
              background: "rgba(52,211,153,0.08)",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 999, background: "#34d399" }} />
            LIVE TOTALS
          </div>
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          <Stat value={clips} label={clipsLabel} />
          <Stat value={gameplay} label="of gameplay saved" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#5b6472" }}>
          <span>Every clip, auto-clip and session saved in ClypDat</span>
          <span style={{ color: "#8a94a3" }}>api.clypdat.xyz</span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
      headers: {
        // Crawlers keep their own copy for far longer anyway; this only stops
        // repeated fetches from re-rendering the PNG every time.
        "Cache-Control": "public, s-maxage=600",
      },
    },
  );
  return image;
}
