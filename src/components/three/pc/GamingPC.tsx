"use client";

/*
 * Procedural RGB gaming PC — ported from the "animated-3d-gaming-pc" sample (Neon Forge),
 * authored for Teleshop. No external model file, so nothing to download.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { Fan } from "./Fan";
import { GlowInstances, RGBLight, ringItems, stripItems, type Vec3 } from "./Glow";

// Case interior: x = front(+)/rear(-), y = up, z = glass side(+)/motherboard tray(-)
const ZC = -0.1; // z center of the case body

const MAT = {
  case: { color: "#0c0e14", metalness: 0.85, roughness: 0.38 },
  alu: { color: "#1b1f2a", metalness: 0.95, roughness: 0.28 },
  pcb: { color: "#0b1018", metalness: 0.4, roughness: 0.55 },
  heatsink: { color: "#252a38", metalness: 0.9, roughness: 0.3 },
  dark: { color: "#07080c", metalness: 0.8, roughness: 0.3 },
};

function Box({
  position,
  size,
  mat = MAT.case,
}: {
  position: Vec3;
  size: Vec3;
  mat?: { color: string; metalness: number; roughness: number };
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial {...mat} />
    </mesh>
  );
}

function Glass({
  position,
  size,
  smoked = false,
  visible,
}: {
  position: Vec3;
  size: Vec3;
  smoked?: boolean;
  visible: boolean;
}) {
  return (
    <mesh position={position} visible={visible} renderOrder={10}>
      <boxGeometry args={size} />
      <meshPhysicalMaterial
        color={smoked ? "#04060a" : "#a9c4e0"}
        transparent
        opacity={smoked ? 0.32 : 0.1}
        roughness={0.04}
        metalness={0.1}
        clearcoat={1}
        envMapIntensity={smoked ? 1.2 : 2}
        depthWrite={false}
      />
    </mesh>
  );
}

function Tube({ points, radius = 0.045 }: { points: Vec3[]; radius?: number }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 48, radius, 12, false);
  }, [points, radius]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#12141b" metalness={0.3} roughness={0.35} />
    </mesh>
  );
}

function CaseBody({ glass }: { glass: boolean }) {
  return (
    <group>
      {/* tray / back panel */}
      <Box position={[0, 0, -0.92]} size={[3.6, 4, 0.06]} />
      {/* bottom + rear panels */}
      <Box position={[0, -1.97, ZC]} size={[3.6, 0.06, 1.7]} />
      <Box position={[-1.78, 0, ZC]} size={[0.06, 4, 1.7]} />
      {/* top / front are smoked glass so you can see the fans */}
      <Glass position={[0, 1.97, ZC]} size={[3.5, 0.03, 1.64]} smoked visible={glass} />
      <Glass position={[1.78, 0, ZC]} size={[0.03, 3.9, 1.64]} smoked visible={glass} />
      {!glass && (
        <>
          <Box position={[0, 1.97, ZC]} size={[3.6, 0.03, 0.06]} mat={MAT.alu} />
          <Box position={[1.78, 0, ZC]} size={[0.03, 4, 0.06]} mat={MAT.alu} />
        </>
      )}
      {/* tempered glass side panel + aluminium frame */}
      <Glass position={[0, 0, 0.74]} size={[3.5, 3.9, 0.03]} visible={glass} />
      <Box position={[0, 1.96, 0.74]} size={[3.6, 0.08, 0.1]} mat={MAT.alu} />
      <Box position={[0, -1.96, 0.74]} size={[3.6, 0.08, 0.1]} mat={MAT.alu} />
      <Box position={[1.77, 0, 0.74]} size={[0.08, 4, 0.1]} mat={MAT.alu} />
      <Box position={[-1.77, 0, 0.74]} size={[0.08, 4, 0.1]} mat={MAT.alu} />
      {/* vertical corner posts at the back */}
      <Box position={[1.77, 1.96, ZC]} size={[0.08, 0.08, 1.7]} mat={MAT.alu} />
      <Box position={[-1.77, 1.96, ZC]} size={[0.08, 0.08, 1.7]} mat={MAT.alu} />
      <Box position={[1.77, -1.96, ZC]} size={[0.08, 0.08, 1.7]} mat={MAT.alu} />
      <Box position={[-1.77, -1.96, ZC]} size={[0.08, 0.08, 1.7]} mat={MAT.alu} />
      {/* feet */}
      {([-1.4, 1.4] as const).flatMap((x) =>
        ([-0.7, 0.5] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -2.06, z]}>
            <cylinderGeometry args={[0.1, 0.13, 0.12, 24]} />
            <meshStandardMaterial {...MAT.dark} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Motherboard() {
  const zTop = -0.85; // surface of the PCB
  return (
    <group>
      <Box position={[-0.35, 0, -0.87]} size={[2.5, 2.8, 0.04]} mat={MAT.pcb} />
      {/* rear I/O shroud */}
      <Box position={[-1.4, 0.95, zTop + 0.1]} size={[0.3, 0.9, 0.2]} mat={MAT.heatsink} />
      {/* VRM heatsinks */}
      <Box position={[-0.85, 1.22, zTop + 0.08]} size={[1.4, 0.3, 0.16]} mat={MAT.heatsink} />
      <Box position={[-1.25, 0.55, zTop + 0.06]} size={[0.16, 0.7, 0.12]} mat={MAT.heatsink} />
      {/* chipset */}
      <Box position={[0.4, 0.0, zTop + 0.05]} size={[0.42, 0.38, 0.1]} mat={MAT.heatsink} />
      <group position={[0.4, 0, zTop + 0.105]}>
        <GlowInstances items={ringItems(0.12, 16, 0)} size={[0.045, 0.02, 0.01]} offset={0.2} spread={1} />
      </group>
      {/* M.2 shield */}
      <Box position={[-0.3, 0.02, zTop + 0.03]} size={[0.8, 0.14, 0.05]} mat={MAT.heatsink} />
      {/* 24-pin & 8-pin cables */}
      <Box position={[0.86, 0.15, zTop + 0.08]} size={[0.1, 0.9, 0.1]} mat={MAT.dark} />
      <Tube
        points={[
          [-1.5, 1.38, -0.75],
          [-1.45, 1.5, -0.7],
          [-1.7, 1.55, -0.75],
        ]}
        radius={0.04}
      />
    </group>
  );
}

function RamStickWrapper({ x, offset }: { x: number; offset: number }) {
  return (
    <group position={[x, 0.7, -0.71]}>
      <Box position={[0, 0, 0]} size={[0.08, 1.0, 0.26]} mat={MAT.alu} />
      <group position={[0, 0.06, 0.135]}>
        <GlowInstances
          items={stripItems(0.74, 14, "y")}
          size={[0.05, (0.74 / 14) * 0.9, 0.012]}
          offset={offset}
          spread={0.7}
        />
      </group>
    </group>
  );
}
function CPUCooler() {
  const base: Vec3 = [-0.4, 0.5, -0.75];
  const tubeA = useMemo<Vec3[]>(
    () => [
      [-0.68, 0.6, -0.72],
      [-0.95, 0.85, -0.74],
      [-1.2, 1.25, -0.62],
      [-1.46, 1.64, -0.42],
    ],
    [],
  );
  const tubeB = useMemo<Vec3[]>(
    () => [
      [-0.68, 0.4, -0.72],
      [-1.0, 0.7, -0.62],
      [-1.3, 1.15, -0.48],
      [-1.46, 1.64, -0.16],
    ],
    [],
  );
  return (
    <group>
      <group position={base}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.22, 48]} />
          <meshStandardMaterial {...MAT.alu} />
        </mesh>
        {/* mirror cap */}
        <mesh position={[0, 0, 0.112]}>
          <circleGeometry args={[0.25, 48]} />
          <meshStandardMaterial color="#020305" metalness={1} roughness={0.08} />
        </mesh>
        <group position={[0, 0, 0.125]}>
          <GlowInstances
            items={ringItems(0.21, 36, 0)}
            size={[0.04, 0.03, 0.012]}
            offset={0}
            spread={1}
            intensity={2.8}
          />
          <GlowInstances
            items={ringItems(0.12, 20, 0)}
            size={[0.04, 0.02, 0.012]}
            offset={0.5}
            spread={1}
            intensity={2.8}
          />
        </group>
      </group>
      <Tube points={tubeA} radius={0.05} />
      <Tube points={tubeB} radius={0.05} />

      {/* radiator */}
      <Box position={[-0.15, 1.78, ZC]} size={[2.7, 0.24, 1.25]} mat={MAT.alu} />
      <Box position={[-1.55, 1.74, -0.3]} size={[0.14, 0.16, 0.55]} mat={MAT.heatsink} />
    </group>
  );
}

