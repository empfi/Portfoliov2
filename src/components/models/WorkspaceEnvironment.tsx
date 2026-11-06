"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useTexture } from '@react-three/drei';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { usePortrait } from '@/context/DeskLayout';
import { useFocus } from '@/context/FocusContext';

let rectAreaInitialized = false;
function ensureRectAreaLight() {
  if (!rectAreaInitialized && typeof window !== 'undefined') {
    RectAreaLightUniformsLib.init();
    rectAreaInitialized = true;
  }
}

const ITEM_LED_COLORS: Record<string, string> = {
  pc: '#4da6ff',         // Yosemite twilight blue
  hyperplex: '#34d399',  // Emerald SMP green
  minedock: '#22c55e',   // Server telemetry green
  bloxvault: '#f59e0b',  // Vault brass-amber
  neutrabots: '#6366f1', // Discord blurple-indigo
  book: '#3b82f6',       // Journal sapphire blue
  guestbook: '#ea580c',  // Leather cognac warm orange
  phone: '#38bdf8',      // Smartphone ice blue
  airpods: '#e2e8f0',    // Apple MagSafe porcelain white
  polaroid_1: '#fbbf24', // Warm vintage film gold
  polaroid_2: '#fbbf24',
  polaroid_3: '#fbbf24',
  luakey: '#a855f7',     // Bytecode violet
};

const DEFAULT_LED_COLOR = '#ffa654';

/**
 * High-resolution warm European oak wide-plank floor texture.
 * Planks run front-to-back (vertical in UV space -> Z in world space) so the visible floor strip
 * beneath the desk on desktop displays ~14 distinct warm oak boards side-by-side with crisp seams.
 */
