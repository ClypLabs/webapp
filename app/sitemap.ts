import type { MetadataRoute } from "next";

const siteUrl = "https://www.clypdat.xyz";

// Public, indexable pages only. /account is behind sign-in and /download/* are
// redirects to binaries, so neither belongs here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/cookies`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
