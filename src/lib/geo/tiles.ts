/** Web-Mercator ("slippy map") tile maths for the shop-page map. Pure; unit tested. */

export const TILE_SIZE = 256;

/** Fractional tile coordinates of a point at zoom `z`. */
export function tileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const latRad = (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  };
}

export type PlacedTile = { key: string; x: number; y: number; z: number; dx: number; dy: number };

/**
 * Tiles around the point, each with its pixel offset (dx, dy) from the point to the tile's top-left
 * corner — place them at `left: calc(50% + dx px)` and the point sits exactly in the centre.
 */
export function tilesAround(lat: number, lng: number, z: number, cols = 5, rows = 3): PlacedTile[] {
  const { x, y } = tileXY(lat, lng, z);
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const n = 2 ** z;
  const tiles: PlacedTile[] = [];
  for (let r = -Math.floor(rows / 2); r <= Math.floor(rows / 2); r++) {
    for (let c = -Math.floor(cols / 2); c <= Math.floor(cols / 2); c++) {
      const tx = cx + c;
      const ty = cy + r;
      if (ty < 0 || ty >= n) continue;
      tiles.push({
        key: `${z}/${tx}/${ty}`,
        x: ((tx % n) + n) % n, // wrap around the antimeridian
        y: ty,
        z,
        dx: Math.round((tx - x) * TILE_SIZE),
        dy: Math.round((ty - y) * TILE_SIZE),
      });
    }
  }
  return tiles;
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function osmUrl(lat: number, lng: number, z = 17): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${z}/${lat}/${lng}`;
}
