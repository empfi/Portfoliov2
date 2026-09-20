"use client";
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useCursor, RoundedBox, Float } from '@react-three/drei';

export function NeutrabotsToy() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'neutrabots';

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = React.useState(false);
  
  const ringRef = useRef<THREE.Mesh>(null);

  useCursor(hovered, isHeld ? 'grab' : 'pointer', 'auto');

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: [6.5, 0.35, -4.0],
    scale: [1, 1, 1],
    rot: [0, -0.6, 0],
    config: { mass: 1, tension: 180, friction: 26, clamp: true },
  }));

  useEffect(() => {
    if (!isHeld) {
      rotQ.current.identity();
      angularVelocity.current = { x: 0, y: 0 };
    }
    api.start({
      pos: isHeld ? [0, 4.5, 0] : [3.2, 0.35, -1.2],
      scale: isHeld ? [2, 2, 2] : [1, 1, 1],
      rot: isHeld ? [0, 0, 0] : [0, 0, 0],
      immediate: false,
    });
  }, [isHeld, api]);

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2;
    }

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
      setFocusedItem('neutrabots');
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
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
        <group castShadow receiveShadow>
          {/* Main Head / Chassis */}
          <RoundedBox args={[0.5, 0.45, 0.5]} radius={0.05} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial color="#f4f4f4" metalness={0.1} roughness={0.2} />
          </RoundedBox>
          
          {/* Visor / Face Plate */}
          <RoundedBox position={[0, 0.02, 0.25]} args={[0.42, 0.28, 0.02]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
          </RoundedBox>
          
          {/* Glowing Eyes */}
          <mesh position={[-0.1, 0.02, 0.26]}>
            <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0.1, 0.02, 0.26]}>
            <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
          </mesh>

          {/* Ears / Headphones */}
          <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 16]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0.26, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 16]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.4} />
          </mesh>

          {/* Antenna Base */}
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
            <meshStandardMaterial color="#333" metalness={0.9} roughness={0.2} />
          </mesh>
          
          {/* Antenna Pole */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.16, 8]} />
            <meshStandardMaterial color="#aaaaaa" metalness={1} roughness={0.2} />
          </mesh>
          
          {/* Antenna Orb */}
          <mesh position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={2} />
          </mesh>

          {/* Hover Ring (Energy Field) */}
          <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]} ref={ringRef}>
            <torusGeometry args={[0.2, 0.01, 8, 32]} />
            <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={1.5} />
          </mesh>
          
          {/* Hover Thruster (Bottom) */}
          <mesh position={[0, -0.23, 0]} rotation={[Math.PI, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.1, 0.04, 16]} />
            <meshStandardMaterial color="#222" metalness={0.8} />
          </mesh>
        </group>
      </Float>
    </animated.group>
  );
}
