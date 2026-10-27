import { DEFAULT_HERO_SLIDES } from "@/lib/homepage/content";
import type { MediaCategory } from "./types";

/** Compatibility entries only; these never replace, move or import existing files automatically. */
export const LEGACY_WEBSITE_IMAGES: { url: string; name: string; alt: string; category: MediaCategory; usage: string }[] = [
  ...DEFAULT_HERO_SLIDES.map(slide => ({ url: slide.src, name: slide.alt, alt: slide.alt, category: "hero" as const, usage: "Homepage · built-in hero carousel" })),
  ...[
    ["Italy", "photo-1516483638261-f4dbaf036963"], ["Germany", "photo-1467269204594-9661b134dd2b"], ["France", "photo-1502602898657-3e91760cbb34"], ["Netherlands", "photo-1534351590666-13e3e96b5017"], ["Spain", "photo-1583422409516-2895a77efded"], ["Poland", "photo-1578662996442-48f60103fc96"],
  ].map(([name, photo]) => ({ url: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1200&q=80`, name: `${name} destination`, alt: `${name} — European study destination`, category: "destinations" as const, usage: "Homepage · destination cards" })),
  { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2400&q=75", name: "Why Europe landscape", alt: "Landscape background", category: "general", usage: "Homepage · Why Study in Europe" },
  ...["favicon.svg", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "apple-touch-icon-precomposed.png", "android-chrome-192x192.png", "android-chrome-512x512.png"].map(name => ({ url: `/${name}`, name, alt: "UniMondo website icon", category: "general" as const, usage: "Website · existing brand icons" })),
];
