"use client";
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useCursor, RoundedBox } from '@react-three/drei';

export function BloxvaultSafe() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'bloxvault';

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = React.useState(false);

  useCursor(hovered, isHeld ? 'grab' : 'pointer', 'auto');

  const isInitial = useRef(true);

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: [-2.5, 0.4, -2.5],
    scale: [1, 1, 1],
    rot: [0, -0.3, 0],
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
    }
    api.start({
      pos: isHeld ? [0, 4.5, 0] : [-2.5, 0.4, -2.5],
      scale: isHeld ? [2, 2, 2] : [1, 1, 1],
      rot: isHeld ? [0, 0, 0] : [0, -0.3, 0],
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

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPointerDown.current = true;
    isDragging.current = false;
    angularVelocity.current = { x: 0, y: 0 };
    if (!isHeld) return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as any).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    isPointerDown.current = false;
    (e.target as any).releasePointerCapture?.(e.pointerId);
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

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isDragging.current && !isHeld) {
      setFocusedItem('bloxvault');
    }
  };

  return (
    <animated.group
      position={pos as any}
      scale={scale as any}
      rotation={rot as any}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <group castShadow receiveShadow>
        {/* Main Body */}
        <RoundedBox args={[0.7, 0.7, 0.7]} radius={0.05} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#6a6a72" metalness={0.4} roughness={0.6} />
        </RoundedBox>
        
        {/* Recessed Door Frame */}
        <mesh position={[0, 0, 0.35]}>
          <boxGeometry args={[0.55, 0.55, 0.02]} />
          <meshStandardMaterial color="#444448" metalness={0.5} roughness={0.8} />
        </mesh>
        
        {/* Vault Door */}
        <RoundedBox position={[0, 0, 0.36]} args={[0.5, 0.5, 0.04]} radius={0.01} smoothness={2}>
          <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
        </RoundedBox>
        
        {/* Hinges */}
        {[-0.15, 0.15].map((y, i) => (
          <mesh key={i} position={[0.26, y, 0.37]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 16]} />
            <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* Dial Base */}
        <mesh position={[-0.05, 0, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.02, 32]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.4} />
        </mesh>
        
        {/* Dial Knob */}
        <mesh position={[-0.05, 0, 0.40]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 32]} />
          <meshStandardMaterial color="#FFD700" metalness={0.6} roughness={0.2} />
        </mesh>
        
        {/* Dial Handle Spokes */}
        {[0, Math.PI * 2/3, Math.PI * 4/3].map((rot, i) => (
          <mesh key={i} position={[-0.05, 0, 0.40]} rotation={[0, 0, rot]}>
            <cylinderGeometry args={[0.01, 0.01, 0.28, 8]} />
            <meshStandardMaterial color="#FFD700" metalness={0.6} roughness={0.2} />
          </mesh>
        ))}

        {/* Digital Keypad */}
        <mesh position={[0.15, 0.1, 0.385]}>
          <boxGeometry args={[0.1, 0.15, 0.01]} />
          <meshStandardMaterial color="#222222" metalness={0.6} roughness={0.5} />
        </mesh>
        
        {/* Keypad Buttons */}
        {[-0.04, 0, 0.04].map((y, i) => (
          [-0.02, 0.02].map((x, j) => (
            <mesh key={'btn-' + i + '-' + j} position={[0.15 + x, 0.1 - y, 0.39]}>
              <boxGeometry args={[0.02, 0.02, 0.005]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          ))
        ))}

        {/* Status Light */}
        <mesh position={[0.15, 0.2, 0.385]}>
          <boxGeometry args={[0.04, 0.015, 0.01]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>
      </group>
    </animated.group>
  );
}
