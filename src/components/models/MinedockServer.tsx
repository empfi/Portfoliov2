"use client";
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useCursor, RoundedBox } from '@react-three/drei';

export function MinedockServer() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'minedock';

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = React.useState(false);
  
  const fan1 = useRef<THREE.Group>(null);
  const fan2 = useRef<THREE.Group>(null);

  useCursor(hovered, isHeld ? 'grab' : 'pointer', 'auto');

  const isInitial = useRef(true);

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: [2.2, 0.45, -2.8],
    scale: [1, 1, 1],
    rot: [0, -0.4, 0],
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
      pos: isHeld ? [0, 4.5, 0] : [2.2, 0.45, -2.8],
      scale: isHeld ? [2, 2, 2] : [1, 1, 1],
      rot: isHeld ? [0, 0, 0] : [0, -0.4, 0],
      immediate: false,
    });
  }, [isHeld, api]);

  useFrame((state, delta) => {
    if (fan1.current && fan2.current) {
      fan1.current.rotation.z += delta * 15;
      fan2.current.rotation.z += delta * 15;
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
      setFocusedItem('minedock');
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
        {/* Rack Chassis Outer */}
        <RoundedBox args={[0.7, 0.9, 0.7]} radius={0.02} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#5a5a6a" metalness={0.2} roughness={0.7} />
        </RoundedBox>
        
        
        
        {/* Server Blades Inside */}
        {[-0.3, -0.1, 0.1, 0.3].map((y, i) => (
          <group key={i} position={[0, y, 0.16]}>
            <mesh>
              <boxGeometry args={[0.58, 0.1, 0.4]} />
              <meshStandardMaterial color="#7a7a8a" metalness={0.3} roughness={0.6} />
            </mesh>
            
            {/* Blade Handle */}
            <mesh position={[-0.2, 0, 0.22]}>
              <boxGeometry args={[0.05, 0.08, 0.04]} />
              <meshStandardMaterial color="#888899" metalness={0.3} roughness={0.4} />
            </mesh>
            <mesh position={[0.2, 0, 0.22]}>
              <boxGeometry args={[0.05, 0.08, 0.04]} />
              <meshStandardMaterial color="#888899" metalness={0.3} roughness={0.4} />
            </mesh>

            {/* Glowing LEDs */}
            {Array.from({ length: 6 }).map((_, j) => (
              <mesh key={j} position={[-0.1 + j * 0.04, 0, 0.21]}>
                <boxGeometry args={[0.015, 0.015, 0.01]} />
                <meshStandardMaterial 
                  color={i % 2 === 0 && j === 5 ? "#ff0000" : "#00ff44"} 
                  emissive={i % 2 === 0 && j === 5 ? "#ff0000" : "#00ff44"} 
                  emissiveIntensity={2} 
                />
              </mesh>
            ))}
          </group>
        ))}

        {/* Top Vent */}
        <mesh position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.8} />
        </mesh>
        
        {/* Back Cooling Fans */}
        <group position={[-0.15, 0, -0.36]} ref={fan1}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.2, 0.05, 0.2]} />
            <meshStandardMaterial color="#333" metalness={0.5} />
          </mesh>
        </group>
        <group position={[0.15, 0, -0.36]} ref={fan2}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.2, 0.05, 0.2]} />
            <meshStandardMaterial color="#333" metalness={0.5} />
          </mesh>
        </group>
      </group>
    </animated.group>
  );
}
