import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: "https://kashfara.com/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://kashfara.com/demo",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://kashfara.com/spreadsheet",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://kashfara.com/spreadsheet/demo",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];
}
