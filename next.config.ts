import type { NextConfig } from "next";

// api.clypdat.xyz is this same deployment under a second domain. Its tidy
// /v1 paths are rewritten onto the existing /api routes, so both URLs work:
// installed apps already call www.clypdat.xyz/api/..., and must keep doing so.
const apiHost = [{ type: "host" as const, value: "api.clypdat.xyz" }];

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites run in sequence, each seeing the previous one's
      // output, so the catch-all at the end must skip paths the rules above
      // it already moved to /api/.
      beforeFiles: [
        { source: "/", has: apiHost, destination: "/api/index" },
        { source: "/v1/stats/clips", has: apiHost, destination: "/api/stats/clips" },
        { source: "/v1/stats/clips/history", has: apiHost, destination: "/api/stats/clips/history" },
        { source: "/v1/stats/downloads", has: apiHost, destination: "/api/stats/downloads" },
        { source: "/v1/badges/:name", has: apiHost, destination: "/api/badges/:name" },
        { source: "/v1/status", has: apiHost, destination: "/api/status" },
        { source: "/v1/releases/latest", has: apiHost, destination: "/api/releases/latest" },
        { source: "/v1/releases", has: apiHost, destination: "/api/releases" },
        { source: "/og.png", has: apiHost, destination: "/api/og" },
        {
          source: "/:path((?!api/|favicon\\.ico$).*)",
          has: apiHost,
          destination: "/api/unknown",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
