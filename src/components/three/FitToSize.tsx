"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

/** Bounding box of every mesh under `root`, expressed in `space`'s local coordinates. */
function localBounds(root: THREE.Object3D, space: THREE.Object3D): THREE.Box3 {
  space.updateWorldMatrix(true, true);
  const toLocal = space.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const gb = mesh.geometry.boundingBox;
    if (!gb) return;
    tmp.copy(gb).applyMatrix4(mesh.matrixWorld).applyMatrix4(toLocal);
    box.union(tmp);
  });
  return box;
}

/**
 * Centres its children on the origin and scales them so their largest dimension equals `size`.
 * Measures in its own local space, so parent motion (slide-in, spin, float) does not matter.
 */
export function FitToSize({ size, children }: { size: number; children: ReactNode }) {
  const space = useRef<THREE.Group>(null);
  const scaler = useRef<THREE.Group>(null);
  const offset = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const s = scaler.current;
    const o = offset.current;
    if (!space.current || !s || !o) return;
    s.scale.setScalar(1);
    o.position.set(0, 0, 0);
    const box = localBounds(o, space.current);
    if (box.isEmpty()) return;
    const dims = box.getSize(new THREE.Vector3());
    const max = Math.max(dims.x, dims.y, dims.z) || 1;
    o.position.copy(box.getCenter(new THREE.Vector3()).negate());
    s.scale.setScalar(size / max);
    setVisible(true);
    // Children are fixed per slide (the parent remounts us with a new `key`), so only `size` matters.
  }, [size]);

  return (
    <group ref={space} visible={visible}>
      <group ref={scaler}>
        <group ref={offset}>{children}</group>
      </group>
    </group>
  );
}
