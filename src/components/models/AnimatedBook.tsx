"use client";

import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { RoundedBox, Text } from '@react-three/drei';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';
import { PageEdges } from './PageEdges';

/** Thin gilt rectangle inset on the front book cover */
function CoverBorder({ color }: { color: string }) {
  const w = 2.15, d = 3.15, t = 0.022;
  const bars: [number, number, number, number][] = [
    [0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d],
  ];
  return (
    <group position={[1.27, 0.022, 0]}>
      {bars.map(([x, z, bw, bd]) => (
        <mesh key={`${x},${z}`} position={[x, 0, z]}>
          <boxGeometry args={[bw, 0.004, bd]} />
          <meshStandardMaterial color={color} metalness={1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function LeftPageText({ visible, posY }: { visible: boolean; posY: any }) {
  const font = '/fonts/caveat.woff';
  const color = '#111827';
  return (
    <animated.group visible={visible} position-x={1.27} position-y={posY} position-z={0} rotation={[Math.PI / 2, 0, Math.PI]}>
      <Text font={font} fontSize={0.35} color={color} anchorX="center" anchorY="top" position={[0, 1.35, 0]}>
        About Me
      </Text>
      <Text font={font} fontSize={0.16} color={color} anchorX="center" anchorY="top" position={[0, 0.6, 0]} maxWidth={2.0} textAlign="center">
        {"Hi, my name is empfi, welcome to my Portfolio!\nI usually mainly focus on 2D Websites and Apps but tried something new with this!"}
      </Text>
      <Text font={font} fontSize={0.11} color={color} anchorX="center" anchorY="top" position={[0, -0.7, 0]} maxWidth={2.0} textAlign="center">
        {"Everything you see here is\nrendered in WebGL using\nReact Three Fiber."}
      </Text>
    </animated.group>
  );
}

function RightPageText({ visible, posY }: { visible: boolean; posY: any }) {
  const color = '#111827';
  const font = '/fonts/caveat.woff';

  return (
    <animated.group visible={visible} position-x={0.02} position-y={posY} position-z={0} rotation={[-Math.PI / 2, 0, 0]}>
      <Text
        font={font}
        fontSize={0.35}
        color={color}
        anchorX="center"
        anchorY="top"
        position={[0, 1.35, 0]}
        maxWidth={2.2}
      >
        My Projects
      </Text>
      <Text font={font} fontSize={0.18} color={color} anchorX="center" anchorY="top" position={[0, 0.8, 0]} maxWidth={2.2} textAlign="center">
        {`Feel free to explore my workspace!`}
      </Text>
      <Text font={font} fontSize={0.18} color={color} anchorX="center" anchorY="top" position={[0, 0.3, 0]} maxWidth={2.0} textAlign="center">
        {`My projects are scattered around the desk as interactive objects.`}
      </Text>
      <Text font={font} fontSize={0.18} color={color} anchorX="center" anchorY="top" position={[0, -0.3, 0]} maxWidth={2.0} textAlign="center">
        {`Click around to discover them!`}
      </Text>
      <Text font={font} fontSize={0.10} color="#000000" anchorX="center" anchorY="top" position={[0, -0.99, 0]}>
        {'Some additional information can also be found on the PC.'}
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

  // Two-hinge hardcover kinematics:
  // When open, the spine folds 90° flat (-X) and the front cover folds another 90° (180° total)
  // so both covers sit flush with zero spine clipping, tilted toward the seated camera angle (0.68 rad).
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
      {/* Back Cover */}
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
        <meshStandardMaterial color="#3b82f6" roughness={0.7} />
      </RoundedBox>

      {/* Right Page Stack (compresses smoothly from full closed block to right half when opened) */}
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
          <meshStandardMaterial color="#fbfaf6" roughness={0.95} />
        </RoundedBox>
        <PageEdges w={2.44} h={0.09} d={3.38} position={[0, 0, 0]} />
      </animated.group>

      {/* Bookmark Ribbon */}
      <mesh position={[0.45, 0.06, -1.42]} castShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
        <boxGeometry args={[0.2, 0.01, 0.85]} />
        <meshStandardMaterial color="#c0392b" roughness={0.8} />
      </mesh>

      <RightPageText visible={showPages} posY={rightTextPosY} />

      {/* Hinge 1: Spine folding from the left edge of the Back Cover */}
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
          <meshStandardMaterial color="#1e3a8a" roughness={0.78} />
        </RoundedBox>

        {/* Hinge 2: Front Cover folding from the top edge of the Spine */}
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
            <meshStandardMaterial color="#3b82f6" roughness={0.7} />
          </RoundedBox>

          <CoverBorder color="#d4af37" />
          <Text
            font="/fonts/caveat.woff"
            fontSize={0.5}
            color="#172554"
            position={[1.27, 0.024, -1.0]}
            rotation={[-Math.PI / 2, 0, 0]}
            anchorX="center"
            anchorY="middle"
          >
            Journal
          </Text>

          {/* Left Page Stack (grows smoothly as pages fan onto the opened left cover) */}
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
              <meshStandardMaterial color="#fbfaf6" roughness={0.95} />
            </RoundedBox>
            <PageEdges w={2.44} h={0.09} d={3.38} position={[0, 0, 0]} />
          </animated.group>

          <LeftPageText visible={showPages} posY={leftTextPosY} />
        </animated.group>
      </animated.group>
    </animated.group>
  );
}
