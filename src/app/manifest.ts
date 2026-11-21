import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Psst! — losowanie prezentów",
    short_name: "Psst!",
    description: "Losowanie prezentów bez e-maili i bez spojlerów.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E1A2B",
    theme_color: "#0E1A2B",
    lang: "pl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
