"use client";
import React, { useLayoutEffect, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';
import { useCursor, RoundedBox } from '@react-three/drei';

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  if (typeof document === 'undefined') return null;
  // Drawn at 4x so labels stay crisp when the item is held up to the camera
  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Combination dial face: 100 ticks, numbers every 10
function createDialTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#1b1d21';
    ctx.fillRect(0, 0, 256, 256);
    ctx.translate(128, 128);
    ctx.strokeStyle = '#e8e8ea';
    ctx.fillStyle = '#e8e8ea';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * Math.PI * 2 - Math.PI / 2;
      const major = i % 10 === 0;
      const r0 = major ? 98 : i % 5 === 0 ? 106 : 112;
      ctx.lineWidth = major ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * 122, Math.sin(a) * 122);
      ctx.stroke();
      if (major) ctx.fillText(String(i), Math.cos(a) * 78, Math.sin(a) * 78);
    }
  });
}

function createNameplateTexture() {
  return canvasTexture(256, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#e2bd5c');
    g.addColorStop(1, '#a8812c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#3b2a08';
    ctx.font = 'bold 30px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BLOXVAULT', 128, 34);
  });
}

const DOOR_GEO = (() => {
  const s = new THREE.Shape();
  const w = 0.52, r = 0.035, x = -w / 2, y = -w / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + w - r);
  s.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
  s.lineTo(x + r, y + w);
  s.quadraticCurveTo(x, y + w, x, y + w - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3 });
})();

// Bolt heads around the door edge
const BOLTS: [number, number][] = [-0.19, -0.065, 0.065, 0.19].flatMap((t) => [
  [t, 0.235], [t, -0.235], [-0.235, t],
] as [number, number][]);
const KEYPAD_KEYS = [0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => [c, r] as const));
const SPOKES = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2 + Math.PI / 2);
const FEET: [number, number][] = [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]];

const dummy = new THREE.Object3D();

/** Small, identical, position-only decorations (bolt heads, keypad buttons, feet) as one
 *  instanced draw call each, instead of one <mesh> per copy. */
function InstancedDots({ positions, geometry, material }: {
  positions: readonly (readonly [number, number, number])[]; geometry: React.ReactNode; material: React.ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    positions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]}>
      {geometry}
      {material}
    </instancedMesh>
  );
}

export function BloxvaultSafe() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'bloxvault';
  const rest = useRest('bloxvault');

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = React.useState(false);

  useCursor(hovered, isHeld ? 'grab' : 'pointer', 'auto');

  const isInitial = useRef(true);
  const statusLed = useRef<THREE.MeshStandardMaterial>(null);

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

  useFrame((state) => {
    // Slow "armed" pulse on the keypad LED
    if (statusLed.current) statusLed.current.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 3) * 1.2;

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

  const textures = useMemo(() => ({ dial: createDialTexture(), plate: createNameplateTexture() }), []);

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
      {/* Body */}
      <RoundedBox args={[0.7, 0.7, 0.7]} radius={0.05} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#5d626b" metalness={0.5} roughness={0.4} />
      </RoundedBox>

      {/* Door recess and door */}
      <mesh position={[0, 0, 0.345]}>
        <boxGeometry args={[0.6, 0.6, 0.02]} />
        <meshStandardMaterial color="#141518" roughness={0.8} />
      </mesh>
      <mesh geometry={DOOR_GEO} position={[0, 0, 0.33]} castShadow>
        <meshStandardMaterial color="#8a9099" metalness={0.55} roughness={0.3} />
      </mesh>
      <RoundedBox args={[0.4, 0.4, 0.012]} radius={0.015} smoothness={2} position={[0, 0, 0.385]}>
        <meshStandardMaterial color="#9aa0a9" metalness={0.5} roughness={0.32} />
      </RoundedBox>
      <InstancedDots
        positions={BOLTS.map(([x, y]) => [x, y, 0.382] as const)}
        geometry={<sphereGeometry args={[0.012, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />}
        material={<meshStandardMaterial color="#d4d7dc" metalness={1} roughness={0.2} />}
      />

      {/* Hinge barrels */}
      {[0.16, -0.16].map((y) => (
        <group key={y} position={[0.285, y, 0.36]}>
          <mesh>
            <cylinderGeometry args={[0.022, 0.022, 0.1, 16]} />
            <meshStandardMaterial color="#b9bcc2" metalness={1} roughness={0.25} />
          </mesh>
          {[0.055, -0.055].map((cy) => (
            <mesh key={cy} position={[0, cy, 0]}>
              <sphereGeometry args={[0.022, 12, 8]} />
              <meshStandardMaterial color="#b9bcc2" metalness={1} roughness={0.25} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Combination dial: chrome bezel, numbered face, knurled knob, index mark */}
      <group position={[-0.08, 0.085, 0.39]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.105, 0.014, 48]} />
          <meshStandardMaterial color="#c8cbd0" metalness={1} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0, 0.009]}>
          <circleGeometry args={[0.088, 48]} />
          <meshStandardMaterial map={textures.dial} metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.042, 0.03, 24]} />
          <meshStandardMaterial color="#c8cbd0" metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.107, 0.004]}>
          <boxGeometry args={[0.008, 0.018, 0.006]} />
          <meshStandardMaterial color="#e03a3a" />
        </mesh>
      </group>

      {/* Three-spoke handle wheel */}
      <group position={[-0.08, -0.14, 0.39]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 20]} />
          <meshStandardMaterial color="#c8cbd0" metalness={1} roughness={0.2} />
        </mesh>
        {SPOKES.map((a) => (
          <group key={a} rotation={[0, 0, a]}>
            <mesh position={[0.05, 0, 0.02]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.009, 0.009, 0.1, 10]} />
              <meshStandardMaterial color="#c8cbd0" metalness={1} roughness={0.2} />
            </mesh>
            <mesh position={[0.1, 0, 0.02]}>
              <sphereGeometry args={[0.018, 16, 12]} />
              <meshStandardMaterial color="#1b1c1f" roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Electronic keypad */}
      <group position={[0.135, 0.075, 0.39]}>
        <RoundedBox args={[0.12, 0.19, 0.016]} radius={0.008} smoothness={2}>
          <meshStandardMaterial color="#17181b" metalness={0.4} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.07, 0.009]}>
          <planeGeometry args={[0.09, 0.028]} />
          <meshStandardMaterial color="#0b2a14" emissive="#1f7a3a" emissiveIntensity={0.6} />
        </mesh>
        <InstancedDots
          positions={KEYPAD_KEYS.map(([c, r]) => [(c - 1) * 0.032, 0.03 - r * 0.028, 0.011] as const)}
          geometry={<boxGeometry args={[0.024, 0.02, 0.008]} />}
          material={<meshStandardMaterial color="#9ea2a9" metalness={0.8} roughness={0.3} />}
        />
        <mesh position={[0.045, 0.087, 0.009]}>
          <circleGeometry args={[0.006, 12]} />
          <meshStandardMaterial ref={statusLed} color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Brass nameplate */}
      <mesh position={[0.135, -0.13, 0.392]}>
        <planeGeometry args={[0.13, 0.034]} />
        <meshStandardMaterial map={textures.plate} metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Feet */}
      <InstancedDots
        positions={FEET.map(([x, z]) => [x, -0.355, z] as const)}
        geometry={<cylinderGeometry args={[0.035, 0.04, 0.02, 12]} />}
        material={<meshStandardMaterial color="#111" roughness={0.9} />}
      />
    </animated.group>
  );
}
