"use client";

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';

function createPixelTexture(type: 'top' | 'bottom' | 'side') {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const dirtColors = ['#8b5a2b', '#6b4226', '#a0522d', '#5c3317'];
  const grassColors = ['#4e8a2a', '#3b7020', '#5c9e36', '#2d5a15'];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = '';
      if (type === 'top') {
        color = grassColors[Math.floor(Math.random() * grassColors.length)];
      } else if (type === 'bottom') {
        color = dirtColors[Math.floor(Math.random() * dirtColors.length)];
      } else {
        // Side: grass on top, dirt on bottom, jagged edge
        const isGrass = y < 3 || (y < 6 && Math.random() > 0.4);
        color = isGrass ? grassColors[Math.floor(Math.random() * grassColors.length)] : dirtColors[Math.floor(Math.random() * dirtColors.length)];
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // Crispy pixels
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function MinecraftBlock() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'block';

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: [1.0, 0.25, -1.8], // Center of 0.5 box rests at y=0.25
    scale: [1, 1, 1],
    rot: [0, Math.PI / 4, 0],
    config: { mass: 1, tension: 180, friction: 26, clamp: true },
  }));

  useEffect(() => {
    if (!isHeld) {
      rotQ.current.identity();
      angularVelocity.current = { x: 0, y: 0 };
    } else {
      rotQ.current.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
    }

    api.start({
      pos: isHeld ? [0, 4.5, 0] : [1.5, 0.25, -1.0],
      scale: isHeld ? [1.5, 1.5, 1.5] : [1, 1, 1],
      rot: isHeld ? [0, Math.PI / 4, 0] : [0, Math.PI / 4, 0],
      immediate: false,
    });
  }, [isHeld, api]);

  useFrame(() => {
    if (isHeld && !isPointerDown.current) {
      if (Math.abs(angularVelocity.current.x) > 0.0001 || Math.abs(angularVelocity.current.y) > 0.0001) {
        const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(angularVelocity.current.x, angularVelocity.current.y, 0, 'XYZ'));
        rotQ.current.premultiply(deltaQ);
        const euler = new THREE.Euler().setFromQuaternion(rotQ.current, 'XYZ');
        api.start({ rot: [euler.x, euler.y, euler.z], immediate: true });
        
        angularVelocity.current.x *= 0.95;
        angularVelocity.current.y *= 0.95;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isDragging.current) {
      setFocusedItem(isHeld ? null : 'block');
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPointerDown.current = true;
    isDragging.current = false;
    angularVelocity.current = { x: 0, y: 0 };
    if (!isHeld) return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    isPointerDown.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isHeld || !isPointerDown.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
    
    angularVelocity.current = { x: dy * 0.01, y: dx * 0.01 };
    
    // Standard trackball controls
    const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.005, dx * 0.005, 0, 'XYZ'));
    rotQ.current.premultiply(deltaQ);
    
    const euler = new THREE.Euler().setFromQuaternion(rotQ.current, 'XYZ');
    api.start({ rot: [euler.x, euler.y, euler.z], immediate: true });
    
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const over = () => { document.body.style.cursor = isHeld ? 'grab' : 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

  const materials = useMemo(() => {
    const top = createPixelTexture('top');
    const bottom = createPixelTexture('bottom');
    const side = createPixelTexture('side');
    
    // Fallbacks if context fails
    if (!top || !bottom || !side) return null;
    
    return [
      new THREE.MeshStandardMaterial({ map: side, roughness: 1 }), // Right
      new THREE.MeshStandardMaterial({ map: side, roughness: 1 }), // Left
      new THREE.MeshStandardMaterial({ map: top, roughness: 1 }),  // Top
      new THREE.MeshStandardMaterial({ map: bottom, roughness: 1 }), // Bottom
      new THREE.MeshStandardMaterial({ map: side, roughness: 1 }), // Front
      new THREE.MeshStandardMaterial({ map: side, roughness: 1 }), // Back
    ];
  }, []);

  return (
    <animated.group
      position={pos as any}
      scale={scale as any}
      rotation={rot as any}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={over}
      onPointerOut={out}
    >
      {materials ? (
        <mesh castShadow receiveShadow material={materials}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#8b5a2b" roughness={1} />
        </mesh>
      )}
    </animated.group>
  );
}
