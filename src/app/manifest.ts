import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Growth Advisor",
    short_name: "Growth",
    description: "Know your numbers, get one clear next step, and watch your business grow.",
    start_url: "/home",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#1e5b3e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
