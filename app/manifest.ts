import type { MetadataRoute } from "next";

// Manifest nativo do App Router: o Next serve automaticamente em
// /manifest.webmanifest e injeta <link rel="manifest"> no <head>.
// (Forma idiomática — dispensa um manifest.json estático em /public.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sustainable Finance 2026",
    short_name: "SF 2026",
    description: "Hub digital do evento Sustainable Finance — Goiânia, 04/09/2026",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#1E8E5A",
    lang: "pt-BR",
    categories: ["business", "finance", "events"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
