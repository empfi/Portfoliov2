"use client";

import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera, useTexture } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { FocusProvider, useFocus } from '@/context/FocusContext';
import { TexturedDesk } from './models/TexturedDesk';
import { MinecraftBlock } from './models/MinecraftBlock';
import { AnimatedBook } from './models/AnimatedBook';
import { GuestBook } from './models/GuestBook';
import { Smartphone } from './models/Smartphone';
import { Polaroid } from './models/Polaroid';
import { LuaKey } from './models/LuaKey';
import { MinedockServer } from './models/MinedockServer';
import { BloxvaultSafe } from './models/BloxvaultSafe';
import { NeutrabotsToy } from './models/NeutrabotsToy';
import * as THREE from 'three';

// Preload textures
useTexture.preload([
  '/textures/wood/color.jpg',
  '/textures/wood/normal.jpg',
  '/textures/wood/roughness.jpg',
]);

function BackgroundClicker() {
  const { focusedItem, setFocusedItem } = useFocus();
  return (
    <mesh 
      position={[0, 0.001, 0]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      onPointerDown={(e) => {
        if (focusedItem) {
          e.stopPropagation();
          setFocusedItem(null);
        }
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent={true} opacity={0} depthWrite={false} />
    </mesh>
  );
}

function SceneLighting() {
  const { focusedItem } = useFocus();
  const isHeld = focusedItem !== null;
  const { spot, ambient } = useSpring({
    spot: isHeld ? 0.8 : 3.0,
    ambient: isHeld ? 0.4 : 1.2,
    config: { tension: 120, friction: 20 }
  }) as any;

  return (
    <>
      <animated.ambientLight intensity={ambient} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} castShadow />
      <animated.spotLight 
        position={[0, 15, 0]} 
        intensity={spot} 
        angle={1.0} 
        penumbra={0.5}
        color="#ffffff" 
        distance={50}
        decay={1.5}
      />
    </>
  );
}

const topDownQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const dummyCam = new THREE.PerspectiveCamera();

function CameraRig() {
  const { focusedItem } = useFocus();
  const { camera, viewport } = useThree();

  const isPolaroid = focusedItem?.startsWith('polaroid') || false;
  const shouldSwoop = focusedItem === 'block' || focusedItem === 'luakey' || focusedItem === 'minedock' || focusedItem === 'bloxvault' || focusedItem === 'neutrabots' || isPolaroid;

  const parallaxOffset = useRef({ x: 0, z: 0 });
  const baseFov = viewport.aspect < 1.0 ? 55 : 35;

  useFrame((state, delta) => {
    // Clamp delta to prevent massive jumps when switching tabs
    const dt = Math.min(delta, 0.1);

    parallaxOffset.current.x = THREE.MathUtils.lerp(parallaxOffset.current.x, state.pointer.x, 4 * dt);
    parallaxOffset.current.z = THREE.MathUtils.lerp(parallaxOffset.current.z, -state.pointer.y, 4 * dt);

    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();

    if (shouldSwoop) {
      targetPos.set(0, 6, 9);
      targetLook.set(0, 4.5, 0);
    } else {
      targetPos.set(0, 14, 0);
      targetLook.set(0, 0, 0);
    }

    if (!shouldSwoop) {
      targetPos.x += parallaxOffset.current.x * 0.1;
      targetPos.z += parallaxOffset.current.z * 0.1;
    } else {
      targetLook.x += parallaxOffset.current.x * 0.15;
      targetLook.z += parallaxOffset.current.z * 0.15;
    }

    // Add subtle handheld breathing effect (disabled when focusing guestbook for stable typing)
    const time = state.clock.elapsedTime;
    const isGuestBook = focusedItem === 'guestbook';
    const breathMult = isGuestBook ? 0 : 1;
    const breathX = Math.sin(time * 0.8) * 0.08 * breathMult;
    const breathY = Math.cos(time * 0.6) * 0.06 * breathMult;
    const breathZ = Math.sin(time * 0.7) * 0.08 * breathMult;

    targetPos.x += breathX;
    targetPos.y += breathY;
    targetPos.z += breathZ;

    // Small corresponding target shift to make rotation feel natural
    targetLook.x += breathX * 0.5;
    targetLook.y += breathY * 0.5;
    targetLook.z += breathZ * 0.5;

    dummyCam.position.copy(targetPos);
    dummyCam.up.set(0, 1, 0);
    dummyCam.lookAt(targetLook);
    
    const finalQuat = shouldSwoop ? dummyCam.quaternion : topDownQuat;

    const lerpSpeed = shouldSwoop ? 5 : 3; 
    camera.position.lerp(targetPos, lerpSpeed * dt);
    camera.quaternion.slerp(finalQuat, lerpSpeed * dt);
  });

  return (
    <PerspectiveCamera
      makeDefault
      position={[0, 14, 0]} 
      fov={baseFov}
      near={0.1}
      far={100}
    />
  );
}

export default function DeskScene() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      position: 'absolute', top: 0, left: 0,
      background: '#1a1209', // Natural fog color
      touchAction: 'none',
    }}>
      <FocusProvider>
        <Canvas shadows>
          <fog attach="fog" args={['#1a1209', 15, 30]} />
          <BackgroundClicker />
          <CameraRig />
          <SceneLighting />

          {/* Desk */}
          <group position={[0, -0.5, 0]}>
            <TexturedDesk />
          </group>

          <MinecraftBlock />
          <LuaKey />
          <MinedockServer />
          <BloxvaultSafe />
          <NeutrabotsToy />
          <AnimatedBook />
          <GuestBook />
          
          <Smartphone />
          
          <Polaroid id="polaroid_1" caption="Coming soon" defaultPos={[3.5, 0.02, 2.5]} defaultRot={[0, -0.2, 0]} />
          <Polaroid id="polaroid_2" caption="Coming soon" defaultPos={[2.2, 0.02, 3.0]} defaultRot={[0, 0.3, 0]} />
          <Polaroid id="polaroid_3" caption="Coming soon" defaultPos={[0.8, 0.02, 2.8]} defaultRot={[0, -0.1, 0]} />

          <ContactShadows position={[0, 0.05, 0]} opacity={0.8} scale={15} blur={2} far={2} resolution={1024} color="#000000" />
        </Canvas>
        <ProjectOverlay />
      </FocusProvider>
    </div>
  );
}

