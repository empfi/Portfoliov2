"use client";

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { animated } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

function makeRoundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const VISOR_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.38, 0.21, 0.048), 16);
const EYE_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.064, 0.092, 0.03), 16);
const MOUTH_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.048, 0.013, 0.006), 12);

function createRearVentTexture() {
  if (typeof document === 'undefined') return null;
  const w = 256,
    h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#262b35';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#0d0f14';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.roundRect(28 + i * 30, 26, 14, 76, 7);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function NeutrabotsToy() {
  const rest = useRest('neutrabots');
  const { isHeld, pos, scale, rot, spinRef, groupHandlers } = useInspectable({
    id: 'neutrabots',
    restPos: rest.pos,
    restRot: rest.rot,
    heldRot: [-0.18, -0.14, 0],
    heldScale: 1.62,
  });

  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = t % 4.2;
    const blink = cycle > 4.02 ? Math.max(0.08, Math.abs(cycle - 4.11) / 0.09) : 1;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = blink;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = blink;
    if (headGroupRef.current && !isHeld) {
      headGroupRef.current.rotation.z = Math.sin(t * 1.1) * 0.035;
      headGroupRef.current.rotation.y = Math.sin(t * 0.65) * 0.06;
    } else if (headGroupRef.current) {
      headGroupRef.current.rotation.z = 0;
      headGroupRef.current.rotation.y = 0;
    }
  });

  const ventTex = useMemo(() => createRearVentTexture(), []);

  return (
    <animated.group position={pos as any} scale={scale as any} rotation={rot as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* ── 1. Sturdy Rounded Bot Feet (flush at y = -0.30, no dock plate) ── */}
        {[-0.088, 0.088].map((fx) => (
          <RoundedBox
            key={fx}
            args={[0.105, 0.052, 0.165]}
            radius={0.02}
            smoothness={3}
            position={[fx, -0.274, 0.012]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#1b1e26" metalness={0.6} roughness={0.36} />
          </RoundedBox>
        ))}

        {/* ── 2. Clean Matte-Graphite Torso & Articulated Side Arms (no text plate) ── */}
        <RoundedBox args={[0.34, 0.24, 0.26]} radius={0.055} smoothness={4} position={[0, -0.135, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#232731" metalness={0.55} roughness={0.34} />
        </RoundedBox>

        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.2, -0.13, 0]} rotation={[0.12, 0, side * -0.1]}>
            <mesh position={[side * -0.02, 0.048, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, 0.038, 16]} />
              <meshStandardMaterial color="#6e7687" metalness={0.85} roughness={0.26} />
            </mesh>
            <RoundedBox args={[0.066, 0.185, 0.092]} radius={0.028} smoothness={3} castShadow>
              <meshStandardMaterial color="#2c313d" metalness={0.58} roughness={0.32} />
            </RoundedBox>
          </group>
        ))}

        {/* Neck swivel collar */}
        <mesh position={[0, 0.0, 0]}>
          <cylinderGeometry args={[0.092, 0.108, 0.042, 24]} />
          <meshStandardMaterial color="#171920" metalness={0.75} roughness={0.35} />
        </mesh>

        {/* ── 3. Clean Space-Grey Head & Crisp OLED Visor (no headphones) ── */}
        <group ref={headGroupRef} position={[0, 0.175, 0]}>
          <RoundedBox args={[0.48, 0.32, 0.35]} radius={0.075} smoothness={5} castShadow receiveShadow>
            <meshStandardMaterial color="#2a2f3b" metalness={0.6} roughness={0.3} />
          </RoundedBox>

          {/* Glossy Black OLED Glass Visor */}
          <mesh geometry={VISOR_GEO} position={[0, -0.005, 0.176]}>
            <meshStandardMaterial color="#07090e" metalness={0.2} roughness={0.08} />
          </mesh>

          {/* Solid Crisp Glowing Blurple/Sky OLED Eyes */}
          <mesh ref={leftEyeRef} geometry={EYE_GEO} position={[-0.092, 0.01, 0.178]}>
            <meshBasicMaterial color="#8fb2ff" />
          </mesh>
          <mesh ref={rightEyeRef} geometry={EYE_GEO} position={[0.092, 0.01, 0.178]}>
            <meshBasicMaterial color="#8fb2ff" />
          </mesh>

          {/* Subtle OLED mouth pill */}
          <mesh geometry={MOUTH_GEO} position={[0, -0.064, 0.178]}>
            <meshBasicMaterial color="#7aa2ff" />
          </mesh>

          {/* Rear machined cooling grille */}
          {ventTex && (
            <mesh position={[0, 0, -0.176]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.25, 0.12]} />
              <meshStandardMaterial map={ventTex} roughness={0.45} metalness={0.5} />
            </mesh>
          )}
        </group>
      </group>
    </animated.group>
  );
}
