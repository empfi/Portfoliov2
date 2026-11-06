"use client";

import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { animated, useSpring } from '@react-spring/three';
import { RoundedBox } from '@react-three/drei';
import { useRest } from '@/context/DeskLayout';
import { useFocus } from '@/context/FocusContext';
import { useInspectable } from '@/utils/useInspectable';

/**
 * Procedural AirPods Pro Earbud
 * - Ergonomic bulb head with white silicone ear-tip.
 * - Precision acoustic mesh vents (outer beamforming mic, top acoustic exhaust, inward ear sensor).
 * - Tapered stem with capacitive force-sensor indent and bottom dual-ring chrome charging contacts.
 */
function AirPodBud({ isLeft }: { isLeft: boolean }) {
  const sign = isLeft ? -1 : 1;

  return (
    <group position={[sign * 0.135, 0.075, 0]}>
      {/* ── Downward Stem with subtle inward/forward angle ── */}
      <group rotation={[0.09, 0, sign * 0.055]}>
        {/* Main stem */}
        <mesh position={[0, -0.055, 0]}>
          <cylinderGeometry args={[0.021, 0.019, 0.17, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.06} metalness={0.02} envMapIntensity={1.1} />
        </mesh>

        {/* Chrome charging contacts at base of stem */}
        <mesh position={[0, -0.138, 0]}>
          <cylinderGeometry args={[0.0195, 0.0185, 0.016, 24]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.96} roughness={0.12} />
        </mesh>

        {/* Bottom speech microphone black dot */}
        <mesh position={[0, -0.147, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.007, 12]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>

        {/* Capacitive Force Sensor recessed indentation on outward edge */}
        <mesh position={[sign * 0.0215, -0.052, 0.002]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.058, 0.011]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.05} />
        </mesh>
      </group>

      {/* ── Ergonomic Head angled inward toward ear canal ── */}
      <group position={[sign * 0.026, 0.058, 0.012]} rotation={[-0.14, sign * 0.32, 0]}>
        {/* Main bulb housing */}
        <mesh scale={[1.15, 1, 0.95]}>
          <sphereGeometry args={[0.046, 28, 28]} />
          <meshStandardMaterial color="#ffffff" roughness={0.06} metalness={0.02} envMapIntensity={1.1} />
        </mesh>

        {/* Soft silicone ear tip (AirPods Pro signature) */}
        <group position={[sign * 0.042, 0.004, 0.018]} rotation={[0, sign * 0.85, 0]}>
          <mesh scale={[0.82, 0.95, 0.72]}>
            <sphereGeometry args={[0.034, 24, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.65} metalness={0.01} />
          </mesh>
          {/* Central acoustic driver speaker mesh */}
          <mesh position={[sign * 0.028, 0, 0]} rotation={[0, sign * Math.PI / 2, 0]}>
            <circleGeometry args={[0.018, 18]} />
            <meshStandardMaterial color="#18181b" roughness={0.8} />
          </mesh>
        </group>

        {/* Top acoustic equalizer vent (large curved black mesh) */}
        <mesh position={[0, 0.044, -0.004]} rotation={[-Math.PI / 2 + 0.15, 0, 0]}>
          <planeGeometry args={[0.028, 0.014]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>

        {/* Outward beamforming noise-cancellation mic grill */}
        <mesh position={[-sign * 0.038, 0.008, -0.008]} rotation={[0, -sign * Math.PI / 2, 0]}>
          <circleGeometry args={[0.013, 14]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>

        {/* Inward optical skin-detect sensor */}
        <mesh position={[0, -0.022, 0.036]} rotation={[0.45, 0, 0]}>
          <circleGeometry args={[0.008, 12]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * AirPods Pro Wireless Charging Case
 * - Authentic Apple pebble geometry (60.6 mm wide × 45.2 mm tall × 21.7 mm deep proportional).
 * - Ultra-glossy porcelain finish with high-fidelity reflections.
 * - Interactive flip lid with rear brushed stainless steel hinge.
 * - Dual magnetic charging slots with gold pogo charging pins.
 * - Front battery indicator pinhole LED + fingernail opening recess.
 * - Rear pairing button, bottom USB-C/Lightning charging port with speaker grilles.
 */
export function AirPodsCase() {
  const rest = useRest('airpods');
  const { focusedItem } = useFocus();
  const isHeld = focusedItem === 'airpods';

  // Smooth flip-lid opening animation (~105° backward around rear hinge)
  const { lidAngle } = useSpring({
    lidAngle: isHeld ? -1.84 : 0,
    config: { mass: 0.8, tension: 280, friction: 24 },
  });

  // Trackball inspection & 3D pickup hook
  const { pos, rot, scale, spinRef, groupHandlers } = useInspectable({
    id: 'airpods',
    restPos: rest.pos,
    restRot: rest.rot,
    heldPos: [0, 4.85, 2.3],
    heldRot: [-0.22, 0, 0],
    heldScale: 2.1,
  });

  // Materials
  const shellMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.06,
        metalness: 0.02,
        envMapIntensity: 1.15,
      }),
    [],
  );

  const cavityMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.35,
        metalness: 0.05,
      }),
    [],
  );

  const hingeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        metalness: 0.95,
        roughness: 0.22,
      }),
    [],
  );

  const goldPinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eab308',
        metalness: 0.95,
        roughness: 0.18,
      }),
    [],
  );

  // Proportions: 0.60 width × 0.28 lower height + 0.16 lid height × 0.22 depth
  const CASE_W = 0.60;
  const CASE_D = 0.22;
  const BODY_H = 0.28;
  const LID_H = 0.16;
  const CORNER_R = 0.075;

  return (
    <animated.group
      position={pos as any}
      scale={scale as any}
      rotation={rot as any}
      {...groupHandlers}
    >
      <group ref={spinRef}>
        {/* ── 1. LOWER CASE BODY ── */}
        <group position={[0, 0, 0]}>
          {/* Main lower rounded porcelain shell */}
          <RoundedBox
            args={[CASE_W, BODY_H, CASE_D]}
            radius={CORNER_R}
            smoothness={6}
            position={[0, 0, 0]}
            castShadow
            receiveShadow
          >
            <primitive object={shellMat} attach="material" />
          </RoundedBox>

          {/* Interior charging slot top deck */}
          <mesh position={[0, BODY_H / 2 - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[CASE_W - 0.10, CASE_D - 0.06]} />
            <primitive object={cavityMat} attach="material" />
          </mesh>

          {/* Left & Right magnetic docking wells */}
          <mesh position={[-0.135, BODY_H / 2 - 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.068, 28]} />
            <meshStandardMaterial color="#090d16" roughness={0.7} />
          </mesh>
          <mesh position={[0.135, BODY_H / 2 - 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.068, 28]} />
            <meshStandardMaterial color="#090d16" roughness={0.7} />
          </mesh>

          {/* Gold Pogo Charging Contacts inside cavities */}
          <group position={[-0.135, BODY_H / 2 - 0.02, 0]}>
            <mesh position={[-0.015, 0, 0]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.012, 10]} />
              <primitive object={goldPinMat} attach="material" />
            </mesh>
            <mesh position={[0.015, 0, 0]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.012, 10]} />
              <primitive object={goldPinMat} attach="material" />
            </mesh>
          </group>
          <group position={[0.135, BODY_H / 2 - 0.02, 0]}>
            <mesh position={[-0.015, 0, 0]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.012, 10]} />
              <primitive object={goldPinMat} attach="material" />
            </mesh>
            <mesh position={[0.015, 0, 0]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.012, 10]} />
              <primitive object={goldPinMat} attach="material" />
            </mesh>
          </group>

          {/* Internal Charging Status LED (glows between the earbuds) */}
          <mesh position={[0, BODY_H / 2 + 0.001, 0.012]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.0065, 16]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={isHeld ? 2.8 : 1.2}
            />
          </mesh>

          {/* ── Front Details ── */}
          {/* External Front Status LED Pinhole */}
          <mesh position={[0, 0.015, CASE_D / 2 + 0.001]}>
            <circleGeometry args={[0.0055, 18]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={2.4}
            />
          </mesh>

          {/* Front thumb fingernail opening contour recess */}
          <mesh position={[0, BODY_H / 2 - 0.006, CASE_D / 2 + 0.001]}>
            <planeGeometry args={[0.11, 0.010]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
          </mesh>

          {/* ── Rear Details ── */}
          {/* Lower half of brushed stainless steel hinge plate */}
          <mesh position={[0, BODY_H / 2 - 0.018, -CASE_D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.22, 0.034]} />
            <primitive object={hingeMat} attach="material" />
          </mesh>

          {/* Flush circular setup / pairing button */}
          <group position={[0, -0.01, -CASE_D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
            <mesh>
              <circleGeometry args={[0.026, 24]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, -0.0002]}>
              <ringGeometry args={[0.026, 0.028, 24]} />
              <meshBasicMaterial color="#cbd5e1" />
            </mesh>
          </group>

          {/* ── Bottom Details (AirPods Pro 2 Speaker Grilles & Lightning / USB-C port) ── */}
          {/* Port metallic bezel */}
          <mesh position={[0, -BODY_H / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.072, 0.024]} />
            <primitive object={hingeMat} attach="material" />
          </mesh>
          <mesh position={[0, -BODY_H / 2 - 0.0015, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.054, 0.013]} />
            <meshStandardMaterial color="#090d16" roughness={0.8} />
          </mesh>

          {/* Bottom acoustic speaker dots (Find My speaker) */}
          <mesh position={[-0.11, -BODY_H / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.006, 12]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
          <mesh position={[-0.08, -BODY_H / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.006, 12]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
          <mesh position={[0.08, -BODY_H / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.006, 12]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
          <mesh position={[0.11, -BODY_H / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.006, 12]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
        </group>

        {/* ── 2. TWO HIGH-ACCURACY AIRPODS PRO EARBUDS ── */}
        <AirPodBud isLeft={true} />
        <AirPodBud isLeft={false} />

        {/* ── 3. HINGED TOP FLIP-LID ── */}
        {/* Pivot origin at rear hinge line [0, BODY_H / 2, -CASE_D / 2] */}
        <animated.group position={[0, BODY_H / 2, -CASE_D / 2]} rotation-x={lidAngle as any}>
          {/* Offset lid body so hinge pivot is exactly at bottom-rear edge */}
          <group position={[0, LID_H / 2, CASE_D / 2]}>
            <RoundedBox
              args={[CASE_W, LID_H, CASE_D]}
              radius={CORNER_R}
              smoothness={6}
              castShadow
            >
              <primitive object={shellMat} attach="material" />
            </RoundedBox>

            {/* Upper half of brushed stainless steel hinge */}
            <mesh position={[0, -LID_H / 2 + 0.016, -CASE_D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.22, 0.028]} />
              <primitive object={hingeMat} attach="material" />
            </mesh>

            {/* Interior lid cavities for earbud bulb heads */}
            <mesh position={[0, -LID_H / 2 + 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[CASE_W - 0.10, CASE_D - 0.06]} />
              <primitive object={cavityMat} attach="material" />
            </mesh>
            <mesh position={[-0.135, -LID_H / 2 + 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.065, 24]} />
              <meshStandardMaterial color="#090d16" roughness={0.7} />
            </mesh>
            <mesh position={[0.135, -LID_H / 2 + 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.065, 24]} />
              <meshStandardMaterial color="#090d16" roughness={0.7} />
            </mesh>
          </group>
        </animated.group>
      </group>
    </animated.group>
  );
}
