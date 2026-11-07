"use client";

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { animated } from '@react-spring/three';
import { RoundedBox } from '@react-three/drei';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

const SPOKE_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
const FEET: [number, number][] = [
  [-0.27, -0.27],
  [0.27, -0.27],
  [-0.27, 0.27],
  [0.27, 0.27],
];

/**
 * Clean Minimalist Bloxvault Safe
 * - Sleek modern vault body with heavy-gauge beveled door.
 * - Iconic 3-spoke brushed chrome wheel with gold central emblem.
 * - Minimalist digital electronic access pad with calm steady status LED.
 * - Fully static on desk (zero looping animations).
 */
export function BloxvaultSafe() {
  const rest = useRest('bloxvault');
  const { pos, scale, rot, spinRef, groupHandlers } = useInspectable({
    id: 'bloxvault',
    restPos: rest.pos,
    restRot: rest.rot,
    heldScale: 1.48,
  });

  const steelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e323b',
        metalness: 0.55,
        roughness: 0.38,
      }),
    [],
  );

  const doorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3d424e',
        metalness: 0.65,
        roughness: 0.28,
      }),
    [],
  );

  const chromeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        metalness: 0.96,
        roughness: 0.16,
      }),
    [],
  );

  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eab308',
        metalness: 0.9,
        roughness: 0.25,
      }),
    [],
  );

  return (
    <animated.group position={pos as any} scale={scale as any} rotation={rot as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* ── Main Safe Body ── */}
        <RoundedBox args={[0.72, 0.72, 0.72]} radius={0.045} smoothness={4} castShadow receiveShadow>
          <primitive object={steelMat} attach="material" />
        </RoundedBox>

        {/* ── Door Recess Frame ── */}
        <mesh position={[0, 0, 0.355]}>
          <planeGeometry args={[0.60, 0.60]} />
          <meshStandardMaterial color="#111317" roughness={0.8} />
        </mesh>

        {/* ── Heavy Beveled Safe Door ── */}
        <RoundedBox args={[0.55, 0.55, 0.038]} radius={0.02} smoothness={3} position={[0, 0, 0.375]} castShadow>
          <primitive object={doorMat} attach="material" />
        </RoundedBox>

        {/* ── Clean 3-Spoke Chrome Vault Wheel ── */}
        <group position={[-0.08, -0.02, 0.40]}>
          {/* Wheel Hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.032, 28]} />
            <primitive object={chromeMat} attach="material" />
          </mesh>

          {/* Central Gold Emblem Cap */}
          <mesh position={[0, 0, 0.017]}>
            <circleGeometry args={[0.042, 24]} />
            <primitive object={goldMat} attach="material" />
          </mesh>

          {/* Keyhole / lock slot in center of emblem */}
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.012, 0.024]} />
            <meshBasicMaterial color="#111317" />
          </mesh>

          {/* 3 Clean Spoke Handles */}
          {SPOKE_ANGLES.map((angle) => (
            <group key={angle} rotation={[0, 0, angle]}>
              <mesh position={[0.09, 0, 0.005]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.011, 0.011, 0.12, 14]} />
                <primitive object={chromeMat} attach="material" />
              </mesh>
            </group>
          ))}
        </group>

        {/* ── Sleek Digital Keypad & Status LED ── */}
        <group position={[0.16, 0.03, 0.40]}>
          <RoundedBox args={[0.11, 0.22, 0.016]} radius={0.008} smoothness={2}>
            <meshStandardMaterial color="#14161b" metalness={0.4} roughness={0.35} />
          </RoundedBox>

          {/* Status Display Bar (Steady emerald, zero animation) */}
          <mesh position={[0, 0.075, 0.009]}>
            <planeGeometry args={[0.08, 0.022]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.2} />
          </mesh>

          {/* Touch Number Buttons Grid */}
          {[0.035, 0.005, -0.025, -0.055].map((y, row) => (
            <group key={row} position={[0, y, 0.009]}>
              {[-0.028, 0, 0.028].map((x, col) => (
                <mesh key={col} position={[x, 0, 0]}>
                  <boxGeometry args={[0.02, 0.018, 0.004]} />
                  <meshStandardMaterial color="#3f434d" metalness={0.7} roughness={0.3} />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* ── Dual Heavy-Duty Cylindrical Hinges ── */}
        {[0.18, -0.18].map((y) => (
          <mesh key={y} position={[0.278, y, 0.375]}>
            <cylinderGeometry args={[0.024, 0.024, 0.11, 20]} />
            <meshStandardMaterial color="#474c57" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}

        {/* ── Rubber Feet ── */}
        {FEET.map(([x, z], i) => (
          <mesh key={i} position={[x, -0.37, z]}>
            <cylinderGeometry args={[0.035, 0.04, 0.02, 16]} />
            <meshStandardMaterial color="#111317" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </animated.group>
  );
}
