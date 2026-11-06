"use client";
import React from 'react';
import { animated } from '@react-spring/three';
import { Text } from '@react-three/drei';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

interface PolaroidProps {
  id: string;
  caption: string;
}

export function Polaroid({ id, caption }: PolaroidProps) {
  const rest = useRest(id);
  const { pos, scale, rot, spinRef, groupHandlers } = useInspectable({
    id,
    restPos: rest.pos,
    restRot: rest.rot,
    heldRot: [Math.PI / 2 - 0.18, 0, 0],
    heldScale: 1.42,
  });

  return (
    <animated.group position={pos as any} rotation={rot as any} scale={scale as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* Paper Base */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.96]} />
          <meshStandardMaterial color="#fafafa" roughness={0.9} />
        </mesh>

        {/* Photo Area Placeholder */}
        <mesh position={[0, 0.011, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 0.7]} />
          <meshStandardMaterial color="#333333" roughness={0.8} metalness={0.1} />
        </mesh>

        {/* Coming Soon Text inside photo area */}
        <Text
          font="/fonts/inter.woff"
          fontSize={0.08}
          color="#ffffff"
          position={[0, 0.012, -0.08]}
          rotation={[-Math.PI / 2, 0, 0]}
          anchorX="center"
          anchorY="middle"
        >
          Coming soon...
        </Text>

        {/* Caption */}
        <Text
          font="/fonts/caveat.woff"
          fontSize={0.1}
          color="#111"
          position={[0, 0.012, 0.35]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {caption}
        </Text>
      </group>
    </animated.group>
  );
}
