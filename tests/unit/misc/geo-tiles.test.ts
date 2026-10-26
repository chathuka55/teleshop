import { describe, expect, it } from "vitest";
import { TILE_SIZE, directionsUrl, tileXY, tilesAround } from "@/lib/geo/tiles";

describe("tile maths (shop map)", () => {
  it("matches known OSM tile numbers", () => {
    // Colombo, zoom 16 — reference values from the OSM slippy-map formula.
    const t = tileXY(6.9106, 79.8508, 16);
    expect(Math.floor(t.x)).toBe(47304);
    expect(Math.floor(t.y)).toBe(31506);
    expect(tileXY(0, 0, 1)).toEqual({ x: 1, y: 1 });
  });

  it("places tiles so the point lands in the centre", () => {
    const lat = 7.2862;
    const lng = 80.6302;
    const { x, y } = tileXY(lat, lng, 16);
    const tiles = tilesAround(lat, lng, 16);
    expect(tiles).toHaveLength(15);
    const centre = tiles.find((t) => t.x === Math.floor(x) && t.y === Math.floor(y));
    // The point is inside the centre tile: offset to its corner is between -256 and 0 px.
    expect(centre?.dx).toBeLessThanOrEqual(0);
    expect(centre?.dx).toBeGreaterThanOrEqual(-TILE_SIZE); // rounding to whole px
    expect(centre?.dy).toBeLessThanOrEqual(0);
    expect(centre?.dy).toBeGreaterThanOrEqual(-TILE_SIZE); // rounding to whole px
  });

  it("builds a directions link", () => {
    expect(directionsUrl(6.91, 79.85)).toBe("https://www.google.com/maps/dir/?api=1&destination=6.91,79.85");
  });
});
