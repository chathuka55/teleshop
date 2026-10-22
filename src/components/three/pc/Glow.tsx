"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sampleRGB } from "./rgb-store";

export type Vec3 = [number, number, number];
export type GlowItem = { position: Vec3; rotation?: Vec3 };

/** LEDs laid out on a circle in the XY plane (facing +Z). */
export function ringItems(radius: number, count: number, z = 0): GlowItem[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return {
      position: [Math.cos(a) * radius, Math.sin(a) * radius, z] as Vec3,
      rotation: [0, 0, a + Math.PI / 2] as Vec3,
    };
  });
}

/** LEDs laid out on a straight line, centred on the origin. */
export function stripItems(length: number, count: number, axis: "x" | "y" | "z" = "x"): GlowItem[] {
  return Array.from({ length: count }, (_, i) => {
    const v = (i / (count - 1) - 0.5) * length;
    const position: Vec3 = axis === "x" ? [v, 0, 0] : axis === "y" ? [0, v, 0] : [0, 0, v];
    return { position };
  });
}

type GlowProps = {
  items: GlowItem[];
  /** size of each LED box */
  size: Vec3;
  /** hue/phase offset of this group */
  offset?: number;
  /** how much the phase changes across the group */
  spread?: number;
  /** brightness multiplier (>1 makes it bloom) */
  intensity?: number;
};

/** One InstancedMesh of RGB LEDs whose per-instance colour flows with the global RGB mode. */
export function GlowInstances({ items, size, offset = 0, spread = 0.6, intensity = 2.4 }: GlowProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    items.forEach((it, i) => {
      dummy.position.set(...it.position);
      dummy.rotation.set(...(it.rotation ?? [0, 0, 0]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, color]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh?.instanceColor) return;
    const t = clock.elapsedTime;
    const n = items.length;
    for (let i = 0; i < n; i++) {
      sampleRGB(color, t, offset + (i / n) * spread);
      color.multiplyScalar(intensity);
      mesh.setColorAt(i, color);
    }
    mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <boxGeometry args={size} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** A point light that follows the RGB mode — spills coloured light onto the case internals. */
export function RGBLight({
  position,
  offset = 0,
  intensity = 4,
  distance = 6,
}: {
  position: Vec3;
  offset?: number;
  intensity?: number;
  distance?: number;
}) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current) sampleRGB(ref.current.color, clock.elapsedTime, offset);
  });
  return <pointLight ref={ref} position={position} intensity={intensity} distance={distance} decay={2} />;
}
