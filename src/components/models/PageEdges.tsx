"use client";

import React, { useMemo } from 'react';
import * as THREE from 'three';

let stripeTex: THREE.CanvasTexture | null = null;

// Fine horizontal lines that read as the stacked edges of paper
function getStripeTexture() {
  if (stripeTex || typeof document === 'undefined') return stripeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  for (let y = 0; y < 24; y++) {
    ctx.fillStyle = y % 2 ? '#f6f1e6' : y % 6 === 0 ? '#cfc6b4' : '#e4dccb';
    ctx.fillRect(0, y, 4, 1);
  }
  stripeTex = new THREE.CanvasTexture(canvas);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  return stripeTex;
}

/** Striped paper edges wrapped around the three open sides of a page block (spine at -x). */
export function PageEdges({ w, h, d, position }: { w: number; h: number; d: number; position: [number, number, number] }) {
  const tex = useMemo(() => getStripeTexture(), []);
  const inset = 0.004;
  return (
    <group position={position}>
      <mesh position={[w / 2 + inset, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d * 0.98, h * 0.8]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 0, side * (d / 2 + inset)]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[w * 0.98, h * 0.8]} />
          <meshStandardMaterial map={tex} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
