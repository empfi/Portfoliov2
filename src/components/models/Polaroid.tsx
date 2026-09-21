"use client";
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useTexture, Text } from '@react-three/drei';

interface PolaroidProps {
  id: string;
  imageSrc: string;
  caption: string;
  defaultPos: [number, number, number];
  defaultRot: [number, number, number];
}

export function Polaroid({ id, caption, defaultPos, defaultRot }: Omit<PolaroidProps, 'imageSrc'>) {
  const { focusedItem, setFocusedItem } = useFocus();
  const isFocused = focusedItem === id;

  const rotRef = useRef({ x: defaultRot[0], y: defaultRot[1], z: defaultRot[2] });
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });

  const isInitial = useRef(true);

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: defaultPos,
    scale: [1, 1, 1],
    rot: defaultRot,
    config: { mass: 1, tension: 180, friction: 26, clamp: true },
  }));

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    if (!isFocused) {
      rotRef.current = { x: 0, y: 0, z: 0 };
      angularVelocity.current = { x: 0, y: 0 };
    } else {
      rotRef.current.x = Math.PI / 4;
    }
    
    api.start({
      pos: isFocused ? [0, 4.5, 0] : defaultPos,
      scale: isFocused ? [3.5, 3.5, 3.5] : [1, 1, 1],
      rot: isFocused ? [rotRef.current.x, 0, rotRef.current.z] : defaultRot,
      immediate: false,
    });
  }, [isFocused, api, defaultPos, defaultRot]);

  useFrame(() => {
    if (isFocused && !isPointerDown.current) {
      if (Math.abs(angularVelocity.current.x) > 0.0001 || Math.abs(angularVelocity.current.y) > 0.0001) {
        rotRef.current.x += angularVelocity.current.x;
        rotRef.current.z += angularVelocity.current.y;
        
        rotRef.current.x = Math.max(-0.6, Math.min(1.5, rotRef.current.x));
        rotRef.current.z = Math.max(-0.8, Math.min(0.8, rotRef.current.z));

        api.start({ rot: [rotRef.current.x, 0, rotRef.current.z], immediate: true });
        
        angularVelocity.current.x *= 0.95;
        angularVelocity.current.y *= 0.95;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isDragging.current) setFocusedItem(isFocused ? null : id);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPointerDown.current = true;
    isDragging.current = false;
    angularVelocity.current = { x: 0, y: 0 };
    if (!isFocused) return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    isPointerDown.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isFocused || !isPointerDown.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
    
    angularVelocity.current = { x: dy * 0.01, y: -dx * 0.01 };
    
    // Standard drag controls
    rotRef.current.x += dy * 0.005;
    rotRef.current.z -= dx * 0.005;
    
    // Relax clamp so it can tilt up towards the camera at Math.PI/4 (0.78)
    rotRef.current.x = Math.max(-0.6, Math.min(1.5, rotRef.current.x));
    rotRef.current.z = Math.max(-0.8, Math.min(0.8, rotRef.current.z));
    
    api.start({ rot: [rotRef.current.x, 0, rotRef.current.z], immediate: true });
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const over = () => { document.body.style.cursor = isFocused ? 'grab' : 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

  return (
    <animated.group
      position={pos as any}
      rotation={rot as any}
      scale={scale as any}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={over}
      onPointerOut={out}
    >
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
    </animated.group>
  );
}
