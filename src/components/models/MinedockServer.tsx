"use client";

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { animated } from '@react-spring/three';
import { RoundedBox } from '@react-three/drei';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

const SLED_Y = [0.18, 0.03, -0.12, -0.27];
const FEET: [number, number][] = [
  [-0.27, -0.27],
  [0.27, -0.27],
  [-0.27, 0.27],
  [0.27, 0.27],
];

/**
 * Clean Minimalist MineDock Server
 * - Sleek modern enterprise server tower with 4 hot-swap drive bays.
 * - Upper dark glass status bar with steady emerald health light.
 * - Fully static on desk (zero flickering LEDs, zero spinning fans).
 */
export function MinedockServer() {
  const rest = useRest('minedock');
  const { pos, scale, rot, spinRef, groupHandlers } = useInspectable({
    id: 'minedock',
    restPos: rest.pos,
    restRot: rest.rot,
    heldScale: 1.4,
  });

  const chassisMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#282c35',
        metalness: 0.6,
        roughness: 0.38,
      }),
    [],
  );

  const sledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#383d49',
        metalness: 0.5,
        roughness: 0.32,
      }),
    [],
  );

  const latchMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        metalness: 0.85,
        roughness: 0.22,
      }),
    [],
  );

  return (
    <animated.group position={pos as any} scale={scale as any} rotation={rot as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* ── Server Chassis ── */}
        <RoundedBox args={[0.68, 0.90, 0.68]} radius={0.025} smoothness={4} castShadow receiveShadow>
          <primitive object={chassisMat} attach="material" />
        </RoundedBox>

        {/* ── Left & Right Rack Ears ── */}
        {[-0.345, 0.345].map((x) => (
          <mesh key={x} position={[x, 0, 0.32]}>
            <boxGeometry args={[0.02, 0.86, 0.05]} />
            <meshStandardMaterial color="#191c22" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* ── Upper Status Glass Header ── */}
        <mesh position={[0, 0.355, 0.342]}>
          <boxGeometry args={[0.56, 0.09, 0.015]} />
          <meshStandardMaterial color="#0f1115" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Steady Emerald Health Bar (Static) */}
        <mesh position={[0, 0.355, 0.351]}>
          <planeGeometry args={[0.46, 0.016]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.4} />
        </mesh>

        {/* ── 4 Hot-Swap Drive Bays ── */}
        {SLED_Y.map((y, i) => (
          <group key={i} position={[0, y, 0.342]}>
            {/* Drive Sled Face */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.56, 0.12, 0.014]} />
              <primitive object={sledMat} attach="material" />
            </mesh>

            {/* Horizontal Vent Slit */}
            <mesh position={[-0.06, 0, 0.008]}>
              <planeGeometry args={[0.36, 0.024]} />
              <meshBasicMaterial color="#111317" />
            </mesh>

            {/* Release Lever Latch */}
            <mesh position={[0.20, 0, 0.012]}>
              <boxGeometry args={[0.07, 0.08, 0.014]} />
              <primitive object={latchMat} attach="material" />
            </mesh>

            {/* Steady Status Micro-Dot (Static, zero blinking) */}
            <mesh position={[0.245, 0, 0.02]}>
              <circleGeometry args={[0.008, 16]} />
              <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.8} />
            </mesh>
          </group>
        ))}

        {/* ── Bottom Power Button ── */}
        <group position={[0.20, -0.395, 0.344]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.01, 24]} />
            <meshStandardMaterial color="#191c22" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.006]}>
            <ringGeometry args={[0.012, 0.016, 24]} />
            <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={2.0} />
          </mesh>
        </group>

        {/* ── Rubber Feet ── */}
        {FEET.map(([x, z], i) => (
          <mesh key={i} position={[x, -0.46, z]}>
            <cylinderGeometry args={[0.035, 0.04, 0.02, 16]} />
            <meshStandardMaterial color="#111317" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </animated.group>
  );
}
