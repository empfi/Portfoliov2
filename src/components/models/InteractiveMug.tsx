"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';

// Procedural Bezier Curve for a realistic handle that doesn't clip inside the mug
class HandleCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const start = new THREE.Vector3(0.35, 0.55, 0);
    const control1 = new THREE.Vector3(0.65, 0.65, 0);
    const control2 = new THREE.Vector3(0.65, 0.15, 0);
    const end = new THREE.Vector3(0.35, 0.15, 0);
    
    const tx = 1 - t;
    const x = tx * tx * tx * start.x + 3 * tx * tx * t * control1.x + 3 * tx * t * t * control2.x + t * t * t * end.x;
    const y = tx * tx * tx * start.y + 3 * tx * tx * t * control1.y + 3 * tx * t * t * control2.y + t * t * t * end.y;
    
    return optionalTarget.set(x, y, 0);
  }
}

export function InteractiveMug() {
  const { focusedItem, setFocusedItem } = useFocus();
  // Mug is active if it is the currently focused item globally
  const isHeld = focusedItem === 'mug';

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const [{ mugPos, mugScale, mugRot }, api] = useSpring(() => ({
    mugPos: [1.6, 0.35, -1.6],
    mugScale: [1, 1, 1],
    mugRot: [0, Math.PI / 4, 0],
    config: { mass: 1, tension: 180, friction: 26, clamp: true },
  }));

  useEffect(() => {
    if (!isHeld) {
      rotQ.current.identity();
    } else {
      rotQ.current.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
    }

    api.start({
      mugPos: isHeld ? [0, 1.5, 0] : [1.6, 0.35, -1.6],
      mugScale: isHeld ? [2.2, 2.2, 2.2] : [1, 1, 1],
      mugRot: isHeld ? [0, Math.PI / 4, 0] : [0, Math.PI / 4, 0],
      immediate: false,
    });
  }, [isHeld, api]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isDragging.current) {
      setFocusedItem(isHeld ? null : 'mug');
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isDragging.current = false;
    if (!isHeld) return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isHeld || e.buttons === 0) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
    
    const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.005, dx * 0.005, 0, 'XYZ'));
    rotQ.current.premultiply(deltaQ);
    
    const euler = new THREE.Euler().setFromQuaternion(rotQ.current, 'XYZ');
    api.start({ mugRot: [euler.x, euler.y, euler.z], immediate: true });
    
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const over = () => { document.body.style.cursor = isHeld ? 'grab' : 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.33, 0),
    new THREE.Vector2(0.35, 0.02),
    new THREE.Vector2(0.36, 0.05),
    new THREE.Vector2(0.36, 0.65),
    new THREE.Vector2(0.35, 0.69),
    new THREE.Vector2(0.33, 0.70),
    new THREE.Vector2(0.31, 0.69),
    new THREE.Vector2(0.30, 0.65),
    new THREE.Vector2(0.30, 0.08),
    new THREE.Vector2(0.28, 0.05),
    new THREE.Vector2(0, 0.05),
  ];

  return (
    <animated.group
      position={mugPos as any}
      scale={mugScale as any}
      rotation={mugRot as any}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOver={over}
      onPointerOut={out}
    >
      <mesh castShadow receiveShadow position={[0, -0.35, 0]}>
        <latheGeometry args={[points, 64]} />
        <meshStandardMaterial color="#fdfdfd" roughness={0.15} metalness={0.05} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.35, 0]}>
        <tubeGeometry args={[new HandleCurve(), 32, 0.045, 16, false]} />
        <meshStandardMaterial color="#fdfdfd" roughness={0.15} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.20, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.298, 32]} />
        <meshStandardMaterial color="#2d1303" roughness={0.05} metalness={0.1} />
      </mesh>
    </animated.group>
  );
}