function GPU() {
  const fanX = [-0.8, 0, 0.8];
  const topStrip = useMemo(() => stripItems(2.3, 30, "x"), []);
  return (
    <group position={[-0.4, -0.85, -0.4]}>
      <Box
        position={[0, 0, 0]}
        size={[2.4, 1.0, 0.4]}
        mat={{ color: "#10131a", metalness: 0.85, roughness: 0.3 }}
      />
      {/* front shroud plate */}
      <Box position={[0, 0, 0.205]} size={[2.4, 1.0, 0.014]} mat={MAT.heatsink} />
      {fanX.map((x, i) => (
        <Fan
          key={x}
          position={[x, 0, 0.27]}
          size={0.72}
          offset={0.15 * i + 0.4}
          dir={i % 2 ? -1 : 1}
          blades={11}
          frame={false}
        />
      ))}
      {/* top RGB edge */}
      <group position={[0, 0.505, 0.1]}>
        <GlowInstances items={topStrip} size={[(2.3 / 30) * 0.9, 0.012, 0.16]} offset={0.1} spread={1} />
      </group>
      <group position={[0, 0.46, 0.21]}>
        <GlowInstances items={topStrip} size={[(2.3 / 30) * 0.9, 0.025, 0.012]} offset={0.1} spread={1} />
      </group>
      {/* end plate */}
      <Box position={[1.215, 0, 0]} size={[0.03, 1.0, 0.4]} mat={MAT.dark} />
    </group>
  );
}

