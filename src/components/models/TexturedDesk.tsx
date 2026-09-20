"use client";

import * as THREE from 'three';
import { RoundedBox, useTexture } from '@react-three/drei';

export function TexturedDesk() {
  const [colorMap, normalMap, roughnessMap] = useTexture([
    '/textures/wood/color.jpg',
    '/textures/wood/normal.jpg',
    '/textures/wood/roughness.jpg',
  ]);
  
  colorMap.colorSpace = THREE.SRGBColorSpace;
  
  [colorMap, normalMap, roughnessMap].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1.5);
  });
  
  return (
    <RoundedBox args={[14, 1, 8]} radius={0.05} smoothness={4} receiveShadow>
      <meshStandardMaterial map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} roughness={1} />
    </RoundedBox>
  );
}
