"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";

/** Desktop-only glow. Its own chunk, so phones never download the post-processing code. */
export default function HeroEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.9} radius={0.65} />
    </EffectComposer>
  );
}
