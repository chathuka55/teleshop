"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GlowInstances, ringItems, type Vec3 } from "./Glow";
import { settings } from "./rgb-store";

/** One curved fan blade, pointing along +X, unit radius. */
const bladeGeometry = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.16, -0.05);
  s.bezierCurveTo(0.4, -0.2, 0.75, -0.24, 0.92, -0.08);
  s.bezierCurveTo(0.98, 0.04, 0.92, 0.2, 0.8, 0.27);
  s.bezierCurveTo(0.55, 0.3, 0.3, 0.2, 0.16, 0.06);
  s.closePath();
  return new THREE.ShapeGeometry(s, 16);
})();

const bladeMaterial = new THREE.MeshStandardMaterial({
  color: "#1b1f2b",
  metalness: 0.35,
  roughness: 0.4,
  side: THREE.DoubleSide,
});
const frameMaterial = new THREE.MeshStandardMaterial({ color: "#0d0f15", metalness: 0.7, roughness: 0.35 });
const hubMaterial = new THREE.MeshStandardMaterial({ color: "#07080c", metalness: 0.8, roughness: 0.25 });

type FanProps = {
  position: Vec3;
  rotation?: Vec3;
  size?: number;
  /** LED phase offset */
  offset?: number;
  /** 1 or -1 spin direction */
  dir?: 1 | -1;
  blades?: number;
  frame?: boolean;
};

/** A spinning RGB case fan. Axis = local +Z. */
export function Fan({
  position,
  rotation = [0, 0, 0],
  size = 1.2,
  offset = 0,
  dir = 1,
  blades = 9,
  frame = true,
}: FanProps) {
  const R = size / 2;
  const rotor = useRef<THREE.Group>(null);

  const frameGeo = useMemo(() => {
    const h = R;
    const r = R * 0.14;
    const s = new THREE.Shape();
    s.moveTo(-h + r, -h);
    s.lineTo(h - r, -h);
    s.quadraticCurveTo(h, -h, h, -h + r);
    s.lineTo(h, h - r);
    s.quadraticCurveTo(h, h, h - r, h);
    s.lineTo(-h + r, h);
    s.quadraticCurveTo(-h, h, -h, h - r);
    s.lineTo(-h, -h + r);
    s.quadraticCurveTo(-h, -h, -h + r, -h);
    const hole = new THREE.Path();
    hole.absarc(0, 0, R * 0.94, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 48 });
    g.translate(0, 0, -0.05);
    return g;
  }, [R]);

  const ringLeds = useMemo(() => ringItems(R * 0.88, 32, 0), [R]);
  const hubLeds = useMemo(() => [...ringItems(R * 0.2, 12, 0.056), ...ringItems(R * 0.2, 12, -0.056)], [R]);
  const bladeIndexes = useMemo(() => Array.from({ length: blades }, (_, i) => i), [blades]);

  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z -= Math.min(dt, 0.05) * dir * settings.fanSpeed * 22;
  });

  return (
    <group position={position} rotation={rotation}>
      {frame && <mesh geometry={frameGeo} material={frameMaterial} />}

      {/* static RGB ring (visible from both sides) */}
      <GlowInstances
        items={ringLeds}
        size={[((Math.PI * 2 * R * 0.88) / 32) * 0.82, R * 0.06, 0.108]}
        offset={offset}
        spread={1}
        intensity={2.6}
      />

      {/* spinning part */}
      <group ref={rotor}>
        {bladeIndexes.map((i) => (
          <group key={i} rotation={[0, 0, (i / blades) * Math.PI * 2]}>
            <mesh geometry={bladeGeometry} material={bladeMaterial} rotation={[0.5, 0, 0]} scale={R} />
          </group>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={hubMaterial}>
          <cylinderGeometry args={[R * 0.17, R * 0.17, 0.11, 32]} />
        </mesh>
        <GlowInstances
          items={hubLeds}
          size={[((Math.PI * 2 * R * 0.2) / 12) * 0.8, R * 0.035, 0.012]}
          offset={offset + 0.3}
          spread={1}
          intensity={2.6}
        />
      </group>
    </group>
  );
}
