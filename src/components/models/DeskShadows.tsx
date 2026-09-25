"use client";

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LANDSCAPE, PORTRAIT, usePortrait } from '@/context/DeskLayout';

// Soft radial-gradient blob, baked once and reused for every item. A live ContactShadows
// re-renders the whole scene into an offscreen buffer every frame to get a real shadow —
// measured at ~500 of this page's ~1000 draw calls per frame on its own. These are baked
// per item's fixed rest spot instead: one instanced draw call for all of them combined.
function createBlobTexture() {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Full width/depth of each blob (~1.3x the item's footprint so a soft halo shows around it),
// plus a small x/z nudge toward the item's visual centre. Hand-tuned per item.
const SHADOW_SIZE: Record<string, [number, number, number, number]> = {
  hyperplex:  [1.15, 1.15, 0, 0],
  luakey:     [1.2, 1.2, 0.05, 0],
  minedock:   [1.2, 1.2, 0, 0],
  bloxvault:  [1.2, 1.2, 0, 0],
  neutrabots: [1.0, 1.0, 0, 0],
  book:       [2.8, 3.4, 0, 0],
  guestbook:  [2.8, 3.4, 0, 0],
  phone:      [1.5, 2.7, 0, 0],
  polaroid_1: [1.15, 1.3, 0, 0],
  polaroid_2: [1.15, 1.3, 0, 0],
  polaroid_3: [1.15, 1.3, 0, 0],
};

const dummy = new THREE.Object3D();

export function DeskShadows() {
  const portrait = usePortrait();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createBlobTexture(), []);
  const entries = useMemo(() => Object.entries(SHADOW_SIZE), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const table = portrait ? PORTRAIT : LANDSCAPE;
    entries.forEach(([id, [sx, sz, ox, oz]], i) => {
      const rest = table[id];
      dummy.position.set((rest?.pos[0] ?? 0) + ox, 0.052, (rest?.pos[2] ?? 0) + oz);
      // Rotation must be set per-instance, together with position: an instance's transform
      // is T*R*S like any object's, but the parent instancedMesh below has NO rotation of
      // its own — parent-rotating it while placing instances in that rotated local frame
      // does not preserve world coordinates (rotation and translation don't commute).
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(sx, sz, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [portrait, entries]);

  if (!texture) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, entries.length]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}
