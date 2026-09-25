"use client";
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';
import { useCursor, RoundedBox, Float } from '@react-three/drei';

export function NeutrabotsToy() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'neutrabots';
  const rest = useRest('neutrabots');

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = React.useState(false);
  
  useCursor(hovered, isHeld ? 'grab' : 'pointer', 'auto');

  const isInitial = useRef(true);
  const eyes = useRef<THREE.Group>(null);
  const antennaOrb = useRef<THREE.MeshStandardMaterial>(null);
  const thruster = useRef<THREE.MeshStandardMaterial>(null);
  const mouthBars = useRef<(THREE.Mesh | null)[]>([]);

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
    }
    api.start({
      pos: isHeld ? [0, 4.5, 0] : rest.pos,
      scale: isHeld ? [2, 2, 2] : [1, 1, 1],
      rot: isHeld ? [0, 0, 0] : rest.rot,
      immediate: false,
    });
  }, [isHeld, api, rest]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (eyes.current) {
      // Blink every ~4s, and glance toward the pointer
      const phase = t % 4;
      eyes.current.scale.y = phase < 0.12 ? 0.15 : 1;
      eyes.current.position.x = THREE.MathUtils.lerp(eyes.current.position.x, state.pointer.x * 0.025, 5 * delta);
      eyes.current.position.y = THREE.MathUtils.lerp(eyes.current.position.y, 0.02 + state.pointer.y * 0.015, 5 * delta);
    }
    if (antennaOrb.current) antennaOrb.current.emissiveIntensity = 2 + Math.sin(t * 4) * 1.2;
    if (thruster.current) thruster.current.emissiveIntensity = 2.2 + Math.sin(t * 23) * 0.4 + Math.sin(t * 37) * 0.3;
    // "Talking" equaliser mouth while held
    mouthBars.current.forEach((bar, i) => {
      if (bar) bar.scale.y = isHeld ? 0.4 + Math.abs(Math.sin(t * (6 + i * 1.7) + i)) * 0.9 : 0.5;
    });

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
        {/* Head shell: glossy white with a light-grey cap and a blurple band */}
        <RoundedBox args={[0.5, 0.45, 0.5]} radius={0.07} smoothness={5} castShadow receiveShadow>
          <meshPhysicalMaterial color="#f4f5f7" roughness={0.35} clearcoat={1} clearcoatRoughness={0.15} />
        </RoundedBox>
        <RoundedBox args={[0.4, 0.035, 0.4]} radius={0.015} smoothness={3} position={[0, 0.226, 0]}>
          <meshStandardMaterial color="#d5d8de" roughness={0.4} />
        </RoundedBox>
        <RoundedBox args={[0.508, 0.035, 0.508]} radius={0.017} smoothness={3} position={[0, -0.17, 0]}>
          <meshStandardMaterial color="#5865f2" roughness={0.35} metalness={0.2} />
        </RoundedBox>

        {/* Visor: dark frame + glass */}
        <RoundedBox args={[0.44, 0.3, 0.02]} radius={0.05} smoothness={3} position={[0, 0.02, 0.242]}>
          <meshStandardMaterial color="#2a2d34" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.41, 0.27, 0.02]} radius={0.045} smoothness={3} position={[0, 0.02, 0.252]}>
          <meshPhysicalMaterial color="#040507" roughness={0.08} clearcoat={1} clearcoatRoughness={0.05} />
        </RoundedBox>

        {/* Eyes (blink + follow the pointer) */}
        <group ref={eyes} position={[0, 0.02, 0.264]}>
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.02, 0]}>
              <capsuleGeometry args={[0.03, 0.07, 6, 12]} />
              <meshStandardMaterial color="#7ffcff" emissive="#00e5ff" emissiveIntensity={2.4} toneMapped={false} />
            </mesh>
          ))}
        </group>

        {/* Equaliser mouth */}
        {[-0.04, -0.02, 0, 0.02, 0.04].map((x, i) => (
          <mesh key={x} ref={(m) => { mouthBars.current[i] = m; }} position={[x, -0.07, 0.264]}>
            <boxGeometry args={[0.012, 0.03, 0.004]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.4} />
          </mesh>
        ))}

        {/* Antenna: base, segmented mast, pulsing tip */}
        <group position={[0, 0.24, 0.07]}>
          <mesh>
            <cylinderGeometry args={[0.035, 0.045, 0.03, 20]} />
            <meshStandardMaterial color="#2a2d34" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.009, 0.011, 0.12, 10]} />
            <meshStandardMaterial color="#c3c7ce" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.014, 0.005, 6, 16]} />
            <meshStandardMaterial color="#5865f2" />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.035, 20, 16]} />
            <meshStandardMaterial ref={antennaOrb} color="#ff4d88" emissive="#ff0055" emissiveIntensity={2} />
          </mesh>
        </group>

        {/* Hover thruster with flickering glow */}
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.1, 0.06, 0.04, 24]} />
          <meshStandardMaterial color="#2a2d34" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.262, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.045, 24]} />
          <meshStandardMaterial ref={thruster} color="#7ffcff" emissive="#00e5ff" emissiveIntensity={2.2} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </Float>
    </animated.group>
  );
}
