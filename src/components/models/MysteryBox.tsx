import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';
import { useCursor, RoundedBox, Octahedron, Torus } from '@react-three/drei';

function createQuestionMarkTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#ffd700'; 
  ctx.font = 'bold 200px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw stroke/shadow for 3D effect
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  ctx.fillText('?', 128, 138); 

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function MysteryBox() {
  const { focusedItem, setFocusedItem } = useFocus();
  const { pos: position } = useRest('mysterybox');
  const isFocused = focusedItem === 'mysterybox';
  
  const [hovered, setHovered] = useState(false);
  const [opened, setOpened] = useState(false);
  const [shaking, setShaking] = useState(false);
  
  const customCursor = isFocused ? (opened ? 'grab' : 'pointer') : 'pointer';
  useCursor(hovered, customCursor, 'auto');

  const isPointerDown = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const angularVelocity = useRef({ x: 0, y: 0 });
  const currentRotation = useRef(new THREE.Euler(0, -0.5, 0));
  const rotationQuat = useRef(new THREE.Quaternion().setFromEuler(currentRotation.current));
  const isDragging = useRef(false);

  // Generate textures once
  const { topTex, botTex } = useMemo(() => {
    const baseTex = createQuestionMarkTexture();
    if (!baseTex) return { topTex: null, botTex: null };
    
    const top = baseTex.clone();
    top.repeat.set(1, 0.5);
    top.offset.set(0, 0.5);
    top.needsUpdate = true;
    
    const bot = baseTex.clone();
    bot.repeat.set(1, 0.5);
    bot.offset.set(0, 0);
    bot.needsUpdate = true;
    
    return { topTex: top, botTex: bot };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      rotationQuat.current.identity();
      angularVelocity.current = { x: 0, y: 0 };
      setOpened(false);
      setShaking(false);
    }
  }, [isFocused]);

  const handlePointerDown = (e: any) => {
    if (!isFocused) return;
    e.stopPropagation();
    isPointerDown.current = true;
    isDragging.current = false;
    previousPointer.current = { x: e.clientX, y: e.clientY };
    angularVelocity.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isPointerDown.current || !isFocused) return;
    e.stopPropagation();
    isDragging.current = true;
    const dx = e.clientX - previousPointer.current.x;
    const dy = e.clientY - previousPointer.current.y;
    angularVelocity.current = { x: dy * 0.01, y: dx * 0.01 };
    previousPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: any) => {
    if (!isPointerDown.current) return;
    e.stopPropagation();
    isPointerDown.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const shakeStartTime = useRef(0);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isDragging.current && !isFocused) {
      setFocusedItem('mysterybox');
    } else if (!isDragging.current && isFocused && !opened && !shaking) {
      if (Math.abs(angularVelocity.current.x) < 0.02 && Math.abs(angularVelocity.current.y) < 0.02) {
        setShaking(true);
        shakeStartTime.current = performance.now();
        setTimeout(() => {
          setShaking(false);
          setOpened(true);
        }, 850); 
      }
    }
  };

  // 1. Centering & Scaling Spring
  const { pos, scale } = useSpring({
    pos: isFocused ? [0, 4.5, 0] : position,
    scale: isFocused ? [1.6, 1.6, 1.6] : [1.0, 1.0, 1.0],
    config: { mass: 1, tension: 180, friction: 26 }
  });

  // 2. Open animations
  const { lidY, lidZ, lidRotX, lidRotY, lidRotZ, lightIntensity, gemY, gemScale } = useSpring({
    lidY: opened ? 1.5 : 0.45, 
    lidZ: opened ? -0.8 : 0.0,
    lidRotX: opened ? Math.PI * 2.2 : 0, 
    lidRotY: opened ? Math.PI * 1.5 : 0, 
    lidRotZ: opened ? Math.PI * 0.5 : 0, 
    lightIntensity: opened ? 40.0 : 0.0, 
    gemY: opened ? 0.6 : 0.0,
    gemScale: opened ? 1.0 : 0.0,
    config: opened ? { mass: 1, tension: 350, friction: 14 } : { mass: 1, tension: 200, friction: 20 }
  });

  const meshRef = useRef<THREE.Group>(null);
  const shakeRef = useRef<THREE.Group>(null);
  const rubyRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!isPointerDown.current) {
      angularVelocity.current.x *= 0.92;
      angularVelocity.current.y *= 0.92;
    }

    const deltaQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(angularVelocity.current.x, angularVelocity.current.y, 0)
    );
    rotationQuat.current.multiplyQuaternions(deltaQuat, rotationQuat.current);
    rotationQuat.current.normalize();

    if (meshRef.current) {
      meshRef.current.quaternion.slerp(rotationQuat.current, 10 * delta);
    }

    if (shakeRef.current) {
      if (shaking) {
        const elapsed = (performance.now() - shakeStartTime.current) / 1000;
        const intensity = Math.min(elapsed / 0.85, 1.0); 
        
        const time = state.clock.getElapsedTime();
        shakeRef.current.position.x = Math.sin(time * 180) * 0.05 * intensity;
        shakeRef.current.position.y = Math.cos(time * 160) * 0.03 * intensity;
        shakeRef.current.position.z = Math.sin(time * 190) * 0.05 * intensity;
        shakeRef.current.rotation.x = Math.sin(time * 140) * 0.04 * intensity;
        shakeRef.current.rotation.y = Math.cos(time * 150) * 0.06 * intensity;
        
        const bulge = 1.0 + (intensity * 0.2); 
        shakeRef.current.scale.set(bulge, bulge, bulge);
      } else {
        shakeRef.current.position.set(0, 0, 0);
        shakeRef.current.rotation.set(0, 0, 0);
        shakeRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 15 * delta);
      }
    }

    if (opened) {
      if (rubyRef.current) {
        rubyRef.current.rotation.y += delta * 1.0;
      }
      if (ring1Ref.current) {
        ring1Ref.current.rotation.x += delta * 2.5;
        ring1Ref.current.rotation.y += delta * 1.5;
      }
      if (ring2Ref.current) {
        ring2Ref.current.rotation.y -= delta * 2.0;
        ring2Ref.current.rotation.z += delta * 1.0;
      }
    }
  });

  const goldMaterial = <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />;
  const purpleGlassMaterial = (
    <meshPhysicalMaterial 
      color="#b829ff" 
      transmission={0.4} 
      opacity={0.9} 
      transparent 
      roughness={0.1} 
      metalness={0.2} 
      thickness={0.5} 
    />
  );

  return (
    <animated.group position={pos as any} scale={scale as any}>
      <group 
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <group ref={shakeRef}>
          {/* Bottom Half of Box */}
          <group position={[0, 0.15, 0]}>
            {/* Hollow Bottom Walls (0.06 thickness) */}
            <RoundedBox args={[0.6, 0.06, 0.6]} radius={0.01} position={[0, -0.12, 0]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.06, 0.24, 0.6]} radius={0.01} position={[-0.27, 0.03, 0]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.06, 0.24, 0.6]} radius={0.01} position={[0.27, 0.03, 0]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.48, 0.24, 0.06]} radius={0.01} position={[0, 0.03, -0.27]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.48, 0.24, 0.06]} radius={0.01} position={[0, 0.03, 0.27]}>{purpleGlassMaterial}</RoundedBox>

            {/* 4 Bottom Gold Corners */}
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[0.3, -0.15, 0.3]}>{goldMaterial}</RoundedBox>
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[-0.3, -0.15, 0.3]}>{goldMaterial}</RoundedBox>
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[0.3, -0.15, -0.3]}>{goldMaterial}</RoundedBox>
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[-0.3, -0.15, -0.3]}>{goldMaterial}</RoundedBox>
            
            {/* Bottom halves of the Question Marks */}
            {botTex && (
              <>
                <mesh position={[0, 0, 0.301]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={botTex} transparent depthWrite={false} />
                </mesh>
                <mesh position={[0, 0, -0.301]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={botTex} transparent depthWrite={false} />
                </mesh>
                <mesh position={[0.301, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={botTex} transparent depthWrite={false} />
                </mesh>
                <mesh position={[-0.301, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={botTex} transparent depthWrite={false} />
                </mesh>
              </>
            )}
          </group>

          {/* Top Half of Box (Lid) */}
          <animated.group position-y={lidY} position-z={lidZ} rotation-x={lidRotX} rotation-y={lidRotY} rotation-z={lidRotZ}>
            {/* Hollow Top Walls (0.06 thickness) */}
            <RoundedBox args={[0.6, 0.06, 0.6]} radius={0.01} position={[0, 0.12, 0]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.06, 0.24, 0.6]} radius={0.01} position={[-0.27, -0.03, 0]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.06, 0.24, 0.6]} radius={0.01} position={[0.27, -0.03, 0]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.48, 0.24, 0.06]} radius={0.01} position={[0, -0.03, -0.27]}>{purpleGlassMaterial}</RoundedBox>
            <RoundedBox args={[0.48, 0.24, 0.06]} radius={0.01} position={[0, -0.03, 0.27]}>{purpleGlassMaterial}</RoundedBox>

            {/* 4 Top Gold Corners */}
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[0.3, 0.15, 0.3]}>{goldMaterial}</RoundedBox>
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[-0.3, 0.15, 0.3]}>{goldMaterial}</RoundedBox>
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[0.3, 0.15, -0.3]}>{goldMaterial}</RoundedBox>
            <RoundedBox args={[0.12, 0.12, 0.12]} radius={0.01} position={[-0.3, 0.15, -0.3]}>{goldMaterial}</RoundedBox>

            {/* Top halves of the Question Marks */}
            {topTex && (
              <>
                <mesh position={[0, 0, 0.301]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={topTex} transparent depthWrite={false} />
                </mesh>
                <mesh position={[0, 0, -0.301]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={topTex} transparent depthWrite={false} />
                </mesh>
                <mesh position={[0.301, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={topTex} transparent depthWrite={false} />
                </mesh>
                <mesh position={[-0.301, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[0.6, 0.3]} />
                  <meshBasicMaterial map={topTex} transparent depthWrite={false} />
                </mesh>
              </>
            )}
          </animated.group>

          {/* Floating Reward Relic */}
          <animated.group position-y={gemY} scale={gemScale}>
            <group>
              {/* The Ruby */}
              <Octahedron ref={rubyRef} args={[0.15, 0]}>
                <meshPhysicalMaterial 
                  color="#ff0055" 
                  emissive="#440011" 
                  metalness={0.2} 
                  roughness={0.05} 
                  transmission={0.9} 
                  thickness={0.5} 
                />
              </Octahedron>
              
              {/* Inner Gold Ring */}
              <Torus ref={ring1Ref} args={[0.22, 0.015, 16, 64]}>
                {goldMaterial}
              </Torus>
              
              {/* Outer Gold Ring */}
              <Torus ref={ring2Ref} args={[0.28, 0.015, 16, 64]}>
                {goldMaterial}
              </Torus>
              
              <animated.pointLight color="#ff0055" intensity={lightIntensity} distance={5} decay={2} />
            </group>
          </animated.group>
        </group>
      </group>
    </animated.group>
  );
}
