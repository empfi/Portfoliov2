"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, useCursor, useTexture } from '@react-three/drei';
import { useFocus } from '@/context/FocusContext';
import { useRest } from '@/context/DeskLayout';

const SANS = '/fonts/inter.woff';
const SANS_BOLD = '/fonts/inter-bold.woff';

function makeRoundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function makeLeftRoundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w, y);
  s.lineTo(x + w, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function makeTopRoundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x, y);
  s.lineTo(x + w, y);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y);
  return s;
}

function shapePlaneUV(w: number, h: number, r: number) {
  const geo = new THREE.ShapeGeometry(makeRoundedRect(w, h, r), 16);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  }
  return geo;
}

// Studio Display aluminum stand neck with circular cable cutout
const STAND_NECK_GEO = (() => {
  const s = makeRoundedRect(0.42, 1.32, 0.04);
  const hole = new THREE.Path();
  hole.absarc(0, -0.32, 0.095, 0, Math.PI * 2, false);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.036,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
})();

const SCREEN_W = 3.42;
const SCREEN_H = 2.02;
const SCREEN_R = 0.045;
const SCREEN_GEO = shapePlaneUV(SCREEN_W, SCREEN_H, SCREEN_R);

// Clean macOS App Window inside the 27" Studio Display
const WIN_W = 3.12;
const WIN_H = 1.52;
const WIN_R = 0.048;
const SIDE_W = 0.82;
const RIGHT_W = WIN_W - SIDE_W;
const TITLE_H = 0.155;

const WIN_BORDER_GEO = new THREE.ShapeGeometry(makeRoundedRect(WIN_W + 0.006, WIN_H + 0.006, WIN_R + 0.002), 16);
const WIN_BODY_GEO = new THREE.ShapeGeometry(makeRoundedRect(WIN_W, WIN_H, WIN_R), 16);
const WIN_SIDEBAR_GEO = new THREE.ShapeGeometry(makeLeftRoundedRect(SIDE_W, WIN_H, WIN_R), 16);
const WIN_TITLEBAR_GEO = new THREE.ShapeGeometry(makeTopRoundedRect(WIN_W, TITLE_H, WIN_R), 16);

const SIDEBAR_ROW_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.72, 0.136, 0.024), 12);
const ACTION_BTN_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.48, 0.118, 0.026), 12);
const PRIMARY_BTN_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.54, 0.118, 0.026), 12);

// Project header logo badge geometries
const LOGO_SQUIRCLE_GEO = shapePlaneUV(0.24, 0.24, 0.05);
const SIDE_LOGO_SQUIRCLE_GEO = shapePlaneUV(0.062, 0.062, 0.014);

// 4-Icon macOS Dock
const DOCK_BORDER_GEO = shapePlaneUV(0.926, 0.198, 0.05);
const DOCK_BODY_GEO = shapePlaneUV(0.92, 0.192, 0.048);
const ICON_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.14, 0.14, 0.032), 16);
const ISLAND_ART_GEO = shapePlaneUV(0.08, 0.08, 0.024);
const CONTACT_BADGE_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.18, 0.18, 0.048), 14);
const ALBUM_GEO = shapePlaneUV(0.9, 0.9, 0.042);

// Contact pane card geometries
const CONTACT_CARD_BORDER_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.884, 0.984, 0.036), 14);
const CONTACT_CARD_BODY_GEO = new THREE.ShapeGeometry(makeRoundedRect(0.88, 0.98, 0.034), 14);

type AppId = 'projects' | 'github' | 'contact' | 'spotify';
type ProjectKey = 'minedock' | 'bloxvault' | 'neutrabots' | 'hyperplex' | 'luakey';
type StackName =
  | 'TypeScript'
  | 'JavaScript'
  | 'React'
  | 'Rust'
  | 'Java'
  | 'Vite'
  | 'SQL'
  | 'HTML'
  | 'CSS'
  | 'Luau';

const STACK_PATHS: Record<StackName, string> = {
  TypeScript: '/stack/typescript.webp',
  JavaScript: '/stack/javascript.webp',
  React: '/stack/react.webp',
  Rust: '/stack/rust.webp',
  Java: '/stack/java.webp',
  Vite: '/stack/vite.webp',
  SQL: '/stack/sql.webp',
  HTML: '/stack/html.webp',
  CSS: '/stack/css.webp',
  Luau: '/stack/luau.webp',
};

const LOGO_PATHS: Record<ProjectKey, string> = {
  minedock: '/logos/minedock.webp',
  bloxvault: '/logos/bloxvault.webp',
  neutrabots: '/logos/neutrabots.webp',
  hyperplex: '/logos/hyperplex.webp',
  luakey: '/logos/luaprotect.webp',
};

const PROJECTS: {
  key: ProjectKey;
  name: string;
  domain: string;
  story: string;
  highlights: string[];
  tags: StackName[];
  url: string;
  cta: string;
  fullBleedLogo?: boolean;
}[] = [
  {
    key: 'minedock',
    name: 'MineDock',
    domain: 'github.com/empfi/MineDock',
    story:
      'I got tired of clunky web panels, Docker overhead, and messy batch scripts just to run a server with friends. MineDock is a native desktop app that starts instantly, monitors live CPU/RAM telemetry, and gives you direct control over your server files without renting cloud servers.',
    highlights: [
      'One-click server creation for Vanilla, Paper, Purpur & Velocity',
      'Native Rust daemon bridge with real-time console streaming and 20.0 TPS telemetry',
      'Automated .zip world backups with instant restore and archive verification',
    ],
    tags: ['TypeScript', 'React', 'Rust', 'Java'],
    url: 'https://github.com/empfi/MineDock',
    cta: 'View Source',
  },
  {
    key: 'bloxvault',
    name: 'Bloxvault',
    domain: 'chromewebstore.google.com',
    story:
      'Managing multiple Roblox developer and testing accounts was painful with constant 2FA prompts and logout friction. Bloxvault acts as a private client-side vault inside your browser: switch between saved accounts in under a second with zero external server tracking.',
    highlights: [
      'Instant one-click session switching without re-entering credentials',
      'Client-side AES-256-GCM encryption derived with PBKDF2 master key',
      'Strict zero-telemetry architecture — all session tokens remain strictly on device',
    ],
    tags: ['TypeScript', 'React', 'Vite', 'JavaScript'],
    url: 'https://chromewebstore.google.com/detail/bloxvault/hhmcbcgfchblklegmdmgfnjjgfnkdejg?pli=1',
    cta: 'Open Store',
  },
  {
    key: 'neutrabots',
    name: 'NeutraBots',
    domain: 'neutrabots.com',
    story:
      'Small Discord communities usually struggle with paying monthly hosting fees for simple utility bots. NeutraBots provides reliable, free cloud hosting with a modern dashboard where server owners configure verification captchas, welcome embeds, and voice stats in seconds.',
    highlights: [
      'Modular provisioning for verification captcha, welcome embeds & join roles',
      'Self-hosted node clustering with automated failover and health checks',
      'Multi-bot management dashboard with granular role-based permissions',
    ],
    tags: ['React', 'Vite', 'Java', 'SQL', 'JavaScript'],
    url: 'https://neutrabots.com',
    cta: 'Visit Site',
  },
  {
    key: 'hyperplex',
    name: 'hyperplex.de',
    domain: 'hyperplex.de',
    story:
      'HyperPlex was born from my love for competitive Minecraft combat and close-knit survival worlds. I developed custom Spigot and Paper plugins from scratch to ensure unbuffered hitreg in duels, paired with an SMP economy where trading is fair and grief-free.',
    highlights: [
      'Custom-coded Java combat engine tuned for zero-delay unbuffered hitreg',
      'Co-op Survival SMP with player-driven economy, claims and chest locks',
      'High-performance Velocity proxy cluster with anti-DDoS mitigation',
    ],
    tags: ['Java', 'React', 'JavaScript', 'HTML', 'CSS'],
    url: 'https://hyperplex.de',
    cta: 'Visit Site',
  },
  {
    key: 'luakey',
    name: 'LuaProtect',
    domain: 'luaprotect.dev',
    story:
      'Roblox script developers face non-stop leaks and decompilation. I created LuaProtect to transform plain Luau code into polymorphic virtualized bytecode running inside a custom register-based VM, backed by hardware-ID locks and real-time execution telemetry.',
    highlights: [
      'Polymorphic register VM bytecode virtualization against decompilers',
      'Hardware-ID (HWID) binding and VPN / proxy request filtering',
      'Live execution analytics, script version rollout and error tracing',
    ],
    tags: ['Luau', 'React', 'JavaScript'],
    url: 'https://luaprotect.dev',
    cta: 'Visit Site',
    fullBleedLogo: true,
  },
];