function createOakFloorTexture() {
  if (typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const plankShades = [
    '#2c1c11',
    '#22150d',
    '#322013',
    '#26180e',
    '#1c1109',
    '#2e1e12',
    '#24160e',
    '#291a10',
  ];

  const cols = 8;
  const colW = size / cols;

  for (let c = 0; c < cols; c++) {
    const x = c * colW;
    const stagger = ((c * 293 + 137) % (size / 2));

    for (let seg = -1; seg < 3; seg++) {
      const py = seg * (size / 2) + stagger;
      const ph = size / 2;
      const base = plankShades[(c * 3 + seg + 8) % plankShades.length];

      // Subtle warm gradient across each board width
      const grad = ctx.createLinearGradient(x, 0, x + colW, 0);
      grad.addColorStop(0, base);
      grad.addColorStop(0.5, '#342114');
      grad.addColorStop(1, base);
      ctx.fillStyle = base;
      ctx.fillRect(x, py, colW, ph);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = grad;
      ctx.fillRect(x, py, colW, ph);
      ctx.globalAlpha = 1;

      // Lengthwise oak wood-grain streaks & warm cathedral fibers
      for (let g = 0; g < 26; g++) {
        const hash = ((c * 97 + seg * 53 + g * 37) & 0xffff);
        const gx = x + 5 + (hash % (colW - 10));
        const gw = 1 + (hash % 3);
        ctx.fillStyle = g % 3 === 0 ? 'rgba(180, 120, 68, 0.05)' : 'rgba(18, 9, 4, 0.22)';
        ctx.fillRect(gx, py + 3, gw, ph - 6);
      }

      // Subtle plank end-joint bevel (horizontal seam)
      ctx.fillStyle = '#100804';
      ctx.fillRect(x, py, colW, 4);
      ctx.fillStyle = 'rgba(180, 120, 68, 0.06)';
      ctx.fillRect(x, py + 4, colW, 2);
    }

    // Crisp V-groove seam between adjacent oak boards (vertical seam)
    ctx.fillStyle = '#0c0603';
    ctx.fillRect(x, 0, 5, size);
    ctx.fillStyle = 'rgba(180, 120, 68, 0.08)';
    ctx.fillRect(x + 5, 0, 2, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7.5, 4.5);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Full-width COB bias lighting tucked cleanly behind the rear face of the desk.
 * Smoothly transitions color based on the currently picked-up / focused item.
 */
function DeskBiasLighting({ halfW, halfD }: { halfW: number; halfD: number }) {
  ensureRectAreaLight();

  const { focusedItem } = useFocus();
  const lightRef = useRef<THREE.RectAreaLight>(null);

  const targetHex = (focusedItem && ITEM_LED_COLORS[focusedItem]) || DEFAULT_LED_COLOR;
  const targetColor = useMemo(() => new THREE.Color(targetHex), [targetHex]);
  const targetIntensity = focusedItem ? 11.5 : 8.5;
  const fullDeskWidth = halfW * 2;

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const dt = Math.min(delta, 0.1);
    const alpha = 1 - Math.exp(-5.0 * dt);
    light.color.lerp(targetColor, alpha);
    light.intensity = THREE.MathUtils.lerp(light.intensity, targetIntensity, alpha);
  });

  return (
    <rectAreaLight
      ref={lightRef}
      color={DEFAULT_LED_COLOR}
      intensity={8.5}
      width={fullDeskWidth}
      height={0.34}
      position={[0, -0.16, -halfD - 0.02]}
      rotation={[0.35, 0, 0]}
    />
  );
}

export function WorkspaceEnvironment() {
  const portrait = usePortrait();

  // Desk dimensions: 14 x 8 in landscape, 8 x 14 in portrait
  const halfW = portrait ? 4 : 7;
  const halfD = portrait ? 7 : 4;
  const wallZ = -halfD - 0.36;

  // Cloned PBR walnut wood textures for the solid timber desk legs & apron + floor normal/roughness
  const [rawWoodColor, rawWoodNormal, rawWoodRough] = useTexture([
    '/textures/wood/color.webp',
    '/textures/wood/normal.webp',
    '/textures/wood/roughness.webp',
  ]);

  const { legWood, apronWood, floorNormal, floorRough, floorTex } = useMemo(() => {
    const makeWoodSet = (rx: number, ry: number) => {
      const c = rawWoodColor.clone();
      const n = rawWoodNormal.clone();
      const r = rawWoodRough.clone();
      c.colorSpace = THREE.SRGBColorSpace;
      [c, n, r].forEach((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rx, ry);
        t.needsUpdate = true;
      });
      return { color: c, normal: n, rough: r };
    };

    const fn = rawWoodNormal.clone();
    const fr = rawWoodRough.clone();
    [fn, fr].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(7.5, 4.5);
      t.needsUpdate = true;
    });

    return {
      legWood: makeWoodSet(0.45, 1.6),
      apronWood: makeWoodSet(2.6, 0.25),
      floorNormal: fn,
      floorRough: fr,
      floorTex: createOakFloorTexture(),
    };
  }, [rawWoodColor, rawWoodNormal, rawWoodRough]);

  // Acoustic wood slats across the full studio wall
  const slatPositions = useMemo(() => {
    const count = portrait ? 35 : 57;
    const spacing = 0.36;
    const startX = -((count - 1) * spacing) / 2;
    return Array.from({ length: count }, (_, i) => startX + i * spacing);
  }, [portrait]);

  const slatRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = slatRef.current;
    if (!mesh) return;
    slatPositions.forEach((x, i) => {
      dummy.position.set(x, 3.6, wallZ + 0.045);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [slatPositions, wallZ, dummy]);

  const legCoords: [number, number][] = [
    [-halfW + 0.85, -halfD + 0.65],
    [halfW - 0.85, -halfD + 0.65],
    [-halfW + 0.85, halfD - 0.65],
    [halfW - 0.85, halfD - 0.65],
  ];

  return (
    <group>
      {/* ── 1. Solid Walnut Wood Textured Table Legs & Recessed Apron Frame ── */}
      {legCoords.map(([lx, lz], i) => (
        <group key={i} position={[lx, 0, lz]}>
          <RoundedBox args={[0.54, 1.88, 0.54]} radius={0.04} smoothness={3} position={[0, -1.89, 0]} receiveShadow>
            <meshStandardMaterial
              map={legWood.color}
              normalMap={legWood.normal}
              roughnessMap={legWood.rough}
              roughness={0.88}
            />
          </RoundedBox>
          {/* Brushed brass/bronze leveling foot ferrule resting on the oak floor at y = -2.85 */}
          <RoundedBox args={[0.55, 0.08, 0.55]} radius={0.022} smoothness={2} position={[0, -2.81, 0]}>
            <meshStandardMaterial color="#8a7248" metalness={0.78} roughness={0.32} />
          </RoundedBox>
        </group>
      ))}

      {/* Matching walnut wood recessed front stretcher rail */}
      <RoundedBox
        args={[halfW * 2 - 2.1, 0.18, 0.2]}
        radius={0.02}
        smoothness={2}
        position={[0, -1.09, halfD - 0.65]}
        receiveShadow
      >
        <meshStandardMaterial
          map={apronWood.color}
          normalMap={apronWood.normal}
          roughnessMap={apronWood.rough}
          roughness={0.88}
        />
      </RoundedBox>

      {/* ── 2. Rich Dark Smoked Oak Hardwood Floor (seamlessly shaded under desk) ── */}
      <mesh position={[0, -2.85, 3.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[56, 36]} />
        <meshStandardMaterial
          map={floorTex ?? undefined}
          normalMap={floorNormal}
          normalScale={new THREE.Vector2(0.25, 0.25)}
          roughnessMap={floorRough}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Baseboard trim along bottom of studio wall */}
      <mesh position={[0, -2.69, wallZ + 0.06]}>
        <boxGeometry args={[56, 0.32, 0.12]} />
        <meshStandardMaterial color="#1d140d" roughness={0.75} />
      </mesh>

      {/* ── 3. Studio Backdrop Wall & Vertical Wood Slats ── */}
      <mesh position={[0, 3.6, wallZ]}>
        <planeGeometry args={[56, 22]} />
        <meshStandardMaterial color="#12100e" roughness={0.9} metalness={0.05} />
      </mesh>

      <instancedMesh ref={slatRef} args={[undefined, undefined, slatPositions.length]}>
        <boxGeometry args={[0.16, 14.4, 0.09]} />
        <meshStandardMaterial color="#2b1e14" roughness={0.72} metalness={0.08} />
      </instancedMesh>

      {/* ── 4. Item-Reactive Full-Width LED Backlight ── */}
      <DeskBiasLighting halfW={halfW} halfD={halfD} />
    </group>
  );
}
