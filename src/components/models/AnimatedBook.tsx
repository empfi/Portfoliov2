"use client";

import React from 'react';
import { useSpring, animated } from '@react-spring/three';
import { RoundedBox, Text } from '@react-three/drei';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';

function LeftPageText({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const font = '/fonts/caveat.woff';
  const color = '#111827';
  return (
    <group position={[1.25, -0.125, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
      <Text font={font} fontSize={0.35} color={color} anchorX="center" anchorY="top" position={[0, 1.35, 0]}>
        About Me
      </Text>
      <Text font={font} fontSize={0.16} color={color} anchorX="center" anchorY="top" position={[0, 0.6, 0]} maxWidth={2.0} textAlign="center">
        {"Hi, my name is empfi, welcome to my Portfolio!\nI usually mainly focus on 2D Websites and Apps but tried something new with this!"}
      </Text>
      <Text font={font} fontSize={0.11} color={color} anchorX="center" anchorY="top" position={[0, -0.7, 0]} maxWidth={2.0} textAlign="center">
        {"Everything you see here is\nrendered in WebGL using\nReact Three Fiber."}
      </Text>
    </group>
  );
}

function RightPageText({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const color = '#111827';
  const font = '/fonts/caveat.woff';

  return (
    <group position={[0.1, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
      <Text font={font} fontSize={0.10} color={visible ? '#000000' : '#000000'} anchorX="center" anchorY="top" position={[0, -0.99, 0]}>
        {'Some additional information can also be found on the Phone.'}
      </Text>
    </group>
  );
}

export function AnimatedBook() {
  const { focusedItem, setFocusedItem } = useFocus();
  // Book is active if it is the currently focused item globally
  const isOpen = focusedItem === 'book';
  const rest = useRest('book');

  const { bookPos, bookRot, bookScale, coverRotation } = useSpring({
    bookPos: isOpen ? [1.25, 4.5, 0] : rest.pos,
    bookRot: isOpen ? [0, 0, 0] : rest.rot,
    bookScale: isOpen ? [0.825, 0.825, 0.825] : [0.75, 0.75, 0.75],
    coverRotation: isOpen ? Math.PI * 0.95 : 0,
    config: { mass: 1, tension: 160, friction: 30, clamp: true },
  });

  const toggle = (e: any) => { 
    e.stopPropagation(); 
    setFocusedItem(isOpen ? null : 'book'); 
  };
  
  const stopProp = (e: any) => e.stopPropagation();
  const over = () => { document.body.style.cursor = 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

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
      <RoundedBox args={[2.7, 0.04, 3.5]} position={[0, -0.02, 0]} radius={0.02} smoothness={4}
        castShadow receiveShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color="#3b82f6" roughness={0.7} />
      </RoundedBox>

      <RoundedBox args={[2.5, 0.1, 3.4]} position={[0.05, 0.05, 0]} radius={0.01} smoothness={2}
        castShadow receiveShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color="#fefefe" roughness={1} />
      </RoundedBox>

      <RoundedBox args={[0.2, 0.28, 3.5]} position={[-1.25, 0.1, 0]} radius={0.05} smoothness={4}
        castShadow receiveShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
      </RoundedBox>

      {/* Bookmark — tucked INSIDE the right pages so it marks "another page" */}
      <mesh position={[0.5, 0.05, -1.42]} castShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
        <boxGeometry args={[0.22, 0.01, 0.85]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>

      <animated.group position={[-1.25, 0.221, 0]} rotation-z={coverRotation}>
        <RoundedBox args={[2.5, 0.04, 3.5]} position={[1.25, 0, 0]} radius={0.02} smoothness={4}
          castShadow receiveShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
          <meshStandardMaterial color="#3b82f6" roughness={0.7} />
        </RoundedBox>

        {/* Front Cover Title */}
        <Text font="/fonts/caveat.woff" fontSize={0.5} color="#172554" position={[1.25, 0.025, -1.0]} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
          Journal
        </Text>
        
        <RoundedBox args={[2.45, 0.1, 3.4]} position={[1.25, -0.07, 0]} radius={0.01} smoothness={2}
          castShadow receiveShadow onClick={toggle} onPointerOver={over} onPointerOut={out}>
          <meshStandardMaterial color="#fefefe" roughness={1} />
        </RoundedBox>

        <LeftPageText visible={isOpen} />
      </animated.group>

      <RightPageText visible={isOpen} />
    </animated.group>
  );
}
