import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo", "/spreadsheet", "/spreadsheet/demo", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/"],
      },
      {
        userAgent: [
          "OAI-SearchBot",
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Claude-SearchBot",
          "anthropic-ai",
          "Googlebot",
          "Google-Extended",
        ],
        allow: ["/", "/demo", "/spreadsheet", "/spreadsheet/demo", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://kashfara.com/sitemap.xml",
    host: "https://kashfara.com",
  };
}
