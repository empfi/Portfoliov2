"use client";

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { animated } from '@react-spring/three';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

// Blade profile with notched bitting, extruded into the key's bit
function createBitGeometry() {
  const bit = new THREE.Shape();
  bit.moveTo(0, -0.36);
  bit.lineTo(0.21, -0.36);
  bit.lineTo(0.21, -0.41);
  bit.lineTo(0.15, -0.41);
  bit.lineTo(0.15, -0.45);
  bit.lineTo(0.21, -0.45);
  bit.lineTo(0.21, -0.53);
  bit.lineTo(0.12, -0.53);
  bit.lineTo(0.12, -0.57);
  bit.lineTo(0.21, -0.57);
  bit.lineTo(0.21, -0.62);
  bit.lineTo(0, -0.62);
  bit.closePath();
  const geo = new THREE.ExtrudeGeometry(bit, {
    depth: 0.04,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.02);
  return geo;
}

function Brass({ dark = false }: { dark?: boolean }) {
  return <meshStandardMaterial color={dark ? '#a97c22' : '#d9a93c'} metalness={1} roughness={dark ? 0.45 : 0.28} />;
}

export function LuaKey() {
  const rest = useRest('luakey');
  const { pos, scale, rot, spinRef, groupHandlers } = useInspectable({
    id: 'luakey',
    restPos: rest.pos,
    restRot: rest.rot,
    heldRot: [-0.18, 0, 0],
    heldScale: 1.05,
  });

  const bitGeo = useMemo(() => createBitGeometry(), []);

  return (
    <animated.group position={pos as any} scale={scale as any} rotation={rot as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* Generous invisible hit area — the key itself is only a few pixels wide on a phone */}
        <mesh visible={false} position={[0.05, -0.1, 0]}>
          <boxGeometry args={[0.6, 1.3, 0.2]} />
        </mesh>

        {/* Bow: brass ring framing an enamel Lua logo */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <torusGeometry args={[0.2, 0.045, 20, 64]} />
          <Brass />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[0.152, 0.012, 8, 48]} />
          <Brass dark />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.022, 48]} />
          <meshStandardMaterial color="#000080" metalness={0.2} roughness={0.25} />
        </mesh>
        {/* Logo "crater" and orbiting moon */}
        <mesh position={[0.048, 0.468, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.026, 32]} />
          <meshStandardMaterial color="#f4f4f6" roughness={0.3} />
        </mesh>
        <mesh position={[0.141, 0.561, 0]}>
          <sphereGeometry args={[0.042, 24, 16]} />
          <meshStandardMaterial color="#000080" metalness={0.2} roughness={0.25} />
        </mesh>

        {/* Collar between bow and shaft */}
        <mesh position={[0, 0.19, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.07, 24]} />
          <Brass />
        </mesh>
        {[0.228, 0.152].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.057, 0.012, 8, 24]} />
            <Brass dark />
          </mesh>
        ))}

        {/* Shaft with a decorative ring and rounded tip */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.034, 0.034, 0.8, 20]} />
          <Brass />
        </mesh>
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.01, 8, 24]} />
          <Brass dark />
        </mesh>
        <mesh position={[0, -0.625, 0]}>
          <sphereGeometry args={[0.038, 20, 12]} />
          <Brass />
        </mesh>

        {/* Bit */}
        <mesh geometry={bitGeo} castShadow>
          <Brass />
        </mesh>
      </group>
    </animated.group>
  );
}
