"use client";

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LANDSCAPE, PORTRAIT, usePortrait } from '@/context/DeskLayout';
import { useFocus } from '@/context/FocusContext';

// Soft radial-gradient blob, baked once and shared across all shadow planes.
function createBlobTexture() {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.68)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.42)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Full width/depth of each blob (~1.3x the item's footprint so a soft halo shows around it),
// plus a small x/z nudge toward the item's visual centre. Hand-tuned per item.
const SHADOW_SIZE: Record<string, [number, number, number, number]> = {
  pc:         [1.9, 1.35, 0, -0.1],
  hyperplex:  [0.95, 0.95, 0, 0],
  minedock:   [1.2, 1.2, 0, 0],
  bloxvault:  [1.2, 1.2, 0, 0],
  neutrabots: [1.0, 1.0, 0, 0],
  book:       [2.8, 3.4, 0, 0],
  guestbook:  [2.8, 3.4, 0, 0],
  luakey:     [0.95, 0.85, 0, 0],
  polaroid_1: [1.15, 1.3, 0, 0],
  polaroid_2: [1.15, 1.3, 0, 0],
  polaroid_3: [1.15, 1.3, 0, 0],
};

function ContactBlob({
  id,
  size,
  texture,
}: {
  id: string;
  size: [number, number, number, number];
  texture: THREE.Texture;
}) {
  const portrait = usePortrait();
  const { focusedItem } = useFocus();
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const opacityRef = useRef(1);

  const table = portrait ? PORTRAIT : LANDSCAPE;
  const rest = table[id];
  const [sx, sz, ox, oz] = size;

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const dt = Math.min(delta, 0.1);
    // The PC monitor stays on the desk when focused, so its stand shadow stays grounded
    const target = focusedItem === id && id !== 'pc' ? 0 : 1;

    if (Math.abs(opacityRef.current - target) > 0.002) {
      opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, target, 10 * dt);
    } else {
      opacityRef.current = target;
    }

    const alpha = opacityRef.current;
    mat.opacity = alpha;
    mesh.visible = alpha > 0.005;

    // As an object lifts off the desk, its diffused shadow spreads slightly wider while fading out
    const spread = 1 + (1 - alpha) * 0.28;
    mesh.scale.set(sx * spread, sz * spread, 1);
  });

  if (!rest) return null;

  return (
    <mesh
      ref={meshRef}
      position={[rest.pos[0] + ox, 0.006, rest.pos[2] + oz]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[sx, sz, 1]}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={1}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function DeskShadows() {
  const texture = useMemo(() => createBlobTexture(), []);
  const entries = useMemo(() => Object.entries(SHADOW_SIZE), []);

  if (!texture) return null;

  return (
    <group>
      {entries.map(([id, size]) => (
        <ContactBlob key={id} id={id} size={size} texture={texture} />
      ))}
    </group>
  );
}
