import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KASHFARA VISION — Arabic & English Document Intelligence",
    short_name: "KASHFARA VISION",
    description:
      "4B parameter OCR + Vision document intelligence platform for Arabic RTL, English, and bilingual enterprise documents.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
