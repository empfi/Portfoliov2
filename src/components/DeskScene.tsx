"use client";

import React, { useRef, useEffect, Suspense } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, PerspectiveCamera, useTexture } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { FocusProvider, useFocus } from '@/context/FocusContext';
import { TurnstileProvider, useTurnstile } from '@/context/TurnstileContext';
import RouteSync from './RouteSync';
import GuestbookComposer from './GuestbookComposer';
import { CONTENT, usePortrait } from '@/context/DeskLayout';
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
// import MysteryBox from './models/MysteryBox';
import * as THREE from 'three';

// Preload compressed WebP textures
useTexture.preload([
  '/textures/wood/color.webp',
  '/textures/wood/normal.webp',
  '/textures/wood/roughness.webp',
  '/wallpaper.webp',
]);

function BackgroundClicker() {
  const { focusedItem, setFocusedItem } = useFocus();
  return (
    <mesh 
      onPointerDown={(e) => {
        if (focusedItem) {
          e.stopPropagation();
          setFocusedItem(null);
        }
      }}
    >
      <sphereGeometry args={[50, 16, 16]} />
      <meshBasicMaterial transparent={true} opacity={0} side={THREE.BackSide} depthWrite={false} />
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

// Soft "studio" reflections for the metal/glossy props. Rendered once into a cube map from
// a few emissive panels, so it needs no HDR download (drei's presets fetch from a CDN).
function StudioEnvironment() {
  return (
    <Environment resolution={128} environmentIntensity={0.55}>
      <Lightformer intensity={2} color="#fff1e0" position={[0, 6, -8]} scale={[12, 5, 1]} />
      <Lightformer intensity={1.2} color="#ffe6cc" position={[-8, 3, 3]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer intensity={0.8} color="#dfe8ff" position={[8, 2, 3]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer form="ring" intensity={2.5} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={5} />
      {/* Softbox behind the swoop camera so held items' front faces have something to reflect */}
      <Lightformer intensity={1.6} color="#fff6ea" position={[0, 5, 10]} scale={[10, 4, 1]} />
    </Environment>
  );
}

const topDownQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const dummyCam = new THREE.PerspectiveCamera();

// Swooped items are held at SWOOP_LOOK and viewed from SWOOP_LOOK + SWOOP_OFFSET.
const SWOOP_LOOK = new THREE.Vector3(0, 4.5, 0);
const SWOOP_OFFSET = new THREE.Vector3(0, 1.5, 9);
const SWOOP_ITEMS = new Set(['hyperplex', 'luakey', 'minedock', 'bloxvault', 'neutrabots', 'mysterybox']);
const X_AXIS = new THREE.Vector3(1, 0, 0);

function CameraRig() {
  const { focusedItem } = useFocus();
  const { camera, size } = useThree();

  const aspect = size.width / size.height;
  const portrait = usePortrait();
  // Matches Tailwind's `sm` breakpoint, below which the project card is a bottom sheet
  const compact = size.width < 640;
  const fov = portrait ? 45 : 35;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));

  const isPolaroid = focusedItem?.startsWith('polaroid') || false;
  const shouldSwoop = (!!focusedItem && SWOOP_ITEMS.has(focusedItem)) || isPolaroid;
  const hasCard = !!focusedItem && focusedItem in PROJECT_DATA;
  const isBook = focusedItem === 'book' || focusedItem === 'guestbook';
  const isPhone = focusedItem === 'phone';

  // Height at which a top-down camera sees a patch `across` wide and `down` tall on screen
  const fitHeight = (across: number, down: number) => Math.max(down / (2 * tanHalf), across / (2 * tanHalf * aspect));

  // Frame the whole layout (portrait re-flows it into a tall grid, see DeskLayout).
  // Landscape keeps the original 14-unit height unless the window is too narrow for it.
  const content = portrait ? CONTENT.portrait : CONTENT.landscape;
  const overviewHeight = Math.max(portrait ? 0 : 14, fitHeight(content.w, content.d) * 1.05);
  // Open books (~4.2 × 2.9, held at y 4.5) and the phone (~2.3 × 4.5, held at y 1.5, tilted
  // toward the camera so padded) are viewed upright from above; on desktop the overview
  // height already frames them.
  const bookHeight = Math.max(portrait ? 0 : 14, 4.5 + fitHeight(4.8, 3.4));
  const phoneHeight = Math.max(portrait ? 0 : 14, 1.5 + fitHeight(2.8, 5.6));
  // Push the guestbook up the screen on phones so the on-screen keyboard doesn't cover it
  const bookZ = compact && focusedItem === 'guestbook' ? 1.6 : 0;
  const bookX = portrait ? 0.27 : 0;
  // Frame the held item's width: polaroids (~2.8) need more room than the project props (~2.2).
  // Portrait screens may move in closer than the desktop framing, but never farther than needed.
  const swoopWidth = hasCard ? 2.6 : 3.4;
  const swoopScale = Math.max(portrait ? 0.7 : 1, swoopWidth / (2 * SWOOP_OFFSET.length() * tanHalf * aspect));

  // With the card docked at the bottom, pitch the view down so the held item sits in the top half
  const cardPitch = React.useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan(0.45 * tanHalf)),
    [tanHalf],
  );

  const parallaxOffset = useRef({ x: 0, z: 0 });
  const isInitial = useRef(true);
  const targetPos = useRef(new THREE.Vector3()).current;
  const targetLook = useRef(new THREE.Vector3()).current;
  const swoopQuat = useRef(new THREE.Quaternion()).current;

  useFrame((state, delta) => {
    // Clamp delta to prevent massive jumps when switching tabs
    const dt = Math.min(delta, 0.1);

    parallaxOffset.current.x = THREE.MathUtils.lerp(parallaxOffset.current.x, state.pointer.x, 4 * dt);
    parallaxOffset.current.z = THREE.MathUtils.lerp(parallaxOffset.current.z, -state.pointer.y, 4 * dt);
    const px = parallaxOffset.current.x;
    const pz = parallaxOffset.current.z;

    if (shouldSwoop) {
      targetLook.copy(SWOOP_LOOK);
      targetPos.copy(SWOOP_OFFSET).multiplyScalar(swoopScale).add(SWOOP_LOOK);
      targetLook.x += px * 0.15;
      targetLook.z += pz * 0.15;
    } else if (isBook) {
      targetPos.set(bookX, bookHeight, bookZ);
    } else if (isPhone) {
      targetPos.set(0, phoneHeight, 0);
    } else {
      targetPos.set(px * 0.1, overviewHeight, pz * 0.1);
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

    let finalQuat: THREE.Quaternion;
    if (shouldSwoop) {
      // Small corresponding target shift to make rotation feel natural
      targetLook.x += breathX * 0.5;
      targetLook.y += breathY * 0.5;
      targetLook.z += breathZ * 0.5;

      dummyCam.position.copy(targetPos);
      dummyCam.up.set(0, 1, 0);
      dummyCam.lookAt(targetLook);
      swoopQuat.copy(dummyCam.quaternion);
      if (compact && hasCard) swoopQuat.multiply(cardPitch);
      finalQuat = swoopQuat;
    } else {
      finalQuat = topDownQuat;
    }

    // Skip intro animation on page load/reload — snap directly to resting position
    if (isInitial.current) {
      camera.position.copy(targetPos);
      camera.quaternion.copy(finalQuat);
      isInitial.current = false;
      return;
    }

    const lerpSpeed = shouldSwoop ? 5 : 3; 
    camera.position.lerp(targetPos, lerpSpeed * dt);
    camera.quaternion.slerp(finalQuat, lerpSpeed * dt);
  });

  return (
    <>
      {/* Tuned for a camera 14 units up; kept relative so the higher portrait overview isn't fogged out */}
      <fog attach="fog" args={['#1a1209', overviewHeight + 1, overviewHeight + 16]} />
      <PerspectiveCamera
        makeDefault
        position={[0, 14, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fov={fov}
        near={0.1}
        far={100}
      />
    </>
  );
}

export default function DeskScene() {
  const portrait = usePortrait();
  // Fixed at the screen's native density (3x on most phones). Deliberately not adaptive:
  // stepping resolution down when frames dip (e.g. once a phone warms up and throttles)
  // made the whole page visibly go soft mid-visit.
  const [dpr] = React.useState(() => (typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio, 3)));
  return (
    <TurnstileProvider>
      <div style={{
        width: '100dvw', height: '100dvh',
        position: 'fixed', top: 0, left: 0,
        background: '#1a1209',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}>
        <FocusProvider>
          <RouteSync />
          <KeyboardControls />
          {/* Invisible Turnstile widget — outside Canvas, no R3F conflict */}
          <TurnstileWidget />
          <Canvas shadows dpr={dpr} gl={{ powerPreference: 'high-performance' }}>
            <BackgroundClicker />
            <CameraRig />
            <SceneLighting />
            <StudioEnvironment />

            <Suspense fallback={null}>
              {/* Desk — turned lengthwise on portrait screens to match the tall layout */}
              <group position={[0, -0.5, 0]} rotation-y={portrait ? Math.PI / 2 : 0}>
                <TexturedDesk />
              </group>

              <MinecraftBlock />
              <LuaKey />
              <MinedockServer />
              <BloxvaultSafe />
              <NeutrabotsToy />
              {/* Mystery box is off the desk for now; re-enable by rendering <MysteryBox /> here */}
              <AnimatedBook />
              <GuestBook />
              
              <Smartphone />
              
              <Polaroid id="polaroid_1" caption="Coming soon" />
              <Polaroid id="polaroid_2" caption="Coming soon" />
              <Polaroid id="polaroid_3" caption="Coming soon" />

              <ContactShadows position={[0, 0.05, 0]} opacity={0.8} scale={15} blur={2} far={2} resolution={512} color="#000000" />
            </Suspense>
          </Canvas>
          <ProjectOverlay />
          <GuestbookComposer />
        </FocusProvider>
      </div>
    </TurnstileProvider>
  );
}

/** Renders the invisible Turnstile widget in normal DOM (outside Canvas). Stores token in context. */
function TurnstileWidget() {
  const { setToken } = useTurnstile();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={setToken}
      options={{ action: 'submit_guestbook' }}
    />
  );
}

function KeyboardControls() {
  const { focusedItem, setFocusedItem } = useFocus();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedItem !== null) {
        e.preventDefault();
        setFocusedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedItem, setFocusedItem]);

  return null;
}



