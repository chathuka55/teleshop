"use client";

import { useGLTF } from "@react-three/drei";
import { Component, useMemo, type ReactNode } from "react";

/**
 * Loads a compressed .glb (meshopt + WebP, see docs/06-3d-hero.md §2).
 * Draco is OFF on purpose: drei would fetch the decoder from a CDN, which our CSP blocks.
 */
export function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, false, true);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

GltfModel.preload = (url: string): void => {
  useGLTF.preload(url, false, true);
};

/** Shows `fallback` when a model fails to load (missing file, bad textures…). */
export class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: (error: Error) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
