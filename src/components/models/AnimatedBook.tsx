"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { RoundedBox, Text } from '@react-three/drei';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';
import { PageEdges } from './PageEdges';

const FONT = '/fonts/caveat.woff';
const TITLE_FONT = '/fonts/book-title.woff';

function LeftPageText({ visible, posY }: { visible: boolean; posY: any }) {
  const color = '#0f172a';
  return (
    <animated.group visible={visible} position-x={1.27} position-y={posY} position-z={0} rotation={[Math.PI / 2, 0, Math.PI]}>
      <Text font={FONT} fontSize={0.36} color={color} anchorX="center" anchorY="top" position={[0, 1.35, 0]}>
        About Me
      </Text>
      <mesh position={[0, 0.94, 0]}>
        <planeGeometry args={[1.6, 0.005]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
      <Text font={FONT} fontSize={0.17} color={color} anchorX="center" anchorY="top" position={[0, 0.72, 0]} maxWidth={2.05} textAlign="center" lineHeight={1.25}>
        {"Hi, my name is empfi!\nWelcome to my 3D Portfolio.\n\nI specialize in clean interactive websites, native developer tooling, and security virtualization."}
      </Text>
      <Text font={FONT} fontSize={0.125} color="#475569" anchorX="center" anchorY="top" position={[0, -0.65, 0]} maxWidth={2.0} textAlign="center" lineHeight={1.2}>
        {"Everything you see on this desk is rendered in real-time WebGL with React Three Fiber."}
      </Text>
    </animated.group>
  );
}

function RightPageText({ visible, posY }: { visible: boolean; posY: any }) {
  const color = '#0f172a';
  return (
    <animated.group visible={visible} position-x={0.02} position-y={posY} position-z={0} rotation={[-Math.PI / 2, 0, 0]}>
      <Text font={FONT} fontSize={0.36} color={color} anchorX="center" anchorY="top" position={[0, 1.35, 0]}>
        My Projects
      </Text>
      <mesh position={[0, 0.94, 0]}>
        <planeGeometry args={[1.6, 0.005]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
      <Text font={FONT} fontSize={0.18} color={color} anchorX="center" anchorY="top" position={[0, 0.72, 0]} maxWidth={2.15} textAlign="center" lineHeight={1.3}>
        {"Feel free to explore my workspace!\nMy projects are scattered around the desk as interactive 3D objects."}
      </Text>
      <Text font={FONT} fontSize={0.18} color={color} anchorX="center" anchorY="top" position={[0, -0.05, 0]} maxWidth={2.1} textAlign="center" lineHeight={1.3}>
        {"Click around to discover them!"}
      </Text>
    </animated.group>
  );
}

export function AnimatedBook() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isOpen = focusedItem === 'book';
  const rest = useRest('book');

  // Keep page text mounted throughout the closing animation so it never vanishes abruptly
  const [showPages, setShowPages] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setShowPages(true);
    } else {
      const t = setTimeout(() => setShowPages(false), 380);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Two-hinge hardcover kinematics
  const { bookPos, bookRot, bookScale, openProgress } = useSpring({
    bookPos: isOpen ? [1.14, 3.8, 0.6] : rest.pos,
    bookRot: isOpen ? [0.68, 0, 0] : rest.rot,
    bookScale: isOpen ? [0.825, 0.825, 0.825] : [0.75, 0.75, 0.75],
    openProgress: isOpen ? 1 : 0,
    config: { mass: 1, tension: 170, friction: 26, clamp: true },
  });

  const spineRotZ = openProgress.to((p) => p * (Math.PI / 2));
  const frontRotZ = openProgress.to((p) => p * (Math.PI / 2));
  const rightPageScaleY = openProgress.to((p) => 1.85 - 0.85 * p);
  const rightPagePosY = openProgress.to((p) => 0.02 + (0.09 * (1.85 - 0.85 * p)) / 2);
  const rightTextPosY = openProgress.to((p) => 0.02 + 0.09 * (1.85 - 0.85 * p) + 0.005);
  const leftPageScaleY = openProgress.to((p) => 0.06 + 0.94 * p);
  const leftPagePosY = openProgress.to((p) => -0.02 - (0.09 * (0.06 + 0.94 * p)) / 2);
  const leftTextPosY = openProgress.to((p) => -0.02 - 0.09 * (0.06 + 0.94 * p) - 0.005);

  const toggle = (e: any) => {
    e.stopPropagation();
    setFocusedItem(isOpen ? null : 'book');
  };

  const stopProp = (e: any) => e.stopPropagation();
  const over = () => { document.body.style.cursor = 'pointer'; };
  const out = () => { document.body.style.cursor = 'auto'; };

  // Rich archival midnight-sapphire bookcloth material
  const coverMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a273e',
        roughness: 0.68,
        metalness: 0.08,
      }),
    [],
  );

  const spineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#111b2d',
        roughness: 0.72,
        metalness: 0.05,
      }),
    [],
  );

  const pagesMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fbf8ef',
        roughness: 0.96,
      }),
    [],
  );

  const ribbonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#991b1b',
        roughness: 0.38,
        metalness: 0.15,
      }),
    [],
  );

  return (
    <animated.group
      position={bookPos as any}
      rotation={bookRot as any}
      scale={bookScale as any}
      onPointerDown={stopProp}
      onPointerUp={stopProp}
      onPointerMove={stopProp}
      onDoubleClick={stopProp}
    >
      {/* ── Back Cover ── */}
      <RoundedBox
        args={[2.54, 0.04, 3.5]}
        position={[0, 0, 0]}
        radius={0.018}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={toggle}
        onPointerOver={over}
        onPointerOut={out}
      >
        <primitive object={coverMat} attach="material" />
      </RoundedBox>

      {/* ── Right Page Stack ── */}
      <animated.group position-x={0.02} position-y={rightPagePosY as any} scale-y={rightPageScaleY as any}>
        <RoundedBox
          args={[2.44, 0.09, 3.38]}
          radius={0.01}
          smoothness={2}
          castShadow
          receiveShadow
          onClick={toggle}
          onPointerOver={over}
          onPointerOut={out}
        >
          <primitive object={pagesMat} attach="material" />
        </RoundedBox>
        <PageEdges w={2.44} h={0.09} d={3.38} position={[0, 0, 0]} />
      </animated.group>

      {/* ── Bookmark Ribbon ── */}
      <group position={[0.45, 0.06, -1.42]} onClick={toggle} onPointerOver={over} onPointerOut={out}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.008, 0.95]} />
          <primitive object={ribbonMat} attach="material" />
        </mesh>
      </group>

      <RightPageText visible={showPages} posY={rightTextPosY} />

      {/* ── Hinge 1: Spine ── */}
      <animated.group position={[-1.27, 0, 0]} rotation-z={spineRotZ as any}>
        <RoundedBox
          args={[0.05, 0.22, 3.5]}
          position={[0, 0.11, 0]}
          radius={0.02}
          smoothness={4}
          castShadow
          receiveShadow
          onClick={toggle}
          onPointerOver={over}
          onPointerOut={out}
        >
          <primitive object={spineMat} attach="material" />
        </RoundedBox>

        {/* ── Hinge 2: Front Cover ── */}
        <animated.group position={[0, 0.22, 0]} rotation-z={frontRotZ as any}>
          <RoundedBox
            args={[2.54, 0.04, 3.5]}
            position={[1.27, 0, 0]}
            radius={0.018}
            smoothness={4}
            castShadow
            receiveShadow
            onClick={toggle}
            onPointerOver={over}
            onPointerOut={out}
          >
            <primitive object={coverMat} attach="material" />
          </RoundedBox>

          {/* Title */}
          <Text
            font={TITLE_FONT}
            fontSize={0.42}
            letterSpacing={0.06}
            color="#e2e8f0"
            position={[1.27, 0.024, -0.3]}
            rotation={[-Math.PI / 2, 0, 0]}
            anchorX="center"
            anchorY="middle"
          >
            Journal
          </Text>

          {/* Left Page Stack (when book opens) */}
          <animated.group position-x={1.25} position-y={leftPagePosY as any} scale-y={leftPageScaleY as any}>
            <RoundedBox
              args={[2.44, 0.09, 3.38]}
              radius={0.01}
              smoothness={2}
              castShadow
              receiveShadow
              onClick={toggle}
              onPointerOver={over}
              onPointerOut={out}
            >
              <primitive object={pagesMat} attach="material" />
            </RoundedBox>
            <PageEdges w={2.44} h={0.09} d={3.38} position={[0, 0, 0]} />
          </animated.group>

          <LeftPageText visible={showPages} posY={leftTextPosY} />
        </animated.group>
      </animated.group>
    </animated.group>
  );
}
