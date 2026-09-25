"use client";

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';

// Deterministic PRNG so the pixel pattern is identical on every load
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bare Bones palette, shaded per pixel like a real 16×16 block texture
const GRASS = ['#4f7b29', '#5c8e32', '#5c8e32', '#669c38', '#72a93f'];
const DIRT = ['#5e3e25', '#68452a', '#7a5435', '#7a5435', '#8b603d'];
const GRASS_SHADOW = '#3e631e';
// Grass overhang depth per column on the side faces
const DRIP = [3, 4, 5, 5, 4, 3, 3, 4, 5, 6, 6, 5, 4, 3, 3, 3];

function createBareBonesTexture(type: 'top' | 'side' | 'bottom') {
  if (typeof document === 'undefined') return null;
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rand = mulberry32(type === 'top' ? 11 : type === 'side' ? 23 : 37);
  // Mostly mid tones, occasional highlights/shadows
  const pick = (shades: string[]) => {
    const r = rand();
    return shades[r < 0.1 ? 0 : r < 0.3 ? 1 : r < 0.75 ? 2 : r < 0.93 ? 3 : 4];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color: string;
      if (type === 'top') color = pick(GRASS);
      else if (type === 'bottom') color = pick(DIRT);
      else if (y < DRIP[x]) color = pick(GRASS);
      else if (y === DRIP[x]) color = GRASS_SHADOW;
      else color = pick(DIRT);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // A few darker pebbles in the dirt
  if (type !== 'top') {
    ctx.fillStyle = '#4a311c';
    for (let n = 0; n < 5; n++) {
      const x = Math.floor(rand() * 15);
      const y = 8 + Math.floor(rand() * 7);
      ctx.fillRect(x, y, 2, 1);
    }
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
  const rest = useRest('hyperplex');

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });

  const isInitial = useRef(true);

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: rest.pos,
    scale: [1, 1, 1],
    rot: rest.rot,
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
      pos: isHeld ? [0, 4.5, 0] : rest.pos,
      scale: isHeld ? [1.5, 1.5, 1.5] : [1, 1, 1],
      rot: isHeld ? [0, Math.PI / 4, 0] : rest.rot,
      immediate: false,
    });
  }, [isHeld, api, rest]);

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

