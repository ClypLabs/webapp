import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API routes and the sign-in flow have nothing a search result should
      // point at.
      disallow: ["/api/", "/account"],
    },
    sitemap: "https://www.clypdat.xyz/sitemap.xml",
  };
}
