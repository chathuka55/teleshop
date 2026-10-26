/** CC BY 3D models in the home hero (public/models/CREDITS.md) — shown on /credits. */
export type ModelCredit = {
  file: string;
  title: string;
  source: string;
  author: string;
  authorUrl: string;
  licence: string;
  licenceUrl: string;
  changes: string;
};

const CC_BY_4 = { licence: "CC BY 4.0", licenceUrl: "https://creativecommons.org/licenses/by/4.0/" } as const;

export const modelCredits: readonly ModelCredit[] = [
  {
    file: "/models/hero-phone.glb",
    title: "iPhone 17 Pro",
    source: "https://sketchfab.com/3d-models/iphone-17-pro-4541aa8a28324b33a2baaf81d263aaec",
    author: "Ranguel",
    authorUrl: "https://sketchfab.com/Ranguel",
    ...CC_BY_4,
    changes: "compressed (meshopt), textures resized to WebP",
  },
  {
    file: "/models/hero-laptop.glb",
    title: "macbook pro M3 16 inch 2024",
    source: "https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4",
    author: "jackbaeten",
    authorUrl: "https://sketchfab.com/jackbaeten",
    ...CC_BY_4,
    changes: "compressed (meshopt), textures resized to WebP",
  },
];