function PSUShroud() {
  return (
    <group>
      <Box
        position={[-0.4, -1.695, ZC + 0.0]}
        size={[2.8, 0.49, 1.58]}
        mat={{ color: "#0f121a", metalness: 0.9, roughness: 0.32 }}
      />
      {/* front edge LED strip */}
      <group position={[-0.4, -1.5, 0.705]}>
        <GlowInstances
          items={stripItems(2.7, 44, "x")}
          size={[(2.7 / 44) * 0.9, 0.03, 0.012]}
          offset={0}
          spread={1}
        />
      </group>
      {/* logo ring */}
      <group position={[-1.1, -1.7, 0.705]}>
        <GlowInstances items={ringItems(0.17, 28, 0)} size={[0.04, 0.025, 0.012]} offset={0.3} spread={1} />
        <mesh>
          <circleGeometry args={[0.12, 32]} />
          <meshStandardMaterial {...MAT.dark} />
        </mesh>
      </group>
    </group>
  );
}

export function GamingPC({ glass }: { glass: boolean }) {
  return (
    <group position={[0, 0, 0.1]}>
      <CaseBody glass={glass} />
      <Motherboard />
      <CPUCooler />
      <PSUShroud />
      <GPU />

      {/* RAM */}
      {[0.42, 0.54, 0.66, 0.78].map((x, i) => (
        <RamStickWrapper key={x} x={x} offset={0.08 * i} />
      ))}

      {/* front intake fans (behind smoked glass) */}
      {[1.3, 0, -1.3].map((y, i) => (
        <Fan
          key={y}
          position={[1.5, y, ZC]}
          rotation={[0, Math.PI / 2, 0]}
          size={1.25}
          offset={0.1 * i}
          dir={1}
        />
      ))}
      {/* top radiator fans */}
      {[-0.75, 0.55].map((x, i) => (
        <Fan
          key={x}
          position={[x, 1.6, ZC]}
          rotation={[Math.PI / 2, 0, 0]}
          size={1.25}
          offset={0.35 + 0.12 * i}
          dir={-1}
        />
      ))}
      {/* rear exhaust */}
      <Fan
        position={[-1.55, 0.95, ZC]}
        rotation={[0, Math.PI / 2, 0]}
        size={0.9}
        offset={0.6}
        dir={-1}
        blades={7}
      />

      {/* vertical RGB edge strip on the front */}
      <group position={[1.7, 0, 0.7]}>
        <GlowInstances
          items={stripItems(3.7, 60, "y")}
          size={[0.03, (3.7 / 60) * 0.9, 0.012]}
          offset={0}
          spread={1}
        />
      </group>

      {/* colored light spill */}
      <RGBLight position={[-0.2, 0.2, 0.3]} offset={0} intensity={5} distance={5} />
      <RGBLight position={[1.2, 0, 0.2]} offset={0.4} intensity={3} distance={4} />
      <RGBLight position={[0, -2.15, 0.2]} offset={0.7} intensity={8} distance={7} />
    </group>
  );
}