const DOCK_APPS: { id: AppId; label: string; color: string; x: number }[] = [
  { id: 'projects', label: 'Projects', color: '#0a84ff', x: -0.315 },
  { id: 'github', label: 'GitHub', color: '#1f2328', x: -0.105 },
  { id: 'contact', label: 'Contact', color: '#30d158', x: 0.105 },
  { id: 'spotify', label: 'Spotify', color: '#1db954', x: 0.315 },
];

const FOLDER_SVG =
  'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z';
const GITHUB_SVG =
  'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z';
const SPOTIFY_SVG =
  'M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.492 17.3c-.206.333-.637.447-.97.241-2.658-1.624-6.002-1.992-9.948-1.091-.383.088-.76-.153-.848-.535-.088-.382.153-.76.535-.848 4.31-.983 8.016-.576 11.002 1.25.333.204.444.634.229.983zm1.408-3.136c-.259.418-.802.55-1.22.29-3.045-1.874-7.7-2.434-11.238-1.332-.472.148-.971-.115-1.119-.587-.148-.472.115-.971.587-1.119 4.053-1.26 9.176-.632 12.7 1.53.418.261.55.803.29 1.218zm.135-3.29c-3.642-2.164-9.65-2.366-13.132-1.309-.548.167-1.134-.142-1.301-.69-.167-.549.141-1.134.69-1.302 4.02-1.222 10.665-.989 14.887 1.517.493.293.655.932.362 1.425-.293.493-.933.655-1.425.362z';
const MESSAGES_SVG =
  'M12 2C6.477 2 2 6.145 2 11.258c0 2.822 1.365 5.347 3.518 7.025-.19 1.488-.724 3.328-1.528 4.417 1.838-.13 3.826-.78 5.093-1.802 1.05.285 2.164.441 3.317.441 5.523 0 10-4.145 10-9.081C22 6.145 17.523 2 12 2z';
const DISCORD_SVG =
  'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.077.077 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z';
const MAIL_SVG =
  'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';

function createSvgGlyphTex(svgPath: string, color: string) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = color;
  const p = new Path2D(svgPath);
  ctx.save();
  ctx.translate(32, 32);
  ctx.scale(18.66, 18.66);
  ctx.fill(p);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWindowShadowTex() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(128, 128, 24, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.62)');
  g.addColorStop(0.65, 'rgba(0,0,0,0.24)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const PILL_FONT_SIZE = 0.036;
const PILL_PAD_L = 0.025;
const PILL_ICON_SIZE = 0.044;
const PILL_ICON_GAP = 0.016;
const PILL_PAD_R = 0.028;

function estimateInterTextWidth(text: string, fontSize: number) {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ('iltjrfI1'.includes(ch)) units += 0.33;
    else if ('mwMW'.includes(ch)) units += 0.82;
    else if (ch >= 'A' && ch <= 'Z') units += 0.66;
    else units += 0.55;
  }
  return units * fontSize;
}

function getTagWidth(text: string) {
  return PILL_PAD_L + PILL_ICON_SIZE + PILL_ICON_GAP + estimateInterTextWidth(text, PILL_FONT_SIZE) + PILL_PAD_R;
}