function GuestbookOverlay() {
  const { focusedItem } = useFocus();
  const isOpen = focusedItem === 'guestbook';

  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/guestbook', {
      method: 'POST',
      body: JSON.stringify({ name, message: msg }),
      headers: { 'Content-Type': 'application/json' }
    });
    setName('');
    setMsg('');
    setLoading(false);
    window.dispatchEvent(new CustomEvent('guestbook-updated'));
  };

  return (
    <div
      className={`fixed top-1/2 left-4 md:left-12 -translate-y-1/2 w-[calc(100vw-32px)] sm:w-[380px] max-w-[380px]
        bg-[#171717] rounded-sm p-8 text-[#f5f5f5] shadow-[10px_10px_0px_rgba(0,0,0,0.6)] border border-[#333333]
        transition-all duration-500 ease-out z-50
        ${isOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-12 pointer-events-none'}`}
    >
      <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: '28px', marginBottom: '20px', color: '#f5f5f5' }}>
        Sign the Guestbook ✍️
      </h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          placeholder="Your Name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ padding: '10px 14px', fontSize: '16px', background: '#262626', border: '1px solid #444', color: '#f5f5f5', borderRadius: '4px', outline: 'none' }}
        />
        <textarea
          placeholder="Your Message..."
          required
          value={msg}
          onChange={e => setMsg(e.target.value)}
          style={{ padding: '10px 14px', fontSize: '16px', background: '#262626', border: '1px solid #444', color: '#f5f5f5', borderRadius: '4px', outline: 'none', minHeight: '120px', resize: 'none' }}
        />
        <button
          disabled={loading}
          type="submit"
          style={{ padding: '12px', fontSize: '18px', background: '#8b5a2b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: "'Caveat', cursive" }}
        >
          {loading ? 'Signing...' : 'Sign'}
        </button>
      </form>
    </div>
  );
}

