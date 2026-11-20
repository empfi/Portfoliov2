"use client";
import React from 'react';
import { animated } from '@react-spring/three';
import { Text, useTexture } from '@react-three/drei';
import { useRest } from '@/context/DeskLayout';
import { useInspectable } from '@/utils/useInspectable';

const PHOTO_MAP: Record<string, string> = {
  polaroid_1: '/photos/bigben-lego.webp',
  polaroid_2: '/photos/sea.jpg',
  polaroid_3: '/photos/bigben-london.webp',
};

interface PolaroidProps {
  id: string;
  caption: string;
}

function PolaroidPhoto({ src }: { src: string }) {
  const texture = useTexture(src);
  return (
    <mesh position={[0, 0.011, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.7, 0.7]} />
      <meshStandardMaterial map={texture} roughness={0.6} />
    </mesh>
  );
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

  const photo = PHOTO_MAP[id];

  return (
    <animated.group position={pos as any} rotation={rot as any} scale={scale as any} {...groupHandlers}>
      <group ref={spinRef}>
        {/* Paper Base */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.96]} />
          <meshStandardMaterial color="#fafafa" roughness={0.9} />
        </mesh>

        {/* Photo */}
        {photo ? (
          <PolaroidPhoto src={photo} />
        ) : (
          <mesh position={[0, 0.011, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshStandardMaterial color="#333333" roughness={0.8} />
          </mesh>
        )}

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
