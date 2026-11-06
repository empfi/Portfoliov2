"use client";

import React, { useRef, useEffect, Suspense } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerspectiveCamera, useTexture } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { FocusProvider, useFocus } from '@/context/FocusContext';
import { TurnstileProvider, useTurnstile } from '@/context/TurnstileContext';
import RouteSync from './RouteSync';
import GuestbookComposer from './GuestbookComposer';
import { CONTENT, usePortrait, useRest } from '@/context/DeskLayout';
import { DeskShadows } from './models/DeskShadows';
import { TexturedDesk } from './models/TexturedDesk';
import { WorkspaceEnvironment } from './models/WorkspaceEnvironment';
import { DesktopPC } from './models/DesktopPC';
import { MinecraftBlock } from './models/MinecraftBlock';
import { AnimatedBook } from './models/AnimatedBook';
import { GuestBook } from './models/GuestBook';
import { AirPodsCase } from './models/AirPodsCase';
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
  '/pc-wallpaper.webp',
  '/logos/minedock.webp',
  '/logos/bloxvault.webp',
  '/logos/neutrabots.webp',
  '/logos/hyperplex.webp',
  '/logos/luaprotect.webp',
  '/stack/typescript.webp',
  '/stack/javascript.webp',
  '/stack/react.webp',
  '/stack/rust.webp',
  '/stack/java.webp',
  '/stack/vite.webp',
  '/stack/sql.webp',
  '/stack/html.webp',
  '/stack/css.webp',
  '/stack/luau.webp',
]);

const SWOOP_ITEMS = new Set(['hyperplex', 'luakey', 'minedock', 'bloxvault', 'neutrabots', 'mysterybox', 'airpods']);

// Held items float in the upper half of the frame while keeping both the PC monitor and walnut desk in view below
export const HELD_ITEM_POS: [number, number, number] = [0, 5.05, 2.2];
const SWOOP_LOOK = new THREE.Vector3(0, 3.35, 0);
const SWOOP_OFFSET = new THREE.Vector3(0, 2.95, 8.95);

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
  const isPolaroid = focusedItem?.startsWith('polaroid') || false;
  const isSwoop = (!!focusedItem && SWOOP_ITEMS.has(focusedItem)) || isPolaroid;
  const isPC = focusedItem === 'pc';

  const { spot, ambient, inspectKey, inspectFill, inspectRim, shadowInt } = useSpring({
    spot: isPC ? 1.3 : isSwoop ? 1.65 : isHeld ? 0.8 : 3.0,
    ambient: isPC ? 0.7 : isSwoop ? 0.78 : isHeld ? 0.45 : 1.2,
    inspectKey: isSwoop ? 5.2 : 0,
    inspectFill: isSwoop ? 3.2 : 0,
    inspectRim: isSwoop ? 2.6 : 0,
    shadowInt: isPC ? 0.28 : isHeld ? 0.0 : 0.38,
    config: { tension: 120, friction: 20 },
  }) as any;

  return (
    <>
      <animated.ambientLight intensity={ambient} />
      <animated.directionalLight
        position={[5, 10, 5]}
        intensity={1.0}
        castShadow
        shadow-intensity={shadowInt}
        shadow-radius={3.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-normalBias={0.02}
        shadow-bias={-0.0002}
      />
      <animated.spotLight
        position={[0, 15, 0]}
        intensity={spot}
        angle={1.0}
        penumbra={0.5}
        color="#ffffff"
        distance={50}
        decay={1.5}
      />
      {/* Dedicated close-range studio key, fill & rim lights for held props during 3D drag inspection */}
      <animated.pointLight
        position={[2.4, 6.4, 5.6]}
        intensity={inspectKey}
        color="#fff8ef"
        distance={8.5}
        decay={2}
      />
      <animated.pointLight
        position={[-2.4, 5.4, 5.2]}
        intensity={inspectFill}
        color="#eef4ff"
        distance={8.5}
        decay={2}
      />
      <animated.pointLight
        position={[-2.2, 6.2, -0.2]}
        intensity={inspectRim}
        color="#dbeafe"
        distance={8}
        decay={2}
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
      <Lightformer intensity={0.25} color="#fff6ea" position={[0, 6, 10]} scale={[10, 4, 1]} />
    </Environment>
  );
}

