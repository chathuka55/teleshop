import * as THREE from "three";

/**
 * RGB lighting state for the procedural gaming PC (ported from the "Neon Forge" sample).
 * Module-level and mutable: the scene reads it every frame without React re-renders.
 * Colours follow the Midnight Tech palette — primary blues flowing into amber (no cyan/pink/violet).
 */
export type RGBMode = "brand" | "blue" | "amber" | "breathe" | "off";

export type PCSettings = {
  mode: RGBMode;
  /** animation speed multiplier */
  speed: number;
  /** 0..1.5 */
  brightness: number;
  /** 0..1 -> fan rotation speed */
  fanSpeed: number;
};

export const settings: PCSettings = { mode: "brand", speed: 1, brightness: 1, fanSpeed: 0.55 };

export function updateSettings(patch: Partial<PCSettings>): void {
  Object.assign(settings, patch);
}

const PRIMARY = new THREE.Color("#1d4ed8");
const PRIMARY_LIGHT = new THREE.Color("#3b82f6");
const ACCENT = new THREE.Color("#f59e0b");
const TAU = Math.PI * 2;

/**
 * Writes the colour of one LED at `time` into `out`. `offset` (0..1) creates the flowing
 * gradient between neighbouring LEDs.
 */
export function sampleRGB(out: THREE.Color, time: number, offset: number): THREE.Color {
  const t = time * settings.speed;
  switch (settings.mode) {
    case "brand": {
      // primary → primary-light → amber → back, travelling along the strip
      const k = 0.5 + 0.5 * Math.sin(t * 0.8 + offset * TAU);
      if (k < 0.65) out.copy(PRIMARY).lerp(PRIMARY_LIGHT, k / 0.65);
      else out.copy(PRIMARY_LIGHT).lerp(ACCENT, (k - 0.65) / 0.35);
      break;
    }
    case "blue": {
      const k = 0.5 + 0.5 * Math.sin(t * 0.9 + offset * TAU);
      out.copy(PRIMARY).lerp(PRIMARY_LIGHT, k);
      break;
    }
    case "amber":
      out.copy(ACCENT);
      break;
    case "breathe": {
      const k = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * 2 - offset * 3));
      out.copy(PRIMARY_LIGHT).multiplyScalar(k);
      break;
    }
    case "off":
      out.setRGB(0, 0, 0);
      break;
  }
  return out.multiplyScalar(settings.brightness);
}