/** Left-oriented tech stack pill with official stack icon on the left and left-aligned label */
function TagPill({
  text,
  iconTex,
  x,
  y,
}: {
  text: StackName;
  iconTex: THREE.Texture | null;
  x: number;
  y: number;
}) {
  const w = getTagWidth(text);
  const borderGeo = useMemo(() => new THREE.ShapeGeometry(makeRoundedRect(w + 0.004, 0.094, 0.021), 10), [w]);
  const geo = useMemo(() => new THREE.ShapeGeometry(makeRoundedRect(w, 0.09, 0.02), 10), [w]);
  const iconX = -w / 2 + PILL_PAD_L + PILL_ICON_SIZE / 2;
  const textX = -w / 2 + PILL_PAD_L + PILL_ICON_SIZE + PILL_ICON_GAP;

  return (
    <group position={[x + w / 2, y, 0]}>
      <mesh geometry={borderGeo} position={[0, 0, -0.0005]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#232631" />
      </mesh>
      {iconTex && (
        <mesh position={[iconX, 0, 0.002]}>
          <planeGeometry args={[PILL_ICON_SIZE, PILL_ICON_SIZE]} />
          <meshBasicMaterial map={iconTex} transparent toneMapped={false} />
        </mesh>
      )}
      <Text
        font={SANS}
        fontSize={PILL_FONT_SIZE}
        color="#e4e4e7"
        position={[textX, 0, 0.002]}
        anchorX="left"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}

/** Interactive macOS button with CSS `cursor: pointer`, hover color brighten, and subtle spring lift */
function MacActionButton({
  position,
  geometry,
  color,
  hoverColor,
  textColor = '#ffffff',
  label,
  isInteractive,
  onClick,
}: {
  position: [number, number, number];
  geometry: THREE.BufferGeometry;
  color: string;
  hoverColor: string;
  textColor?: string;
  label: string;
  isInteractive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');

  const { btnScale } = useSpring({
    btnScale: 1,
    config: { tension: 420, friction: 24 },
  });

  return (
    <animated.group
      position={position}
      scale={btnScale as any}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh geometry={geometry}>
        <meshBasicMaterial color={hovered && isInteractive ? hoverColor : color} />
      </mesh>
      <Text font={SANS_BOLD} fontSize={0.04} color={textColor} position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </animated.group>
  );
}

/** Interactive text link (e.g. project domain or @empfi handle) with CSS `cursor: pointer` and hover accent */
function ClickableTextLink({
  position,
  text,
  width,
  fontSize = 0.042,
  color = '#8e8e93',
  hoverColor = '#5eb0ff',
  anchorX = 'left',
  isInteractive,
  onClick,
}: {
  position: [number, number, number];
  text: string;
  width: number;
  fontSize?: number;
  color?: string;
  hoverColor?: string;
  anchorX?: 'left' | 'center' | 'right';
  isInteractive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');

  const hitX = anchorX === 'center' ? 0 : anchorX === 'right' ? -width / 2 : width / 2;

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[hitX, 0, 0]}>
        <planeGeometry args={[width, fontSize * 1.65]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Text
        font={SANS}
        fontSize={fontSize}
        color={hovered && isInteractive ? hoverColor : color}
        position={[0, 0, 0.001]}
        anchorX={anchorX}
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}

/** Interactive macOS window traffic light dot (Close / Minimize / Zoom) with `cursor: pointer` */
function TrafficLightDot({
  position,
  color,
  symbol,
  isInteractive,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  symbol: string;
  isInteractive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');

  return (
    <group
      position={position}
      scale={hovered && isInteractive ? 1.14 : 1}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[0, 0, -0.0005]}>
        <circleGeometry args={[0.03, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.019, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {hovered && isInteractive && (
        <Text font={SANS_BOLD} fontSize={0.025} color="#1f1300" position={[0, 0.001, 0.001]} anchorX="center" anchorY="middle">
          {symbol}
        </Text>
      )}
    </group>
  );
}

/** Interactive sidebar row with real project mini-logo, pill hit-target, `cursor: pointer`, and hover highlight */
function ProjectSidebarRow({
  name,
  y,
  selected,
  logoTex,
  fullBleedLogo,
  isInteractive,
  onSelect,
}: {
  name: string;
  y: number;
  selected: boolean;
  logoTex: THREE.Texture | null;
  fullBleedLogo?: boolean;
  isInteractive: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');

  const showBg = selected || (hovered && isInteractive);

  return (
    <group
      position={[-WIN_W / 2 + SIDE_W / 2, y, 0.002]}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh geometry={SIDEBAR_ROW_GEO}>
        <meshBasicMaterial
          color={selected ? '#343846' : '#282b36'}
          transparent={!showBg}
          opacity={showBg ? 1 : 0}
          depthWrite={showBg}
        />
      </mesh>
      {logoTex && (
        <mesh geometry={fullBleedLogo ? SIDE_LOGO_SQUIRCLE_GEO : undefined} position={[-0.27, 0, 0.002]}>
          {!fullBleedLogo && <planeGeometry args={[0.062, 0.062]} />}
          <meshBasicMaterial map={logoTex} transparent toneMapped={false} />
        </mesh>
      )}
      <Text
        font={selected ? SANS_BOLD : SANS}
        fontSize={0.044}
        color={selected || (hovered && isInteractive) ? '#ffffff' : '#d4d4d8'}
        position={[-0.19, 0, 0.002]}
        anchorX="left"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
}

function SkeletonPill({
  width,
  height,
  radius = 0.015,
  position,
}: {
  width: number;
  height: number;
  radius?: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.ShapeGeometry(makeRoundedRect(width, height, radius), 12), [width, height, radius]);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + 0.07 * Math.sin(state.clock.elapsedTime * 3.5);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geo} position={position}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
    </mesh>
  );
}

function SkeletonCircle({
  radius,
  position,
}: {
  radius: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + 0.07 * Math.sin(state.clock.elapsedTime * 3.5);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
    </mesh>
  );
}

function MacGitHubPane({
  githubGlyph,
  isInteractive,
}: {
  githubGlyph: THREE.Texture | null;
  isInteractive: boolean;
}) {
  const [data, setData] = useState<any>(null);
  const [avatarTex, setAvatarTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/users/empfi')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d?.avatar_url) {
          new THREE.TextureLoader().load(d.avatar_url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            setAvatarTex(tex);
          });
        }
      })
      .catch(() => {});
  }, []);

  const openProfile = useCallback(() => {
    window.open('https://github.com/empfi', '_blank', 'noopener,noreferrer');
  }, []);

  const isLoading = !data;

  return (
    <group position={[0, 0, 0.004]}>
      <Text
        font={SANS_BOLD}
        fontSize={0.041}
        color="#d4d4d8"
        position={[0, WIN_H / 2 - TITLE_H / 2, 0.002]}
        anchorX="center"
        anchorY="middle"
      >
        GitHub
      </Text>

      {/* Profile Avatar */}
      {isLoading ? (
        <SkeletonCircle radius={0.22} position={[0, 0.22, 0.002]} />
      ) : (
        <mesh position={[0, 0.22, 0.002]}>
          {avatarTex ? <circleGeometry args={[0.22, 44]} /> : <planeGeometry args={[0.34, 0.34]} />}
          <meshBasicMaterial map={avatarTex || githubGlyph || undefined} transparent />
        </mesh>
      )}

      {/* Name */}
      {isLoading ? (
        <SkeletonPill width={0.44} height={0.065} radius={0.016} position={[0, -0.06, 0.002]} />
      ) : (
        <Text
          font={SANS_BOLD}
          fontSize={0.082}
          color="#ffffff"
          position={[0, -0.06, 0.002]}
          anchorX="center"
          anchorY="middle"
        >
          {data.name || data.login || 'empfi'}
        </Text>
      )}

      {/* Handle */}
      {isLoading ? (
        <SkeletonPill width={0.22} height={0.036} radius={0.012} position={[0, -0.14, 0.002]} />
      ) : (
        <ClickableTextLink
          position={[0, -0.14, 0.002]}
          text="@empfi"
          width={0.25}
          fontSize={0.04}
          anchorX="center"
          isInteractive={isInteractive}
          onClick={openProfile}
        />
      )}

      {/* Stats Row */}
      <group position={[0, -0.26, 0.002]}>
        {isLoading ? (
          <>
            <SkeletonPill width={0.16} height={0.05} radius={0.012} position={[-0.24, 0.015, 0]} />
            <SkeletonPill width={0.14} height={0.024} radius={0.008} position={[-0.24, -0.045, 0]} />
            <mesh position={[0, -0.01, 0]}>
              <planeGeometry args={[0.002, 0.07]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
            </mesh>
            <SkeletonPill width={0.16} height={0.05} radius={0.012} position={[0.24, 0.015, 0]} />
            <SkeletonPill width={0.14} height={0.024} radius={0.008} position={[0.24, -0.045, 0]} />
          </>
        ) : (
          <>
            <Text font={SANS_BOLD} fontSize={0.062} color="#f5f5f7" position={[-0.24, 0.02, 0]} anchorX="center" anchorY="middle">
              {`${data.public_repos ?? 0}`}
            </Text>
            <Text font={SANS} fontSize={0.03} color="#8e8e93" position={[-0.24, -0.045, 0]} anchorX="center" anchorY="middle">
              Repos
            </Text>

            <mesh position={[0, -0.01, 0]}>
              <planeGeometry args={[0.002, 0.07]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
            </mesh>

            <Text font={SANS_BOLD} fontSize={0.062} color="#f5f5f7" position={[0.24, 0.02, 0]} anchorX="center" anchorY="middle">
              {`${data.followers ?? 0}`}
            </Text>
            <Text font={SANS} fontSize={0.03} color="#8e8e93" position={[0.24, -0.045, 0]} anchorX="center" anchorY="middle">
              Followers
            </Text>
          </>
        )}
      </group>

      {/* Button */}
      <MacActionButton
        position={[0, -0.44, 0.003]}
        geometry={PRIMARY_BTN_GEO}
        color="#238636"
        hoverColor="#2ea043"
        label="Open Profile"
        isInteractive={isInteractive}
        onClick={openProfile}
      />
    </group>
  );
}

function MacSpotifyPane({
  spotifyData,
  spotifyDataRef,
  spotifyGlyph,
  isInteractive,
}: {
  spotifyData: any;
  spotifyDataRef: React.MutableRefObject<any>;
  spotifyGlyph: THREE.Texture | null;
  isInteractive: boolean;
}) {
  const [artTex, setArtTex] = useState<THREE.Texture | null>(null);
  const progressRef = useRef<THREE.Mesh>(null);
  const curRef = useRef<any>(null);
  const durRef = useRef<any>(null);

  useEffect(() => {
    const url = spotifyData?.album_art_url;
    if (!url) {
      setArtTex(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setArtTex(tex);
    });
  }, [spotifyData?.album_art_url]);

  const fmt = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  useFrame(() => {
    const d = spotifyDataRef.current;
    if (!d || !progressRef.current) return;
    const duration = d.timestamps.end - d.timestamps.start;
    const current = Math.max(0, Date.now() - d.timestamps.start);
    const p = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;
    progressRef.current.scale.x = Math.max(0.001, p);
    progressRef.current.position.x = -0.14 + (p * 1.56) / 2;
    if (curRef.current) curRef.current.text = fmt(current);
    if (durRef.current) durRef.current.text = fmt(duration);
  });

  const openSpotify = useCallback(() => {
    if (spotifyData?.track_id) {
      window.open(`https://open.spotify.com/track/${spotifyData.track_id}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://open.spotify.com', '_blank', 'noopener,noreferrer');
    }
  }, [spotifyData?.track_id]);

  return (
    <group position={[0, 0, 0.004]}>
      <Text font={SANS_BOLD} fontSize={0.041} color="#d4d4d8" position={[0, WIN_H / 2 - TITLE_H / 2, 0.002]} anchorX="center" anchorY="middle">
        Spotify
      </Text>

      {spotifyData ? (
        <>
          {/* Album Cover Squircle */}
          <group position={[-0.82, -0.06, 0.002]}>
            {artTex && (
              <mesh geometry={ALBUM_GEO}>
                <meshBasicMaterial map={artTex} toneMapped={false} />
              </mesh>
            )}
          </group>

          {/* Song & Artist */}
          <Text font={SANS_BOLD} fontSize={0.092} color="#ffffff" position={[-0.14, 0.22, 0.002]} anchorX="left" anchorY="middle" maxWidth={1.6}>
            {spotifyData.song}
          </Text>
          <Text font={SANS} fontSize={0.046} color="#a1a1aa" position={[-0.14, 0.09, 0.002]} anchorX="left" anchorY="middle" maxWidth={1.6}>
            {spotifyData.artist}
          </Text>

          {/* Progress Bar */}
          <mesh position={[0.64, -0.05, 0.002]}>
            <planeGeometry args={[1.56, 0.016]} />
            <meshBasicMaterial color="#3f3f46" />
          </mesh>
          <mesh ref={progressRef} position={[-0.14, -0.05, 0.003]}>
            <planeGeometry args={[1.56, 0.016]} />
            <meshBasicMaterial color="#1db954" />
          </mesh>

          <Text ref={curRef} font={SANS} fontSize={0.032} color="#8e8e93" position={[-0.14, -0.11, 0.002]} anchorX="left" anchorY="middle">
            0:00
          </Text>
          <Text ref={durRef} font={SANS} fontSize={0.032} color="#8e8e93" position={[1.42, -0.11, 0.002]} anchorX="right" anchorY="middle">
            0:00
          </Text>

          {/* Open in Spotify Button */}
          <MacActionButton
            position={[0.16, -0.28, 0.003]}
            geometry={PRIMARY_BTN_GEO}
            color="#1db954"
            hoverColor="#28d366"
            textColor="#000000"
            label="Open in Spotify"
            isInteractive={isInteractive}
            onClick={openSpotify}
          />
        </>
      ) : (
        <group position={[0, -0.05, 0.002]}>
          {spotifyGlyph && (
            <mesh position={[0, 0.16, 0]}>
              <planeGeometry args={[0.27, 0.27]} />
              <meshBasicMaterial map={spotifyGlyph} transparent />
            </mesh>
          )}
          <Text font={SANS_BOLD} fontSize={0.065} color="#f5f5f7" position={[0, -0.07, 0]} anchorX="center" anchorY="middle">
            Spotify Player Idle
          </Text>
          <Text font={SANS} fontSize={0.038} color="#8e8e93" position={[0, -0.17, 0]} anchorX="center" anchorY="middle" maxWidth={2.2}>
            Live Spotify activity syncs automatically when empfi listens to music.
          </Text>
          <MacActionButton
            position={[0, -0.34, 0.002]}
            geometry={PRIMARY_BTN_GEO}
            color="#1db954"
            hoverColor="#28d366"
            textColor="#000000"
            label="Open Spotify"
            isInteractive={isInteractive}
            onClick={() =>
              window.open('https://open.spotify.com', '_blank', 'noopener,noreferrer')
            }
          />
        </group>
      )}
    </group>
  );
}

/** Interactive Contact Card for Discord / GitHub / Email */
function ContactCard({
  x,
  iconGlyph,
  badgeBg,
  title,
  subtitle,
  details,
  description,
  buttonLabel,
  buttonColor,
  hoverColor,
  isInteractive,
  onAction,
  copyText,
  copiedLabel = 'Copied to clipboard!',
}: {
  copyText?: string;
  copiedLabel?: string;
  x: number;
  iconGlyph: THREE.Texture | null;
  badgeBg: string;
  title: string;
  subtitle: string;
  details: string;
  description: string;
  buttonLabel: string;
  buttonColor: string;
  hoverColor: string;
  isInteractive: boolean;
  onAction: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');
  const handleAction = () => {
    if (copyText && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(copyText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }).catch(() => {});
    }
    onAction();
  };

  return (
    <group
      position={[x, -0.05, 0.002]}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh geometry={CONTACT_CARD_BORDER_GEO} position={[0, 0, -0.0005]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={hovered && isInteractive ? 0.16 : 0.07}
        />
      </mesh>
      <mesh geometry={CONTACT_CARD_BODY_GEO}>
        <meshBasicMaterial color={hovered && isInteractive ? '#20232e' : '#171922'} />
      </mesh>

      {/* Brand Icon Badge */}
      <group position={[0, 0.31, 0.002]}>
        <mesh geometry={CONTACT_BADGE_GEO}>
          <meshBasicMaterial color={badgeBg} />
        </mesh>
        {iconGlyph && (
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[0.11, 0.11]} />
            <meshBasicMaterial map={iconGlyph} transparent toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* Title & Subtitle */}
      <Text
        font={SANS_BOLD}
        fontSize={0.054}
        color="#ffffff"
        position={[0, 0.14, 0.002]}
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
      <Text
        font={SANS}
        fontSize={0.034}
        color="#38bdf8"
        position={[0, 0.065, 0.002]}
        anchorX="center"
        anchorY="middle"
      >
        {details}
      </Text>

      {/* Subtle Divider */}
      <mesh position={[0, 0.005, 0.002]}>
        <planeGeometry args={[0.74, 0.0018]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
      </mesh>

      {/* Description */}
      <Text
        font={SANS}
        fontSize={0.030}
        color="#a1a1aa"
        position={[0, -0.075, 0.002]}
        anchorX="center"
        anchorY="top"
        maxWidth={0.74}
        lineHeight={1.44}
        textAlign="center"
      >
        {description}
      </Text>

      {/* Action CTA Button */}
      <MacActionButton
        position={[0, -0.36, 0.003]}
        geometry={PRIMARY_BTN_GEO}
        color={buttonColor}
        hoverColor={hoverColor}
        label={copied ? copiedLabel : buttonLabel}
        isInteractive={isInteractive}
        onClick={handleAction}
      />
    </group>
  );
}

function MacContactPane({
  discordGlyph,
  githubGlyph,
  mailGlyph,
  isInteractive,
}: {
  discordGlyph: THREE.Texture | null;
  githubGlyph: THREE.Texture | null;
  mailGlyph: THREE.Texture | null;
  isInteractive: boolean;
}) {
  return (
    <group position={[0, 0, 0.004]}>
      <Text
        font={SANS_BOLD}
        fontSize={0.041}
        color="#d4d4d8"
        position={[0, WIN_H / 2 - TITLE_H / 2, 0.002]}
        anchorX="center"
        anchorY="middle"
      >
        Contact
      </Text>

      {/* 3 Prominent Contact Cards */}
      <ContactCard
        x={-0.96}
        iconGlyph={discordGlyph}
        badgeBg="#5865f2"
        title="Discord"
        subtitle="Chat & Voice"
        details="empfii"
        description="Fastest way to get in touch for questions, project collaboration, or quick voice chat."
        buttonLabel="Open Discord"
        copyText="empfii"
        copiedLabel="Copied username!"
        buttonColor="#5865f2"
        hoverColor="#6e79f6"
        isInteractive={isInteractive}
        onAction={() =>
          window.open('https://discord.com/users/236612651529142272', '_blank', 'noopener,noreferrer')
        }
      />

      <ContactCard
        x={0}
        iconGlyph={githubGlyph}
        badgeBg="#24292f"
        title="GitHub"
        subtitle="Developer Profile"
        details="@empfi"
        description="Explore open-source repositories, developer tooling, reverse-engineering, and issues."
        buttonLabel="View GitHub"
        copyText="https://github.com/empfi"
        copiedLabel="Copied profile link!"
        buttonColor="#238636"
        hoverColor="#2ea043"
        isInteractive={isInteractive}
        onAction={() =>
          window.open('https://github.com/empfi', '_blank', 'noopener,noreferrer')
        }
      />

      <ContactCard
        x={0.96}
        iconGlyph={mailGlyph}
        badgeBg="#0a84ff"
        title="Email"
        subtitle="Direct Inquiries"
        details="contact@empfi.dev"
        description="Direct mailbox for formal collaboration, contract development, or long-form discussions."
        buttonLabel="Send Email"
        copyText="contact@empfi.dev"
        copiedLabel="Copied email!"
        buttonColor="#0a84ff"
        hoverColor="#2997ff"
        isInteractive={isInteractive}
        onAction={() =>
          window.open('mailto:contact@empfi.dev', '_blank', 'noopener,noreferrer')
        }
      />
    </group>
  );
}

/**
 * Apple-style Dynamic Island on the Studio Display Screen
 * - Expands into pill with album art, song/artist, and live soundwave equalizer when music plays.
 * - Collapses into discreet compact camera & indicator sensor dot when idle.
 * - Clicking it directly launches / focuses the Spotify app window on the PC.
 */
function DesktopDynamicIsland({
  spotifyData,
  openApp,
  isInteractive,
  onOpenSpotify,
  visible = true,
}: {
  spotifyData: any;
  openApp: AppId | null;
  isInteractive: boolean;
  onOpenSpotify: () => void;
  visible?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');

  const isPlaying = !!spotifyData;
  const showExpanded = isPlaying && openApp !== 'spotify';

  const { islandW, islandScale } = useSpring({
    islandW: showExpanded ? 1.2 : hovered && isInteractive ? 0.5 : 0.44,
    islandScale: hovered && isInteractive ? 1.05 : 1,
    config: { tension: 360, friction: 26 },
  });

  const [artTex, setArtTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const url = spotifyData?.album_art_url;
    if (!url) {
      setArtTex(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setArtTex(tex);
    });
  }, [spotifyData?.album_art_url]);

  // Equalizer visualizer bars
  const b1 = useRef<THREE.Mesh>(null);
  const b2 = useRef<THREE.Mesh>(null);
  const b3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (showExpanded && b1.current && b2.current && b3.current) {
      const t = state.clock.elapsedTime;
      const s1 = 0.3 + Math.abs(Math.sin(t * 8)) * 0.7;
      b1.current.scale.y = s1;
      b1.current.position.y = (s1 - 1) * 0.015;

      const s2 = 0.3 + Math.abs(Math.cos(t * 11)) * 0.7;
      b2.current.scale.y = s2;
      b2.current.position.y = (s2 - 1) * 0.015;

      const s3 = 0.3 + Math.abs(Math.sin(t * 14)) * 0.7;
      b3.current.scale.y = s3;
      b3.current.position.y = (s3 - 1) * 0.015;
    }
  });

  const leftCapX = islandW.to((w) => -(w - 0.11) / 2);
  const rightCapX = islandW.to((w) => (w - 0.11) / 2);
  const centerScaleX = islandW.to((w) => Math.max(0.001, w - 0.11));
  const albumX = islandW.to((w) => -w / 2 + 0.07);
  const visX = islandW.to((w) => w / 2 - 0.07);
  const textX = islandW.to((w) => -w / 2 + 0.138);
  const contentOpacity = islandW.to((w) => Math.max(0, Math.min(1, (w - 0.44) / 0.35)));

  return (
    <animated.group
      visible={visible}
      position={[0, 0.91, 0.025]}
      scale={islandScale as any}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onOpenSpotify();
      }}
    >
      {/* Dynamic Island Outer Body */}
      <group position={[0, 0, 0]}>
        <animated.mesh position-x={leftCapX as any}>
          <circleGeometry args={[0.055, 28]} />
          <meshBasicMaterial color="#000000" />
        </animated.mesh>
        <animated.mesh position-x={rightCapX as any}>
          <circleGeometry args={[0.055, 28]} />
          <meshBasicMaterial color="#000000" />
        </animated.mesh>
        <animated.mesh scale-x={centerScaleX as any}>
          <planeGeometry args={[1, 0.11]} />
          <meshBasicMaterial color="#000000" />
        </animated.mesh>
      </group>

      {/* Subtle Glow Ring on Hover */}
      {hovered && (
        <group position={[0, 0, -0.0005]}>
          <animated.mesh position-x={leftCapX as any}>
            <circleGeometry args={[0.058, 28]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
          </animated.mesh>
          <animated.mesh position-x={rightCapX as any}>
            <circleGeometry args={[0.058, 28]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
          </animated.mesh>
          <animated.mesh scale-x={centerScaleX as any}>
            <planeGeometry args={[1, 0.114]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
          </animated.mesh>
        </group>
      )}

      {/* Expanded Playing State */}
      {showExpanded ? (
        <group position={[0, 0, 0]}>
          {artTex && (
            <animated.mesh position-x={albumX as any} position-z={0.001}>
              <primitive object={ISLAND_ART_GEO} attach="geometry" />
              <meshBasicMaterial map={artTex} toneMapped={false} />
            </animated.mesh>
          )}

          <animated.group position-x={textX as any} position-z={0.001}>
            <Text
              font={SANS_BOLD}
              fontSize={0.03}
              color="#ffffff"
              position={[0, 0.018, 0]}
              anchorX="left"
              anchorY="middle"
              maxWidth={0.78}
            >
              {spotifyData?.song || ''}
            </Text>
            <Text
              font={SANS}
              fontSize={0.023}
              color="#a1a1aa"
              position={[0, -0.018, 0]}
              anchorX="left"
              anchorY="middle"
              maxWidth={0.78}
            >
              {spotifyData?.artist || ''}
            </Text>
          </animated.group>

          {/* Equalizer Visualizer Bars */}
          <animated.group position-x={visX as any} position-z={0.001}>
            <mesh ref={b1} position={[-0.024, 0, 0]}>
              <planeGeometry args={[0.009, 0.046]} />
              <meshBasicMaterial color="#1db954" />
            </mesh>
            <mesh ref={b2} position={[0, 0, 0]}>
              <planeGeometry args={[0.009, 0.046]} />
              <meshBasicMaterial color="#1db954" />
            </mesh>
            <mesh ref={b3} position={[0.024, 0, 0]}>
              <planeGeometry args={[0.009, 0.046]} />
              <meshBasicMaterial color="#1db954" />
            </mesh>
          </animated.group>
        </group>
      ) : (
        /* Compact State: Lens & Sensor */
        <group position={[0, 0, 0.001]}>
          <mesh position={[-0.06, 0, 0]}>
            <circleGeometry args={[0.016, 16]} />
            <meshBasicMaterial color="#0c0d12" />
          </mesh>
          <mesh position={[-0.06, 0, 0.0005]}>
            <circleGeometry args={[0.006, 12]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <circleGeometry args={[0.0055, 12]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
          </mesh>
        </group>
      )}
    </animated.group>
  );
}

function DockIconItem({
  label,
  color,
  x,
  glyphSize = 0.078,
  isInteractive,
  isActive = false,
  glyph,
  onSelect,
}: {
  label: string;
  color: string;
  x: number;
  glyphSize?: number;
  isInteractive: boolean;
  isActive?: boolean;
  glyph: THREE.Texture | null;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && isInteractive, 'pointer', 'auto');

  const { iconScale, iconY } = useSpring({
    iconScale: 1,
    iconY: 0.006,
    config: { tension: 380, friction: 22 },
  });

  return (
    <group
      position={[x, 0, 0.002]}
      onPointerOver={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <animated.group position-y={iconY as any} scale={iconScale as any}>
        <mesh geometry={ICON_GEO}>
          <meshBasicMaterial color={color} />
        </mesh>
        {glyph && (
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[glyphSize, glyphSize]} />
            <meshBasicMaterial map={glyph} transparent />
          </mesh>
        )}
      </animated.group>

      {isActive && (
        <mesh position={[0, -0.08, 0.002]}>
          <circleGeometry args={[0.0064, 16]} />
          <meshBasicMaterial color="#e5e5ea" />
        </mesh>
      )}
    </group>
  );
}

export function DesktopPC() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isViewingPC = focusedItem === 'pc';
  const rest = useRest('pc');

  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !isViewingPC, 'pointer', 'auto');

  const [openApp, setOpenApp] = useState<AppId | null>('contact');
  const [renderedApp, setRenderedApp] = useState<AppId | null>('contact');
  const [selectedProject, setSelectedProject] = useState<ProjectKey>('minedock');
  const [zoomed, setZoomed] = useState(false);

  // Live Lanyard Spotify hook
  const [spotifyData, setSpotifyData] = useState<any>(null);
  const spotifyDataRef = useRef<any>(null);
  useEffect(() => {
    const poll = () => {
      fetch('https://api.lanyard.rest/v1/users/236612651529142272')
        .then((r) => r.json())
        .then((d) => {
          const sp = d?.success ? d.data?.spotify ?? null : null;
          setSpotifyData(sp);
          spotifyDataRef.current = sp;
        })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (
      focusedItem === 'minedock' ||
      focusedItem === 'bloxvault' ||
      focusedItem === 'neutrabots' ||
      focusedItem === 'hyperplex' ||
      focusedItem === 'luakey'
    ) {
      setSelectedProject(focusedItem);
      setOpenApp('projects');
    } else if (focusedItem === 'pc') {
      setOpenApp((prev) => prev ?? 'projects');
    }
  }, [focusedItem]);

  useEffect(() => {
    if (openApp !== null) {
      setRenderedApp(openApp);
      return;
    }
    const t = setTimeout(() => setRenderedApp(null), 320);
    return () => clearTimeout(t);
  }, [openApp]);

  const getDockIconX = (id: AppId | null) => {
    const found = DOCK_APPS.find((a) => a.id === id);
    return found ? found.x : 0;
  };

  // Scalar `winScale` + `zoomProgress` avoids HMR AnimatedValue/Array conflicts while allowing
  // the green traffic-light button to genuinely maximize across the 3.42 × 2.02 macOS screen.
  const { winScale, zoomProgress, winPos } = useSpring({
    winScale: openApp === null ? 0.001 : 1,
    zoomProgress: openApp !== null && zoomed ? 1 : 0,
    winPos: openApp !== null ? [0, zoomed ? 0 : 0.02, zoomed ? 0.008 : 0.002] : [getDockIconX(renderedApp), -0.86, 0.002],
    config: { mass: 1, tension: 300, friction: 30 },
  });

  const winZoomX = zoomProgress.to((z) => 1 + z * (SCREEN_W / WIN_W - 1));
  const winZoomY = zoomProgress.to((z) => 1 + z * (SCREEN_H / WIN_H - 1));

  // 4K Yosemite Dark Wallpaper + real project logos + official tech stack icons
  const rawWallpaper = useTexture('/pc-wallpaper.webp');
  const rawLogos = useTexture(LOGO_PATHS);
  const rawStacks = useTexture(STACK_PATHS);

  const projectLogos = useMemo(() => {
    const out = {} as Record<ProjectKey, THREE.Texture>;
    (Object.keys(rawLogos) as ProjectKey[]).forEach((k) => {
      const t = rawLogos[k];
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      out[k] = t;
    });
    return out;
  }, [rawLogos]);

  const stackIcons = useMemo(() => {
    const out = {} as Record<StackName, THREE.Texture>;
    (Object.keys(rawStacks) as StackName[]).forEach((k) => {
      const t = rawStacks[k];
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      out[k] = t;
    });
    return out;
  }, [rawStacks]);

  const wallpaperTex = useMemo(() => {
    const t = rawWallpaper.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.repeat.set(1, 1);
    t.offset.set(0, 0);
    const img = t.image as { width?: number; height?: number } | undefined;
    if (img?.width && img?.height) {
      const imgAspect = img.width / img.height;
      const scrAspect = SCREEN_W / SCREEN_H;
      if (imgAspect > scrAspect) {
        const rx = scrAspect / imgAspect;
        t.repeat.set(rx, 1);
        t.offset.set((1 - rx) / 2, 0);
      } else {
        const ry = imgAspect / scrAspect;
        t.repeat.set(1, ry);
        t.offset.set(0, (1 - ry) / 2);
      }
    }
    t.needsUpdate = true;
    return t;
  }, [rawWallpaper]);

  const assets = useMemo(
    () => ({
      winShadow: createWindowShadowTex(),
      folderWhite: createSvgGlyphTex(FOLDER_SVG, '#ffffff'),
      githubWhite: createSvgGlyphTex(GITHUB_SVG, '#ffffff'),
      spotifyWhite: createSvgGlyphTex(SPOTIFY_SVG, '#ffffff'),
      spotifyGreen: createSvgGlyphTex(SPOTIFY_SVG, '#1db954'),
      messagesWhite: createSvgGlyphTex(MESSAGES_SVG, '#ffffff'),
      discordWhite: createSvgGlyphTex(DISCORD_SVG, '#ffffff'),
      mailWhite: createSvgGlyphTex(MAIL_SVG, '#ffffff'),
    }),
    [],
  );

  const { screenTilt } = useSpring({
    screenTilt: isViewingPC ? 0 : -0.055,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  const handleMonitorClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (!isViewingPC) setFocusedItem('pc');
    },
    [isViewingPC, setFocusedItem],
  );

  const stopProp = useCallback((e: any) => e.stopPropagation(), []);

  const proj = PROJECTS.find((p) => p.key === selectedProject) || PROJECTS[0];

  // Single-column spacious coordinates for macOS project detail view
  const leftX = -0.58;

  const tagLayout = useMemo(() => {
    let cursor = leftX;
    let row = 0;
    const maxRight = 1.38;
    return proj.tags.map((t) => {
      const w = getTagWidth(t);
      if (cursor !== leftX && cursor + w > maxRight) {
        cursor = leftX;
        row += 1;
      }
      const x = cursor;
      const y = -0.47 - row * 0.104;
      cursor += w + 0.024;
      return { tag: t, x, y };
    });
  }, [proj.tags, leftX]);

  const dockGlyphs: Record<AppId, THREE.Texture | null> = {
    projects: assets.folderWhite,
    github: assets.githubWhite,
    contact: assets.messagesWhite,
    spotify: assets.spotifyWhite,
  };

  const handleDockSelect = useCallback((id: AppId) => {
    setZoomed(false);
    setOpenApp((prev) => (prev === id ? null : id));
  }, []);

  const openProjectUrl = useCallback(() => {
    window.open(proj.url, '_blank', 'noopener,noreferrer');
  }, [proj.url]);

  const rightCenterX = -WIN_W / 2 + SIDE_W + RIGHT_W / 2;
  const titleCenterY = WIN_H / 2 - TITLE_H / 2;
  const activeLogoTex = projectLogos[proj.key];

  return (
    <group
      position={rest.pos}
      rotation={rest.rot}
      onClick={handleMonitorClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={stopProp}
      onPointerUp={stopProp}
    >
      {/* ── 1. Anodized Aluminum Studio Display Stand ── */}
      <mesh position={[0, 0.005, -0.08]} receiveShadow>
        <boxGeometry args={[1.08, 0.01, 0.78]} />
        <meshStandardMaterial color="#111215" roughness={0.9} />
      </mesh>
      <RoundedBox args={[1.12, 0.028, 0.82]} radius={0.012} smoothness={4} position={[0, 0.02, -0.08]} castShadow receiveShadow>
        <meshStandardMaterial color="#8e939e" metalness={0.86} roughness={0.24} />
      </RoundedBox>
      <mesh geometry={STAND_NECK_GEO} position={[0, 0.68, -0.14]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#969ca8" metalness={0.88} roughness={0.24} />
      </mesh>
      <mesh position={[0, 1.32, -0.04]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.34, 24]} />
        <meshStandardMaterial color="#686d78" metalness={0.88} roughness={0.26} />
      </mesh>

      {/* ── 2. 27" Studio Display Housing & Clean macOS Desktop ── */}
      <animated.group position={[0, 1.48, 0.04]} rotation-x={screenTilt as any}>
        <RoundedBox args={[3.58, 2.18, 0.085]} radius={0.045} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#2c3038" metalness={0.84} roughness={0.26} />
        </RoundedBox>

        <RoundedBox args={[3.53, 2.13, 0.012]} radius={0.04} smoothness={3} position={[0, 0, 0.041]}>
          <meshStandardMaterial color="#08080a" metalness={0.15} roughness={0.14} />
        </RoundedBox>

        <mesh position={[0, 1.025, 0.048]}>
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#141824" />
        </mesh>

        {/* ── Screen Surface (4K Yosemite Wallpaper) ── */}
        <group position={[0, 0, 0.049]}>

          <mesh geometry={SCREEN_GEO}>
            <meshBasicMaterial map={wallpaperTex} color="#ffffff" toneMapped={false} />
          </mesh>

          {/* ── Apple-Style Dynamic Island at top center of Studio Display ── */}
          <DesktopDynamicIsland
            spotifyData={spotifyData}
            openApp={openApp}
            isInteractive={isViewingPC}
            visible={!zoomed}
            onOpenSpotify={() => {
              setZoomed(false);
              setOpenApp('spotify');
            }}
          />

          {/* ── Spring-Animated macOS Window ── */}
          {renderedApp !== null && (
            <animated.group position={winPos as any} scale={winScale as any}>
              <animated.group scale-x={winZoomX as any} scale-y={winZoomY as any}>
                {assets.winShadow && !zoomed && (
                  <mesh position={[0, -0.04, -0.0005]}>
                    <planeGeometry args={[WIN_W + 0.38, WIN_H + 0.38]} />
                    <meshBasicMaterial map={assets.winShadow} transparent depthWrite={false} />
                  </mesh>
                )}

                <mesh geometry={WIN_BORDER_GEO} position={[0, 0, 0]}>
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.11} />
                </mesh>
                <mesh geometry={WIN_BODY_GEO} position={[0, 0, 0.0005]}>
                  <meshBasicMaterial color="#181920" />
                </mesh>
                {renderedApp === 'projects' ? (
                  <>
                    <mesh geometry={WIN_SIDEBAR_GEO} position={[-WIN_W / 2 + SIDE_W / 2, 0, 0.001]}>
                      <meshBasicMaterial color="#1f2129" />
                    </mesh>
                    <mesh position={[-WIN_W / 2 + SIDE_W, 0, 0.002]}>
                      <planeGeometry args={[0.003, WIN_H]} />
                      <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
                    </mesh>
                  </>
                ) : (
                  <>
                    <mesh geometry={WIN_TITLEBAR_GEO} position={[0, titleCenterY, 0.001]}>
                      <meshBasicMaterial color="#23252e" />
                    </mesh>
                    <mesh position={[0, WIN_H / 2 - TITLE_H, 0.0015]}>
                      <planeGeometry args={[WIN_W, 0.003]} />
                      <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
                    </mesh>
                  </>
                )}

                {/* 1. CLEAN PROJECTS WINDOW */}
                {renderedApp === 'projects' && (
                  <group position={[0, 0, 0.004]}>
                    <Text font={SANS_BOLD} fontSize={0.034} color="#8e8e93" position={[-WIN_W / 2 + 0.11, 0.53, 0.002]} anchorX="left" anchorY="middle">
                      Projects
                    </Text>

                    {PROJECTS.map((item, idx) => {
                      const sel = item.key === selectedProject;
                      const y = 0.37 - idx * 0.168;
                      return (
                        <ProjectSidebarRow
                          key={item.key}
                          name={item.name}
                          y={y}
                          selected={sel}
                          logoTex={projectLogos[item.key]}
                          fullBleedLogo={item.fullBleedLogo}
                          isInteractive={isViewingPC}
                          onSelect={() => setSelectedProject(item.key)}
                        />
                      );
                    })}

                    {/* Right Project Detail Pane — Real Project Logo */}
                    <group position={[-0.43, 0.505, 0.002]}>
                      {activeLogoTex && (
                        <mesh
                          geometry={proj.fullBleedLogo ? LOGO_SQUIRCLE_GEO : undefined}
                          position={[0, 0, 0.001]}
                        >
                          {!proj.fullBleedLogo && <planeGeometry args={[0.22, 0.22]} />}
                          <meshBasicMaterial map={activeLogoTex} transparent toneMapped={false} />
                        </mesh>
                      )}
                    </group>

                    <Text
                      font={SANS_BOLD}
                      fontSize={0.094}
                      color="#ffffff"
                      position={[-0.24, 0.56, 0.002]}
                      anchorX="left"
                      anchorY="middle"
                    >
                      {proj.name}
                    </Text>

                    <ClickableTextLink
                      position={[-0.24, 0.445, 0.002]}
                      text={proj.domain}
                      width={Math.max(0.45, proj.domain.length * 0.024)}
                      fontSize={0.038}
                      isInteractive={isViewingPC}
                      onClick={openProjectUrl}
                    />

                    <MacActionButton
                      position={[1.18, 0.505, 0.003]}
                      geometry={ACTION_BTN_GEO}
                      color="#0a84ff"
                      hoverColor="#2997ff"
                      label={proj.cta}
                      isInteractive={isViewingPC}
                      onClick={openProjectUrl}
                    />

                    {/* ── PRIMARY SEPARATOR ── */}
                    <mesh position={[rightCenterX, 0.365, 0.002]}>
                      <planeGeometry args={[2.02, 0.0025]} />
                      <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
                    </mesh>

                    {/* ── Section 1: About the Project ── */}
                    <Text
                      font={SANS_BOLD}
                      fontSize={0.028}
                      color="#8b8b96"
                      position={[leftX, 0.31, 0.002]}
                      anchorX="left"
                      anchorY="middle"
                      letterSpacing={0.06}
                    >
                      ABOUT THE PROJECT
                    </Text>

                    <Text
                      font={SANS}
                      fontSize={0.036}
                      color="#e4e4e7"
                      position={[leftX, 0.265, 0.002]}
                      anchorX="left"
                      anchorY="top"
                      maxWidth={1.96}
                      lineHeight={1.4}
                    >
                      {proj.story}
                    </Text>

                    {/* ── SECONDARY SEPARATOR ── */}
                    <mesh position={[rightCenterX, 0.035, 0.002]}>
                      <planeGeometry args={[2.02, 0.002]} />
                      <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
                    </mesh>

                    {/* ── Section 2: Key Capabilities ── */}
                    <Text
                      font={SANS_BOLD}
                      fontSize={0.028}
                      color="#8b8b96"
                      position={[leftX, -0.03, 0.002]}
                      anchorX="left"
                      anchorY="middle"
                      letterSpacing={0.06}
                    >
                      KEY CAPABILITIES
                    </Text>

                    {proj.highlights.map((bullet, bIdx) => {
                      const y = -0.095 - bIdx * 0.078;
                      return (
                        <group key={bIdx} position={[leftX, y, 0.002]}>
                          <mesh position={[0.012, 0, 0]}>
                            <circleGeometry args={[0.0085, 14]} />
                            <meshBasicMaterial color="#0a84ff" />
                          </mesh>
                          <Text
                            font={SANS}
                            fontSize={0.034}
                            color="#a1a1aa"
                            position={[0.045, 0, 0]}
                            anchorX="left"
                            anchorY="middle"
                            maxWidth={1.90}
                          >
                            {bullet}
                          </Text>
                        </group>
                      );
                    })}

                    {/* ── TERTIARY SEPARATOR ── */}
                    <mesh position={[rightCenterX, -0.32, 0.002]}>
                      <planeGeometry args={[2.02, 0.002]} />
                      <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
                    </mesh>

                    {/* ── Section 3: Tech Stack ── */}
                    <Text
                      font={SANS_BOLD}
                      fontSize={0.028}
                      color="#8b8b96"
                      position={[leftX, -0.38, 0.002]}
                      anchorX="left"
                      anchorY="middle"
                      letterSpacing={0.06}
                    >
                      TECH STACK
                    </Text>

                    {tagLayout.map(({ tag, x, y }) => (
                      <TagPill key={tag} text={tag} iconTex={stackIcons[tag]} x={x} y={y} />
                    ))}
                  </group>
                )}

                {/* 2. GITHUB WINDOW */}
                {renderedApp === 'github' && <MacGitHubPane githubGlyph={assets.githubWhite} isInteractive={isViewingPC} />}

                {/* 3. CONTACT WINDOW */}
                {renderedApp === 'contact' && (
                  <MacContactPane
                    discordGlyph={assets.discordWhite}
                    githubGlyph={assets.githubWhite}
                    mailGlyph={assets.mailWhite}
                    isInteractive={isViewingPC}
                  />
                )}

                {/* 4. SPOTIFY WINDOW */}
                {renderedApp === 'spotify' && (
                  <MacSpotifyPane
                    spotifyData={spotifyData}
                    spotifyDataRef={spotifyDataRef}
                    spotifyGlyph={assets.spotifyGreen}
                    isInteractive={isViewingPC}
                  />
                )}
              </animated.group>
            </animated.group>
          )}

          {/* ── Frosted macOS Dock with Pointer Cursors & Tooltips ── */}
          {!zoomed && (
            <group position={[0, -0.855, 0.006]}>
              <mesh geometry={DOCK_BORDER_GEO} position={[0, 0, 0]}>
                <meshBasicMaterial color="#ffffff" transparent opacity={0.13} />
              </mesh>
              <mesh geometry={DOCK_BODY_GEO} position={[0, 0, 0.0005]}>
                <meshBasicMaterial color="#161820" transparent opacity={0.74} />
              </mesh>
              {DOCK_APPS.map((app) => (
                <DockIconItem
                  key={app.id}
                  label={app.label}
                  color={app.color}
                  x={app.x}
                  glyphSize={app.id === 'projects' ? 0.086 : 0.076}
                  isInteractive={isViewingPC}
                  isActive={openApp === app.id}
                  glyph={dockGlyphs[app.id]}
                  onSelect={() => handleDockSelect(app.id)}
                />
              ))}
            </group>
          )}

        </group>
      </animated.group>
    </group>
  );
}

