import { MAP_TILE_HOST } from "@/config/storage";
import { tilesAround } from "@/lib/geo/tiles";
import { cn } from "@/lib/utils/cn";

const ZOOM = 16;

/**
 * Static map with a pin, rendered on the server from OpenStreetMap tiles (no map library, no API
 * key, no third-party script — the CSP only allows the tile images). Dark-styled with a CSS filter
 * to match Midnight Tech. The OSM credit is required by its tile usage policy.
 */
export function ShopMap({
  lat,
  lng,
  label,
  className,
}: {
  lat: number;
  lng: number;
  label: string;
  className?: string;
}) {
  const tiles = tilesAround(lat, lng, ZOOM);
  return (
    <div
      role="img"
      aria-label={`Map showing ${label}`}
      className={cn("relative isolate overflow-hidden bg-[#0d1220]", className)}
    >
      <div
        aria-hidden
        className="absolute inset-0 [filter:invert(1)_hue-rotate(200deg)_brightness(0.85)_contrast(0.9)_saturate(0.5)]"
      >
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- raw tiles; next/image would proxy them
          <img
            key={t.key}
            src={`https://${MAP_TILE_HOST}/${t.z}/${t.x}/${t.y}.png`}
            alt=""
            width={256}
            height={256}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute size-64 max-w-none select-none"
            style={{ left: `calc(50% + ${t.dx}px)`, top: `calc(50% + ${t.dy}px)` }}
          />
        ))}
      </div>
      {/* Edge fade into the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(10_13_20/0.75)_100%)]"
      />
      {/* Pin */}
      <span aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
        <span className="absolute top-full left-1/2 size-10 -translate-1/2 animate-ping rounded-full bg-primary-light/35 motion-reduce:hidden" />
        <svg viewBox="0 0 32 42" className="relative h-[42px] w-8 drop-shadow-[0_6px_12px_rgb(0_0_0/0.6)]">
          <path
            d="M16 41s14-13.2 14-24.5C30 8.4 23.7 2 16 2S2 8.4 2 16.5C2 27.8 16 41 16 41Z"
            fill="#1D4ED8"
            stroke="#fff"
            strokeWidth="2.5"
          />
          <circle cx="16" cy="16.5" r="5.5" fill="#fff" />
        </svg>
      </span>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 hover:text-white"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
