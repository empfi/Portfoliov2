"use client";

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { animated } from '@react-spring/three';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

// Canonical 16×16 Minecraft Diamond Sword pixel matrix (symmetric across anti-diagonal)
const SWORD_SPRITE = [
  '.............OOO',
  '............OLHO',
  '...........OLHDO',
  '..........OLHDO.',
  '.........OLHDO..',
  '........OLHDO...',
  '.......OLHDO....',
  '..GG..OLHDO.....',
  '..GCGLHDO.......',
  '...GCCHDO.......',
  '....wCCG........',
  '...wWwCG........',
  '..wWu.GCG.......',
  'PPWu...GG.......',
  'PHP.............',
  'PPP.............',
];

const PALETTE: Record<string, { color: string; wood?: boolean; proud?: boolean }> = {
  // Blade & Diamond facets
  O: { color: '#114b47' }, // Dark teal razor outline
  L: { color: '#4bf2dc' }, // Upper-left bright facet
  H: { color: '#9cfef0' }, // Central gleaming diamond ridge
  D: { color: '#22b5a6' }, // Lower-right mid-teal facet
  // Crossguard & Pommel (slightly thicker 3D relief)
  G: { color: '#12544f', proud: true }, // Guard/pommel dark border
  C: { color: '#2dd4bf', proud: true }, // Guard crystalline core
  P: { color: '#114b47', proud: true }, // Pommel border
  // Oak Grip
  W: { color: '#8a6230', wood: true }, // Oak handle highlight
  w: { color: '#694921', wood: true }, // Oak handle midtone
  u: { color: '#3d2911', wood: true }, // Oak handle shadow edge
};

const PIXEL = 0.068;
const THICK = 0.068;
const VOXEL_GEO = new THREE.BoxGeometry(PIXEL, PIXEL, THICK);

interface VoxelData {
  x: number;
  y: number;
  zScale: number;
  color: string;
}

function parseSwordVoxels() {
  const diamond: VoxelData[] = [];
  const wood: VoxelData[] = [];

  for (let r = 0; r < 16; r++) {
    const row = SWORD_SPRITE[r];
    for (let c = 0; c < 16; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const spec = PALETTE[ch];
      if (!spec) continue;

      const isPommelCore = r === 14 && c === 1;
      const entry: VoxelData = {
        x: (c - 7.5) * PIXEL,
        y: (7.5 - r) * PIXEL,
        zScale: spec.proud || isPommelCore ? 1.28 : 1.0,
        color: spec.color,
      };

      if (spec.wood) wood.push(entry);
      else diamond.push(entry);
    }
  }

  return { diamond, wood };
}

export function MinecraftBlock() {
  const rest = useRest('hyperplex');
  const { pos, scale, rot, spinRef, groupHandlers } = useInspectable({
    id: 'hyperplex',
    restPos: rest.pos,
    restRot: rest.rot,
    heldRot: [-0.18, 0.2, 0],
    heldScale: 1.18,
  });

  const diamondRef = useRef<THREE.InstancedMesh>(null);
  const woodRef = useRef<THREE.InstancedMesh>(null);
  const { diamond, wood } = useMemo(() => parseSwordVoxels(), []);

  useLayoutEffect(() => {
    const fill = (mesh: THREE.InstancedMesh | null, list: VoxelData[]) => {
      if (!mesh) return;
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      const col = new THREE.Color();
      list.forEach((v, i) => {
        p.set(v.x, v.y, 0);
        scl.set(1.005, 1.005, v.zScale);
        m.compose(p, q, scl);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, col.set(v.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    fill(diamondRef.current, diamond);
    fill(woodRef.current, wood);
  }, [diamond, wood]);

  return (
    <animated.group position={pos as any} scale={scale as any} rotation={rot as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* Invisible hit box so clicking & grabbing between diagonal sword pixels is effortless */}
        <mesh visible={false}>
          <boxGeometry args={[1.15, 1.15, 0.14]} />
        </mesh>

        {/* Crystalline Diamond Blade, Guard & Pommel Voxels */}
        <instancedMesh ref={diamondRef} args={[VOXEL_GEO, undefined, diamond.length]} castShadow receiveShadow>
          <meshStandardMaterial roughness={0.26} metalness={0.32} />
        </instancedMesh>

        {/* Matte Oak Wood Grip Voxels */}
        <instancedMesh ref={woodRef} args={[VOXEL_GEO, undefined, wood.length]} castShadow receiveShadow>
          <meshStandardMaterial roughness={0.86} metalness={0.04} />
        </instancedMesh>
      </group>
    </animated.group>
  );
}
