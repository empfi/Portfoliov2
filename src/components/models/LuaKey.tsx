import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';

// Blade profile with notched bitting, extruded into the key's bit
function createBitGeometry() {
  const bit = new THREE.Shape();
  bit.moveTo(0, -0.36);
  bit.lineTo(0.21, -0.36);
  bit.lineTo(0.21, -0.41);
  bit.lineTo(0.15, -0.41);
  bit.lineTo(0.15, -0.45);
  bit.lineTo(0.21, -0.45);
  bit.lineTo(0.21, -0.53);
  bit.lineTo(0.12, -0.53);
  bit.lineTo(0.12, -0.57);
  bit.lineTo(0.21, -0.57);
  bit.lineTo(0.21, -0.62);
  bit.lineTo(0, -0.62);
  bit.closePath();
  const geo = new THREE.ExtrudeGeometry(bit, {
    depth: 0.04, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2,
  });
  geo.translate(0, 0, -0.02);
  return geo;
}

function Brass({ dark = false }: { dark?: boolean }) {
  return <meshStandardMaterial color={dark ? '#a97c22' : '#d9a93c'} metalness={1} roughness={dark ? 0.45 : 0.28} />;
}

export function LuaKey() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'luakey';
  const rest = useRest('luakey');

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const isInitial = useRef(true);

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: rest.pos, // Resting on the desk, safely above the book
    scale: [1, 1, 1],
    rot: rest.rot, // Flat on the desk, slightly angled
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
      // Tilt it upright to look at the camera when focused
      rotQ.current.setFromEuler(new THREE.Euler(-Math.PI / 4, 0, 0));
    }

    api.start({
      pos: isHeld ? [0, 4.5, 0] : rest.pos,
      scale: isHeld ? [2, 2, 2] : [1, 1, 1],
      rot: isHeld ? [-Math.PI / 4, 0, 0] : rest.rot,
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
      setFocusedItem(isHeld ? null : 'luakey');
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
    
    // Standard drag controls
    const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.005, dx * 0.005, 0, 'XYZ'));
    rotQ.current.premultiply(deltaQ);
    
    const euler = new THREE.Euler().setFromQuaternion(rotQ.current, 'XYZ');
    api.start({ rot: [euler.x, euler.y, euler.z], immediate: true });
    
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const over = () => { document.body.style.cursor = isHeld ? 'grab' : 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

  const bitGeo = useMemo(() => createBitGeometry(), []);

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
      {/* Generous invisible hit area — the key itself is only a few pixels wide on a phone */}
      <mesh visible={false} position={[0.05, -0.1, 0]}>
        <boxGeometry args={[0.6, 1.3, 0.2]} />
      </mesh>

      {/* Bow: brass ring framing an enamel Lua logo */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <torusGeometry args={[0.2, 0.045, 20, 64]} />
        <Brass />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.152, 0.012, 8, 48]} />
        <Brass dark />
      </mesh>
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.022, 48]} />
        <meshStandardMaterial color="#000080" metalness={0.2} roughness={0.25} />
      </mesh>
      {/* Logo "crater" and orbiting moon */}
      <mesh position={[0.048, 0.468, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.026, 32]} />
        <meshStandardMaterial color="#f4f4f6" roughness={0.3} />
      </mesh>
      <mesh position={[0.141, 0.561, 0]}>
        <sphereGeometry args={[0.042, 24, 16]} />
        <meshStandardMaterial color="#000080" metalness={0.2} roughness={0.25} />
      </mesh>

      {/* Collar between bow and shaft */}
      <mesh position={[0, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.05, 0.07, 24]} />
        <Brass />
      </mesh>
      {[0.228, 0.152].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.057, 0.012, 8, 24]} />
          <Brass dark />
        </mesh>
      ))}

      {/* Shaft with a decorative ring and rounded tip */}
      <mesh position={[0, -0.22, 0]} castShadow>
        <cylinderGeometry args={[0.034, 0.034, 0.8, 20]} />
        <Brass />
      </mesh>
      <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.04, 0.01, 8, 24]} />
        <Brass dark />
      </mesh>
      <mesh position={[0, -0.625, 0]}>
        <sphereGeometry args={[0.038, 20, 12]} />
        <Brass />
      </mesh>

      {/* Bit */}
      <mesh geometry={bitGeo} castShadow>
        <Brass />
      </mesh>
    </animated.group>
  );
}
