"use client";

import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** Screen texture drawn once on a canvas — mirrors the Figma hero phone mockup ("17 Pro"). */
function useScreenTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const w = 512;
    const h = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1e3a8a");
      g.addColorStop(0.36, "#1d4ed8");
      g.addColorStop(0.72, "#3b82f6");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#05070d";
      ctx.beginPath();
      ctx.roundRect(w / 2 - 70, 40, 140, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 30px Inter, system-ui, sans-serif";
      ctx.fillText("9:41", 60, 72);
      ctx.font = "700 92px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText("17 Pro", 60, 640);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "400 30px Inter, system-ui, sans-serif";
      ctx.fillText("Forged in titanium.", 60, 700);
      ctx.fillText("Built for pros.", 60, 745);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect(60, 800, 220, 70, 35);
      ctx.fill();
      ctx.fillStyle = "#0b1220";
      ctx.font = "700 28px Inter, system-ui, sans-serif";
      ctx.fillText("Buy now  →", 92, 845);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Fallback phone used when `hero-phone.glb` is missing or fails to load. ~2 units tall. */
export function ProceduralPhone() {
  const screen = useScreenTexture();
  return (
    <group rotation={[0, -0.35, 0]}>
      {/* titanium frame / back (Cosmic Orange) */}
      <RoundedBox args={[1, 2.06, 0.11]} radius={0.12} smoothness={6}>
        <meshPhysicalMaterial color="#c2551a" metalness={0.75} roughness={0.32} clearcoat={0.6} />
      </RoundedBox>
      {/* front glass + screen */}
      <mesh position={[0, 0, 0.0565]}>
        <planeGeometry args={[0.93, 1.99]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* camera plateau on the back */}
      <group position={[0, 0.7, -0.065]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[0.86, 0.5, 0.04]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color="#b44c16" metalness={0.7} roughness={0.25} />
        </RoundedBox>
        {(
          [
            [-0.24, 0.1],
            [-0.24, -0.12],
            [0.02, -0.01],
          ] as const
        ).map(([x, y]) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.085, 0.09, 0.05, 32]} />
            <meshStandardMaterial color="#0b0f17" metalness={0.9} roughness={0.15} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
