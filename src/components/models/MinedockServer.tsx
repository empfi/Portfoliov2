"use client";
import React, { useRef, useEffect, useMemo } from 'react';
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

// Perforated drive-bay grille
function createGrilleTexture() {
  return canvasTexture(128, 32, (ctx) => {
    ctx.fillStyle = '#3a3f48';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#07080a';
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 16; x++) {
        ctx.beginPath();
        ctx.arc(4 + x * 8 + (y % 2) * 4, 4 + y * 8, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// Horizontal vent slots for the top and side panels
function createSlotTexture() {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#0a0b0d';
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.beginPath();
        ctx.roundRect(8 + x * 60, 8 + y * 12, 52, 5, 2.5);
        ctx.fill();
      }
    }
  });
}

function createLcdTexture() {
  return canvasTexture(256, 48, (ctx) => {
    ctx.fillStyle = '#06140a';
    ctx.fillRect(0, 0, 256, 48);
    ctx.fillStyle = '#3dff6a';
    ctx.font = 'bold 22px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('MINEDOCK', 12, 24);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#2bd456';
    ctx.fillText('● 20/20 ONLINE', 136, 24);
  });
}

const SLED_Y = [0.17, 0.02, -0.13, -0.28];
const FAN_BLADES = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2);

export function MinedockServer() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === 'minedock';
  const rest = useRest('minedock');

  const rotQ = useRef(new THREE.Quaternion());
  const lastPointer = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const angularVelocity = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = React.useState(false);
  
  const fan1 = useRef<THREE.Group>(null);
  const fan2 = useRef<THREE.Group>(null);
  // Drive activity LEDs, flickered from useFrame
  const activityLeds = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useCursor(hovered, isHeld ? 'grab' : 'pointer', 'auto');

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
    }
    api.start({
      pos: isHeld ? [0, 4.5, 0] : rest.pos,
      scale: isHeld ? [2, 2, 2] : [1, 1, 1],
      rot: isHeld ? [0, 0, 0] : rest.rot,
      immediate: false,
    });
  }, [isHeld, api, rest]);

  useFrame((state, delta) => {
    if (fan1.current && fan2.current) {
      fan1.current.rotation.z += delta * 15;
      fan2.current.rotation.z += delta * 15;
    }

    // Irregular disk-activity blinking, a different rhythm per bay
    const t = state.clock.elapsedTime;
    activityLeds.current.forEach((mat, i) => {
      if (!mat) return;
      const busy = Math.sin(t * (7 + i * 3.1) + i * 1.7) + Math.sin(t * (2.3 + i)) > 0.6;
      mat.emissiveIntensity = busy ? 3 : 0.25;
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
      setFocusedItem('minedock');
    }
  };

  const textures = useMemo(() => ({
    grille: createGrilleTexture(),
    slots: createSlotTexture(),
    lcd: createLcdTexture(),
  }), []);

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
      {/* Chassis */}
      <RoundedBox args={[0.7, 0.9, 0.7]} radius={0.02} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3f47" metalness={0.55} roughness={0.42} />
      </RoundedBox>

      {/* Vented top and side panels */}
      <mesh position={[0, 0.451, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.56, 0.56]} />
        <meshStandardMaterial map={textures.slots} metalness={0.6} roughness={0.5} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[side * 0.351, 0.05, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial map={textures.slots} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}

      {/* Rack ears with thumbscrews */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.365, 0, 0.33]}>
          <mesh>
            <boxGeometry args={[0.03, 0.88, 0.06]} />
            <meshStandardMaterial color="#1c1f24" metalness={0.8} roughness={0.35} />
          </mesh>
          {[0.36, -0.36].map((y) => (
            <mesh key={y} position={[0, y, 0.032]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.012, 12]} />
              <meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.25} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Front status LCD */}
      <mesh position={[0, 0.355, 0.352]}>
        <boxGeometry args={[0.56, 0.11, 0.012]} />
        <meshStandardMaterial color="#111317" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.355, 0.359]}>
        <planeGeometry args={[0.5, 0.075]} />
        <meshStandardMaterial map={textures.lcd} emissive="#ffffff" emissiveMap={textures.lcd} emissiveIntensity={0.9} />
      </mesh>

      {/* Hot-swap drive sleds */}
      {SLED_Y.map((y, i) => (
        <group key={y} position={[0, y, 0.35]}>
          <mesh position={[0, 0, 0.012]}>
            <boxGeometry args={[0.6, 0.13, 0.024]} />
            <meshStandardMaterial color="#5a616c" metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh position={[-0.06, 0, 0.0245]}>
            <planeGeometry args={[0.38, 0.095]} />
            <meshStandardMaterial map={textures.grille} metalness={0.3} roughness={0.55} />
          </mesh>
          {/* Release lever */}
          <mesh position={[0.2, 0, 0.034]}>
            <boxGeometry args={[0.07, 0.1, 0.02]} />
            <meshStandardMaterial color="#8d939d" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0.2, 0.03, 0.046]}>
            <boxGeometry args={[0.05, 0.012, 0.006]} />
            <meshStandardMaterial color="#e5642b" />
          </mesh>
          {/* Power (steady) and activity (blinking) LEDs */}
          <mesh position={[0.26, 0.025, 0.026]}>
            <boxGeometry args={[0.014, 0.014, 0.006]} />
            <meshStandardMaterial color="#39ff6a" emissive="#39ff6a" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0.26, -0.015, 0.026]}>
            <boxGeometry args={[0.014, 0.014, 0.006]} />
            <meshStandardMaterial
              ref={(m) => { activityLeds.current[i] = m; }}
              color={i === 2 ? '#ffb020' : '#3aa0ff'}
              emissive={i === 2 ? '#ffb020' : '#3aa0ff'}
              emissiveIntensity={1}
            />
          </mesh>
        </group>
      ))}

      {/* Power button and front USB ports */}
      <mesh position={[0.22, -0.4, 0.352]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.012, 24]} />
        <meshStandardMaterial color="#1a1c20" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.22, -0.4, 0.359]}>
        <torusGeometry args={[0.018, 0.003, 6, 24]} />
        <meshStandardMaterial color="#3aa0ff" emissive="#3aa0ff" emissiveIntensity={2.5} />
      </mesh>
      {[-0.22, -0.16].map((x) => (
        <mesh key={x} position={[x, -0.4, 0.352]}>
          <boxGeometry args={[0.035, 0.014, 0.01]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
      ))}

      {/* Rear: cooling fans behind finger guards, PSU inlet and network ports */}
      {[-0.15, 0.15].map((x, i) => (
        <group key={x} position={[x, 0.12, -0.355]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.012, 32]} />
            <meshStandardMaterial color="#0c0d10" />
          </mesh>
          <group ref={i === 0 ? fan1 : fan2} position={[0, 0, -0.008]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
              <meshStandardMaterial color="#26282d" />
            </mesh>
            {FAN_BLADES.map((a) => (
              <mesh key={a} rotation={[0.5, 0, a, 'ZYX']} position={[Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0]}>
                <boxGeometry args={[0.075, 0.035, 0.004]} />
                <meshStandardMaterial color="#26282d" />
              </mesh>
            ))}
          </group>
          {[0.12, 0.08, 0.04].map((r) => (
            <mesh key={r} position={[0, 0, -0.016]}>
              <torusGeometry args={[r, 0.004, 6, 32]} />
              <meshStandardMaterial color="#9aa0a8" metalness={1} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-0.2, -0.28, -0.356]}>
        <boxGeometry args={[0.1, 0.07, 0.012]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      {[0.08, 0.2].map((x) => (
        <group key={x} position={[x, -0.28, -0.356]}>
          <mesh>
            <boxGeometry args={[0.07, 0.06, 0.012]} />
            <meshStandardMaterial color="#b4b8be" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.004, -0.004]}>
            <boxGeometry args={[0.05, 0.04, 0.008]} />
            <meshStandardMaterial color="#050505" />
          </mesh>
          <mesh position={[-0.026, 0.024, -0.007]}>
            <boxGeometry args={[0.01, 0.008, 0.004]} />
            <meshStandardMaterial color="#39ff6a" emissive="#39ff6a" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}

      {/* Rubber feet */}
      {[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.458, z]}>
          <cylinderGeometry args={[0.04, 0.045, 0.02, 16]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      ))}
    </animated.group>
  );
}
