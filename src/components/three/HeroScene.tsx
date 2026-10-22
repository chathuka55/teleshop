"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, PresentationControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import type * as THREE from "three";
import { FitToSize } from "./FitToSize";
import { GamingPC } from "./pc/GamingPC";
import { GltfModel, ModelErrorBoundary } from "./models/GltfModel";
import { ProceduralPhone } from "./models/ProceduralPhone";
import { heroSlides, type HeroSlide } from "./hero-slides";

export type HeroSceneProps = {
  index: number;
  /** false while off-screen or the tab is hidden → render loop stops */
  active: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  onReady: () => void;
};

/** Size (largest dimension, world units) each slide is normalised to. */
const SLIDE_SIZE: Record<HeroSlide["id"], number> = { phone: 2.6, pc: 2.9, headset: 2.4 };

function SlideModel({ slide }: { slide: HeroSlide }) {
  if (slide.id === "pc") return <GamingPC glass />;
  const fallback = slide.id === "phone" ? <ProceduralPhone /> : null;
  if (!slide.modelUrl) return fallback;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <GltfModel url={slide.modelUrl} />
    </ModelErrorBoundary>
  );
}

/** Slides in from the right whenever `slideKey` changes, then idles with a slow turn. */
function SlideIn({ slideKey, spin, children }: { slideKey: number; spin: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const started = useRef(false);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    // First slide appears in place (poster → 3D); later ones slide in.
    g.position.x = started.current ? 4.5 : 0;
    g.rotation.y = started.current ? -0.9 : 0;
    started.current = true;
  }, [slideKey]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 5);
    g.position.x += (0 - g.position.x) * k;
    if (spin) g.rotation.y += dt * 0.35;
    else g.rotation.y += (0 - g.rotation.y) * k;
  });

  return <group ref={ref}>{children}</group>;
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

/** The WebGL canvas for the hero. Loaded with next/dynamic({ ssr: false }) only. */
export default function HeroScene({ index, active, reducedMotion, isMobile, onReady }: HeroSceneProps) {
  // Warm the GLB cache after the first slide is up so later slides appear without a blank frame.
  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const s of heroSlides) if (s.modelUrl) GltfModel.preload(s.modelUrl);
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const slide = heroSlides[index] ?? heroSlides[0];
  if (!slide) return null;

  return (
    <Canvas
      aria-hidden="true"
      frameloop={active ? "always" : "never"}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0.35, 7.6], fov: 32, near: 0.1, far: 60 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 7, 6]} intensity={1.2} />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color="#3b82f6" />

      <Suspense fallback={null}>
        <Environment resolution={isMobile ? 64 : 256}>
          <Lightformer
            form="rect"
            intensity={2.2}
            position={[0, 6, 4]}
            scale={[14, 4, 1]}
            onUpdate={(l) => l.lookAt(0, 0, 0)}
          />
          <Lightformer
            form="rect"
            intensity={1.4}
            position={[-7, 2, 3]}
            scale={[6, 6, 1]}
            color="#3b82f6"
            onUpdate={(l) => l.lookAt(0, 0, 0)}
          />
          <Lightformer
            form="rect"
            intensity={1}
            position={[7, 1, -3]}
            scale={[6, 6, 1]}
            color="#f59e0b"
            onUpdate={(l) => l.lookAt(0, 0, 0)}
          />
          <Lightformer
            form="ring"
            intensity={1.5}
            position={[0, 3, -7]}
            scale={6}
            onUpdate={(l) => l.lookAt(0, 0, 0)}
          />
        </Environment>

        <PresentationControls
          global={false}
          cursor
          snap
          speed={1.4}
          polar={[-0.25, 0.3]}
          azimuth={[-0.9, 0.9]}
        >
          <Float enabled={!reducedMotion} speed={1.6} rotationIntensity={0.15} floatIntensity={0.5}>
            <SlideIn slideKey={index} spin={!reducedMotion}>
              <FitToSize key={slide.id} size={SLIDE_SIZE[slide.id]}>
                <group rotation={slide.id === "pc" ? [0, -0.65, 0] : [0, 0, 0]}>
                  <SlideModel slide={slide} />
                </group>
              </FitToSize>
            </SlideIn>
          </Float>
        </PresentationControls>

        {!isMobile && (
          <ContactShadows
            position={[0, -1.75, 0]}
            opacity={0.55}
            scale={9}
            blur={2.6}
            far={3.5}
            color="#000000"
          />
        )}
      </Suspense>

      {!isMobile && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.9} radius={0.65} />
        </EffectComposer>
      )}

      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