const dummyCam = new THREE.PerspectiveCamera();
// Tilted slightly toward -Z so `lookAt` never hits gimbal lock even when looking straight down (-Y)
// at open books or the phone, while keeping zero roll across all overview and swoop angles.
const STABLE_UP = new THREE.Vector3(0, 1, -0.25).normalize();

// Angled seated/standing POV for the main desk overview (~0.68 rad off vertical)
const OVERVIEW_LOOK = new THREE.Vector3(0, 0.15, -0.45);
const OVERVIEW_OFFSET = new THREE.Vector3(0, 10.2, 8.2);
const SEATED_RAY = new THREE.Vector3(0, Math.cos(0.68), Math.sin(0.68));

/** Exact closed-form critically-damped 3D spring (frame-rate independent, zero overshoot, zero kinks) */
function dampSpringVec3(
  current: THREE.Vector3,
  velocity: THREE.Vector3,
  target: THREE.Vector3,
  omega: number,
  dt: number,
) {
  const exp = Math.exp(-omega * dt);
  const dx = current.x - target.x;
  const dy = current.y - target.y;
  const dz = current.z - target.z;

  const tx = (velocity.x + omega * dx) * dt;
  const ty = (velocity.y + omega * dy) * dt;
  const tz = (velocity.z + omega * dz) * dt;

  velocity.x = (velocity.x - omega * tx) * exp;
  velocity.y = (velocity.y - omega * ty) * exp;
  velocity.z = (velocity.z - omega * tz) * exp;

  current.x = target.x + (dx + tx) * exp;
  current.y = target.y + (dy + ty) * exp;
  current.z = target.z + (dz + tz) * exp;
}

function CameraRig() {
  const { focusedItem } = useFocus();
  const { camera, size } = useThree();

  const aspect = size.width / size.height;
  const portrait = usePortrait();
  const compact = size.width < 640;
  const fov = portrait ? 45 : 35;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));

  const isPolaroid = focusedItem?.startsWith('polaroid') || false;
  const shouldSwoop = (!!focusedItem && SWOOP_ITEMS.has(focusedItem)) || isPolaroid;
  const isBook = focusedItem === 'book' || focusedItem === 'guestbook';
  const isPC = focusedItem === 'pc';
  const pcRest = useRest('pc');

  // Distance at which a camera perpendicular to a `across × down` patch frames it cleanly
  const fitDist = (across: number, down: number) => Math.max(down / (2 * tanHalf), across / (2 * tanHalf * aspect));

  // Frame the whole layout (portrait re-flows it into a tall grid, see DeskLayout).
  const content = portrait ? CONTENT.portrait : CONTENT.landscape;
  const overviewHeight = Math.max(portrait ? 0 : 14, fitDist(content.w, content.d) * 1.05);
  const overviewScale = Math.max(portrait ? 1.08 : 1, overviewHeight / 13.8);
  const overviewDist = OVERVIEW_OFFSET.length() * overviewScale;

  const bookDist = fitDist(4.9, 3.4);
  const pcDist = fitDist(3.72, 2.28);
  const swoopWidth = isPolaroid ? 3.2 : 2.8;
  const swoopScale = Math.max(portrait ? 0.78 : 1, swoopWidth / (2 * SWOOP_OFFSET.length() * tanHalf * aspect));

  const parallaxOffset = useRef({ x: 0, z: 0 });
  const isInitial = useRef(true);
  const goalPos = useRef(new THREE.Vector3()).current;
  const goalLook = useRef(new THREE.Vector3()).current;
  const curPos = useRef(new THREE.Vector3()).current;
  const curLook = useRef(new THREE.Vector3()).current;
  const velPos = useRef(new THREE.Vector3()).current;
  const velLook = useRef(new THREE.Vector3()).current;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);

    // Smooth pointer parallax — active only in the desk overview so dragging to spin a held 3D
    // object never makes the camera swim at the same time.
    const targetPx = focusedItem ? 0 : state.pointer.x;
    const targetPz = focusedItem ? 0 : -state.pointer.y;
    const pAlpha = 1 - Math.exp(-4.5 * dt);
    parallaxOffset.current.x = THREE.MathUtils.lerp(parallaxOffset.current.x, targetPx, pAlpha);
    parallaxOffset.current.z = THREE.MathUtils.lerp(parallaxOffset.current.z, targetPz, pAlpha);
    const px = parallaxOffset.current.x;
    const pz = parallaxOffset.current.z;

    if (shouldSwoop) {
      goalLook.copy(SWOOP_LOOK);
      goalPos.copy(SWOOP_OFFSET).multiplyScalar(swoopScale).add(SWOOP_LOOK);
    } else if (isPC) {
      goalLook.set(pcRest.pos[0], 1.48, pcRest.pos[2] + 0.09);
      goalPos.set(pcRest.pos[0], 1.48, pcRest.pos[2] + 0.09 + pcDist);
    } else if (isBook) {
      const mobileShiftY = compact && focusedItem === 'guestbook' ? -0.9 : 0;
      goalLook.set(0, 3.8 + mobileShiftY, 0.6);
      goalPos.copy(SEATED_RAY).multiplyScalar(bookDist).add(goalLook);
    } else {
      goalLook.set(OVERVIEW_LOOK.x + px * 0.08, OVERVIEW_LOOK.y, OVERVIEW_LOOK.z + pz * 0.06);
      goalPos.copy(OVERVIEW_OFFSET).multiplyScalar(overviewScale).add(OVERVIEW_LOOK);
      goalPos.x += px * 0.24;
      goalPos.z += pz * 0.14;
    }

    if (isInitial.current) {
      curPos.copy(goalPos);
      curLook.copy(goalLook);
      isInitial.current = false;
    } else {
      const omega = 10.0;
      dampSpringVec3(curPos, velPos, goalPos, omega, dt);
      dampSpringVec3(curLook, velLook, goalLook, omega, dt);
    }

    camera.position.copy(curPos);
    dummyCam.position.copy(curPos);
    dummyCam.up.copy(STABLE_UP);
    dummyCam.lookAt(curLook);
    camera.quaternion.copy(dummyCam.quaternion);
  });

  return (
    <>
      <fog attach="fog" args={['#0e0b08', overviewDist + 6, overviewDist + 28]} />
      <PerspectiveCamera
        makeDefault
        position={[0, 10.2, 7.85]}
        fov={fov}
        near={0.1}
        far={100}
      />
    </>
  );
}

