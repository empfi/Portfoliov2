"use client";

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';

function createBareBonesTexture(type: 'top' | 'side' | 'bottom') {
  if (typeof document === 'undefined') return null;
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Bare Bones clean palette
  const GRASS_BASE = '#5c8e32';
  const GRASS_LIGHT = '#669c38';
  const GRASS_DARK = '#4f7b29';
  const GRASS_SHADOW = '#3e631e';

  const DIRT_BASE = '#7a5435';
  const DIRT_LIGHT = '#8b603d';
  const DIRT_DARK = '#68452a';

  if (type === 'top') {
    // Solid clean grass with very few minimalist block patches
    ctx.fillStyle = GRASS_BASE;
    ctx.fillRect(0, 0, size, size);

    // Subtle clean geometric patches
    ctx.fillStyle = GRASS_LIGHT;
    ctx.fillRect(2, 2, 4, 3);
    ctx.fillRect(10, 8, 3, 4);

    ctx.fillStyle = GRASS_DARK;
    ctx.fillRect(8, 2, 3, 2);
    ctx.fillRect(3, 11, 4, 2);
  } else if (type === 'bottom') {
    // Clean dirt
    ctx.fillStyle = DIRT_BASE;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = DIRT_LIGHT;
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(10, 10, 2, 3);

    ctx.fillStyle = DIRT_DARK;
    ctx.fillRect(9, 2, 3, 2);
    ctx.fillRect(2, 11, 3, 2);
  } else {
    // Side: clean dirt base
    ctx.fillStyle = DIRT_BASE;
    ctx.fillRect(0, 0, size, size);

    // Minimal dirt accents
    ctx.fillStyle = DIRT_LIGHT;
    ctx.fillRect(4, 9, 3, 2);
    ctx.fillRect(11, 12, 2, 2);

    ctx.fillStyle = DIRT_DARK;
    ctx.fillRect(2, 12, 2, 2);
    ctx.fillRect(9, 8, 3, 2);

    // Clean Bare Bones stepped grass overhang
    const dripHeights = [2, 3, 5, 5, 4, 2, 3, 3, 4, 6, 6, 5, 3, 2, 3, 2];

    // Under-drip 1px subtle shadow
    ctx.fillStyle = GRASS_SHADOW;
    for (let x = 0; x < size; x++) {
      const h = dripHeights[x];
      ctx.fillRect(x, h, 1, 1);
    }

    // Grass fill
    ctx.fillStyle = GRASS_BASE;
    for (let x = 0; x < size; x++) {
      const h = dripHeights[x];
      ctx.fillRect(x, 0, 1, h);
    }

    // Top grass subtle highlight patches
    ctx.fillStyle = GRASS_LIGHT;
    ctx.fillRect(2, 0, 3, 2);
    ctx.fillRect(9, 0, 3, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function MinecraftBlock() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'hyperplex';

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });

  const isInitial = useRef(true);

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: [1.5, 0.25, -1.0],
    scale: [1, 1, 1],
    rot: [0, Math.PI / 4, 0],
    config: { mass: 1, tension: 180, friction: 26, clamp: true },
  }));

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

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
      setFocusedItem(isHeld ? null : 'hyperplex');
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
    
    const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.005, dx * 0.005, 0, 'XYZ'));
    rotQ.current.premultiply(deltaQ);
    
    const euler = new THREE.Euler().setFromQuaternion(rotQ.current, 'XYZ');
    api.start({ rot: [euler.x, euler.y, euler.z], immediate: true });
    
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const over = () => { document.body.style.cursor = isHeld ? 'grab' : 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

  const materials = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const top = createBareBonesTexture('top');
    const bottom = createBareBonesTexture('bottom');
    const side = createBareBonesTexture('side');
    if (!top || !bottom || !side) return null;

    return [
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.9, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.9, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ map: top, roughness: 0.9, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ map: bottom, roughness: 0.9, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.9, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.9, metalness: 0.02 }),
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
          <meshStandardMaterial color="#5c8e32" roughness={0.9} />
        </mesh>
      )}
    </animated.group>
  );
}