function ProjectOverlay() {
  const { focusedItem } = useFocus();
  
  const projectData: Record<string, { title: string; desc: string; tags: string[]; link: string; buttonText?: string }> = {
    block: {
      title: "hyperplex.de",
      desc: "A custom Minecraft server network. Features custom-coded gamemodes like SMP and Practice, built to support a large community with high-performance plugins and infrastructure.",
      tags: ["Java", "React", "JavaScript", "CSS", "HTML"],
      link: "https://hyperplex.de"
    },
    luakey: {
      title: "LuaProtect",
      desc: "The ultimate Roblox Luau whitelist service and obfuscator. Protects scripts against decompilation with register-VM bytecode, HWID locks, VPN detection, and live session telemetry.",
      tags: ["React", "JS", "Luau"],
      link: "https://luaprotect.dev"
    },
    minedock: {
      title: "Mindock",
      desc: "Simply manage your Minecraft Server",
      tags: ["JAVASCRIPT", "REACT", "JAVA", "RUST", "TYPESCRIPT"],
      link: "https://github.com/empfi/MineDock",
      buttonText: "View Source"
    },
    bloxvault: {
      title: "Bloxvault",
      desc: "Manage your browser Roblox session in the most advanced and simple way.",
      tags: ["JAVASCRIPT", "REACT", "VITE", "TYPESCRIPT"],
      link: "https://chromewebstore.google.com/detail/bloxvault/hhmcbcgfchblklegmdmgfnjjgfnkdejg?pli=1"
    },
    neutrabots: {
      title: "Neutrabots",
      desc: "Discord management Platform: Manage your bot with presets and customize it how you like.",
      tags: ["JAVASCRIPT", "REACT", "VITE", "SQL", "JAVA"],
      link: "https://neutrabots.com"
    }
  };

  const data = focusedItem && projectData[focusedItem];

  return (
    <div 
      className={`fixed top-1/2 right-4 md:right-12 -translate-y-1/2 w-[calc(100vw-32px)] sm:w-[420px] max-w-[420px] bg-[#171717] rounded-sm p-8 text-[#f5f5f5] shadow-[10px_10px_0px_rgba(0,0,0,0.6)] border border-[#333333] transition-all duration-500 ease-out z-50 overflow-hidden ${data ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-12 pointer-events-none'}`}
    >
      {data && (
        <div className="flex flex-col h-full mt-2 relative">
          <h2 className="text-3xl font-serif font-black mb-6 tracking-tight uppercase border-b border-[#333333] pb-4">
            {data.title}
          </h2>
          
          <div className="flex-1">
            <p className="font-serif text-[#a3a3a3] text-lg leading-relaxed mb-8">
              {data.desc}
            </p>
            
            <div className="flex flex-wrap gap-3 mb-10">
              {data.tags.map((tag, i) => (
                <span 
                  key={tag} 
                  className="px-3 py-1 border border-[#444444] text-[#a3a3a3] text-xs font-mono font-bold tracking-widest uppercase bg-[#222222]"
                  style={{ transform: `rotate(${i % 2 === 0 ? '-1deg' : '2deg'})` }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <a 
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full bg-transparent border-2 border-[#f5f5f5] text-[#f5f5f5] font-mono font-bold uppercase tracking-widest py-3 hover:bg-[#f5f5f5] hover:text-[#171717] transition-colors flex items-center justify-center gap-3 text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            {data.buttonText || "Visit Website"}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