export default function DeskScene() {
  const portrait = usePortrait();
  const [dpr] = React.useState(() => (typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2)));
  const [antialias] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const ratio = window.devicePixelRatio || 1;
    return !isTouch || ratio < 2;
  });

  return (
    <TurnstileProvider>
      <div
        style={{
          width: '100dvw',
          height: '100dvh',
          position: 'fixed',
          top: 0,
          left: 0,
          background: '#0e0b08',
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
      >
        <FocusProvider>
          <RouteSync />
          <KeyboardControls />
          {/* Invisible Turnstile widget — outside Canvas, no R3F conflict */}
          <TurnstileWidget />
          <Canvas shadows="percentage" dpr={dpr} gl={{ powerPreference: 'high-performance', antialias }}>
            <BackgroundClicker />
            <CameraRig />
            <SceneLighting />
            <StudioEnvironment />

            <Suspense fallback={null}>
              {/* Desk — turned lengthwise on portrait screens to match the tall layout */}
              <group position={[0, -0.5, 0]} rotation-y={portrait ? Math.PI / 2 : 0}>
                <TexturedDesk />
              </group>
              <WorkspaceEnvironment />
              <DesktopPC />

              <MinecraftBlock />
              <LuaKey />
              <MinedockServer />
              <BloxvaultSafe />
              <NeutrabotsToy />
              {/* Mystery box is off the desk for now; re-enable by rendering <MysteryBox /> here */}
              <AnimatedBook />
              <GuestBook />

              <AirPodsCase />

              <Polaroid id="polaroid_1" caption="Coming soon" />
              <Polaroid id="polaroid_2" caption="Coming soon" />
              <Polaroid id="polaroid_3" caption="Coming soon" />

              <DeskShadows />
            </Suspense>
          </Canvas>
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