const PROJECT_DATA: Record<string, { title: string; desc: string; tags: string[]; link: string; buttonText?: string }> = {
  hyperplex: {
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

function ProjectOverlay() {
  const { focusedItem } = useFocus();
  
  const data = focusedItem && PROJECT_DATA[focusedItem];

  return (
    <div
      // Phones: bottom sheet (the camera pitches down so the held item sits above it).
      // sm and up: card floats vertically centred on the right.
      className={`fixed z-50 left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[55dvh] sm:left-auto sm:bottom-auto sm:top-1/2 sm:right-8 md:right-12 sm:w-[420px] sm:max-h-[calc(100dvh-32px)] overflow-y-auto bg-[#171717] rounded-sm p-4 sm:p-8 text-[#f5f5f5] shadow-[10px_10px_0px_rgba(0,0,0,0.6)] border border-[#333333] transition-all duration-500 ease-out sm:-translate-y-1/2 ${data ? 'opacity-100 translate-y-0 sm:translate-x-0 pointer-events-auto' : 'opacity-0 translate-y-8 sm:translate-x-12 pointer-events-none'}`}
    >
      {data && (
        <div className="flex flex-col h-full sm:mt-2 relative">
          <h2 className="text-xl sm:text-3xl font-serif font-black mb-3 sm:mb-6 tracking-tight uppercase border-b border-[#333333] pb-2 sm:pb-4">
            {data.title}
          </h2>
          
          <div className="flex-1">
            <p className="font-serif text-[#a3a3a3] text-sm sm:text-lg leading-relaxed mb-4 sm:mb-8">
              {data.desc}
            </p>
            
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-10">
              {data.tags.map((tag, i) => (
                <span 
                  key={tag} 
                  className="px-2 sm:px-3 py-0.5 sm:py-1 border border-[#444444] text-[#a3a3a3] text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase bg-[#222222]"
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
            className="sm:mt-2 w-full bg-transparent border-2 border-[#f5f5f5] text-[#f5f5f5] font-mono font-bold uppercase tracking-widest py-2.5 sm:py-3 hover:bg-[#f5f5f5] hover:text-[#171717] transition-colors flex items-center justify-center gap-3 text-xs sm:text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
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
