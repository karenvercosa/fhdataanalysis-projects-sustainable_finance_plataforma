import type { MetadataRoute } from "next";

// PWA: instalável e usável durante o dia do evento (04/09/2026).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sustainable Finance 2026",
    short_name: "SF 2026",
    description: "Hub digital do evento Sustainable Finance — Goiânia, 04/09/2026",
    theme_color: "#1E8E5A",
    background_color: "#FFFFFF",
    display: "standalone",
    start_url: "/",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
