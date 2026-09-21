"use client";
import React, { useMemo, useState, useCallback, useEffect, Suspense, useRef } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { Text, useTexture, Html, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useFocus } from '@/context/FocusContext';

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

const TOP = 0.01;
const TY = TOP + 0.004; // text/content Y
const R = [-Math.PI / 2, 0, 0] as const; // shared rotation

const SCREEN_SHAPE = makeRoundedRect(1.34, 2.74, 0.18);
const ICON_SHAPE = makeRoundedRect(0.24, 0.24, 0.055);
const HOME_BAR_SHAPE = makeRoundedRect(0.4, 0.015, 0.007);
const ISLAND_SHAPE = makeRoundedRect(0.38, 0.12, 0.06);
const ALBUM_SHAPE = makeRoundedRect(1.0, 1.0, 0.05);
const SPOTIFY_BTN_SHAPE = makeRoundedRect(0.7, 0.15, 0.075);

let githubTex: THREE.Texture | null = null;
let mailTex: THREE.Texture | null = null;
let discordTex: THREE.Texture | null = null;
let spotifyTex: THREE.Texture | null = null;

function initTextures() {
  if (typeof document === 'undefined') return;
  if (githubTex) return;

  const cGit = document.createElement('canvas');
  cGit.width = cGit.height = 512;
  const ctxGit = cGit.getContext('2d')!;
  ctxGit.fillStyle = 'white';
  const pGit = new Path2D("M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z");
  ctxGit.save(); ctxGit.scale(21.3, 21.3); ctxGit.fill(pGit); ctxGit.restore();
  githubTex = new THREE.CanvasTexture(cGit);
  githubTex.colorSpace = THREE.SRGBColorSpace;

  const cMail = document.createElement('canvas');
  cMail.width = cMail.height = 512;
  const ctxMail = cMail.getContext('2d')!;
  ctxMail.fillStyle = 'white';
  const pMail = new Path2D("M2 4h20c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.01L12 11l10-4.99V6H2zm0 2.99V18h20V8.99l-10 5-10-5z");
  ctxMail.save(); ctxMail.scale(20, 20); ctxMail.translate(1, 1); ctxMail.fill(pMail); ctxMail.restore();
  mailTex = new THREE.CanvasTexture(cMail);
  mailTex.colorSpace = THREE.SRGBColorSpace;

  const cDisc = document.createElement('canvas');
  cDisc.width = cDisc.height = 512;
  const ctxDisc = cDisc.getContext('2d')!;
  ctxDisc.fillStyle = 'white';
  const pDisc = new Path2D("M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.077.077 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z");
  ctxDisc.save(); ctxDisc.scale(21.3, 21.3); ctxDisc.translate(0, 2); ctxDisc.fill(pDisc); ctxDisc.restore();
  discordTex = new THREE.CanvasTexture(cDisc);
  discordTex.colorSpace = THREE.SRGBColorSpace;

  const cSpot = document.createElement('canvas');
  cSpot.width = cSpot.height = 512;
  const ctxSpot = cSpot.getContext('2d')!;
  ctxSpot.fillStyle = 'white';
  const pSpot = new Path2D("M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.492 17.3c-.206.333-.637.447-.97.241-2.658-1.624-6.002-1.992-9.948-1.091-.383.088-.76-.153-.848-.535-.088-.382.153-.76.535-.848 4.31-.983 8.016-.576 11.002 1.25.333.204.444.634.229.983zm1.408-3.136c-.259.418-.802.55-1.22.29-3.045-1.874-7.7-2.434-11.238-1.332-.472.148-.971-.115-1.119-.587-.148-.472.115-.971.587-1.119 4.053-1.26 9.176-.632 12.7 1.53.418.261.55.803.29 1.218zm.135-3.29c-3.642-2.164-9.65-2.366-13.132-1.309-.548.167-1.134-.142-1.301-.69-.167-.549.141-1.134.69-1.302 4.02-1.222 10.665-.989 14.887 1.517.493.293.655.932.362 1.425-.293.493-.933.655-1.425.362z");
  ctxSpot.save(); ctxSpot.scale(21.3, 21.3); ctxSpot.fill(pSpot); ctxSpot.restore();
  spotifyTex = new THREE.CanvasTexture(cSpot);
  spotifyTex.colorSpace = THREE.SRGBColorSpace;
}

// 📱 App Definitions 📱
type AppId = 'contact' | 'github' | 'spotify';

interface AppDef {
  id: AppId;
  label: string;
  color: string;
  bg: string;
}

const GRID_APPS = [
  { id: 'contact' as AppId, label: 'Contact', color: '#3b82f6', bg: '#1e3a8a' },
  { id: 'github' as AppId, label: 'GitHub', color: '#10b981', bg: '#064e3b' },
  { id: 'spotify' as AppId, label: 'Spotify', color: '#1db954', bg: '#121212' },
];

// ─── UI Components ───
function LiveTime() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, []);

  return (
    <Text fontSize={0.075} color="#ffffff" position={[-0.53, TOP + 0.006, -1.26]} rotation={R as any} anchorX="left" anchorY="middle" fontWeight="bold">
      {time}
    </Text>
  );
}

function AppBackground({ color }: { color: string }) {
  return (
    <mesh position={[0, TOP + 0.003, 0]} rotation={R as any}>
      <shapeGeometry args={[SCREEN_SHAPE]} />
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

function AppIcon({ x, z, app, onTap }: { x: number; z: number; app: AppDef; onTap: (id: AppId) => void }) {
  // Ensure textures are ready before attempting to use them.
  // Fallback to null is safe, but since we initialized synchronously, they are ready.
  const tex = app.id === 'github' ? githubTex : app.id === 'spotify' ? spotifyTex : mailTex;
  const handleClick = useCallback((e: any) => { e.stopPropagation(); onTap(app.id); }, [app.id, onTap]);

  return (
    <group position={[x, TOP + 0.002, z]} onClick={handleClick} onPointerOver={() => document.body.style.cursor='pointer'} onPointerOut={() => document.body.style.cursor='auto'}>
      <mesh rotation={R as any}>
        <shapeGeometry args={[ICON_SHAPE]} />
        <meshBasicMaterial color={app.color} side={THREE.DoubleSide} />
      </mesh>
      {/* 
        If map is provided to meshBasicMaterial during initial render, 
        the shader compiles with USE_MAP. Synchronous init guarantees this. 
      */}
      <mesh position={[0, 0.001, -0.02]} rotation={R as any}>
        <planeGeometry args={[0.12, 0.12]} />
        {tex && <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />}
      </mesh>
      <Text fontSize={0.045} color="#e2e8f0" position={[0, 0.001, 0.19]} rotation={R as any} anchorX="center" anchorY="middle">
        {app.label}
      </Text>
    </group>
  );
}

// ─── App Screens ───
function ContactScreen() {
  return (
    <group>
      <AppBackground color="#0f172a" />
      <Text fontSize={0.12} color="#fff" position={[0, TY, -0.8]} rotation={R as any} anchorX="center">
        Contact
      </Text>
      
      <group position={[0, TY, -0.3]}>
        <mesh position={[-0.35, 0, 0]} rotation={R as any}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshBasicMaterial map={discordTex!} transparent side={THREE.DoubleSide} />
        </mesh>
        <Text fontSize={0.07} color="#e2e8f0" position={[-0.2, 0, 0]} rotation={R as any} anchorX="left" anchorY="middle">
          empfii
        </Text>
      </group>

      <group position={[0, TY, 0.0]}>
        <mesh position={[-0.35, 0, 0]} rotation={R as any}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshBasicMaterial map={githubTex!} transparent side={THREE.DoubleSide} />
        </mesh>
        <Text fontSize={0.07} color="#e2e8f0" position={[-0.2, 0, 0]} rotation={R as any} anchorX="left" anchorY="middle">
          empfi
        </Text>
      </group>
    </group>
  );
}

function GitHubScreen() {
  const [data, setData] = useState<any>(null);
  const [avatarTex, setAvatarTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/users/empfi')
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (d.avatar_url) {
          new THREE.TextureLoader().load(d.avatar_url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            setAvatarTex(tex);
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <group>
      <AppBackground color="#0d1117" />
      
      {/* Avatar or Fallback Icon */}
      <mesh position={[0, TY, -0.7]} rotation={R as any}>
        {avatarTex ? <circleGeometry args={[0.15, 32]} /> : <planeGeometry args={[0.25, 0.25]} />}
        <meshBasicMaterial map={avatarTex || githubTex!} transparent side={THREE.DoubleSide} />
      </mesh>
      
      <Text fontSize={0.12} color="#ffffff" position={[0, TY, -0.35]} rotation={R as any} anchorX="center">
        {data ? (data.name || data.login) : 'Loading...'}
      </Text>
      <Text fontSize={0.06} color="#8b949e" position={[0, TY, -0.15]} rotation={R as any} anchorX="center">
        @empfi
      </Text>
      
      <mesh position={[0, TY, 0.05]} rotation={R as any}>
        <planeGeometry args={[1.1, 0.005]} />
        <meshBasicMaterial color="#30363d" />
      </mesh>

      {/* Real-time API Stats */}
      <group position={[-0.3, TY, 0.25]}>
        <Text fontSize={0.12} color="#ffffff" position={[0, 0, 0]} rotation={R as any} anchorX="center">
          {data ? data.public_repos : '-'}
        </Text>
        <Text fontSize={0.05} color="#8b949e" position={[0, 0, 0.1]} rotation={R as any} anchorX="center">
          Repositories
        </Text>
      </group>

      <group position={[0.3, TY, 0.25]}>
        <Text fontSize={0.12} color="#ffffff" position={[0, 0, 0]} rotation={R as any} anchorX="center">
          {data ? data.followers : '-'}
        </Text>
        <Text fontSize={0.05} color="#8b949e" position={[0, 0, 0.1]} rotation={R as any} anchorX="center">
          Followers
        </Text>
      </group>

      <mesh position={[0, TY, 0.45]} rotation={R as any}>
        <planeGeometry args={[1.1, 0.005]} />
        <meshBasicMaterial color="#30363d" />
      </mesh>
      
      {data?.bio && (
        <Text fontSize={0.055} color="#c9d1d9" maxWidth={1.1} position={[0, TY, 0.6]} rotation={R as any} anchorX="center" textAlign="center" lineHeight={1.4}>
          {data.bio}
        </Text>
      )}

      {/* Simulated Contribution Graph */}
      <group position={[-0.5, TY, 0.85]}>
        {Array.from({ length: 20 }).map((_, col) => (
          Array.from({ length: 7 }).map((_, row) => {
            // Generate some fake activity data
            const activityLevel = Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0;
            const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
            const color = colors[activityLevel];
            
            return (
              <mesh key={`${col}-${row}`} position={[col * 0.052, 0, row * 0.052]} rotation={R as any}>
                <planeGeometry args={[0.04, 0.04]} />
                <meshBasicMaterial color={color} />
              </mesh>
            );
          })
        ))}
      </group>
    </group>
  );
}

function useSpotifyLanyard() {
  const [spotifyData, setSpotifyData] = useState<any>(null);
  const spotifyDataRef = useRef<any>(null);

  useEffect(() => {
    const fetchLanyard = () => {
      fetch('https://api.lanyard.rest/v1/users/236612651529142272')
        .then(res => res.json())
        .then(d => {
          if (d.success && d.data.spotify) {
            setSpotifyData(d.data.spotify);
            spotifyDataRef.current = d.data.spotify;
          } else {
            setSpotifyData(null);
            spotifyDataRef.current = null;
          }
        })
        .catch(console.error);
    };

    fetchLanyard();
    const interval = setInterval(fetchLanyard, 5000);
    return () => clearInterval(interval);
  }, []);

  return { spotifyData, spotifyDataRef };
}

function DynamicIsland({ spotifyData, openApp }: { spotifyData: any; openApp: string | null }) {
  const isPlaying = !!spotifyData;
  const showExpanded = isPlaying && openApp !== 'spotify';
  
  const { islandW } = useSpring({
    islandW: showExpanded ? 0.6 : 0.38,
    config: { mass: 1, tension: 350, friction: 35 }
  });

  const centerScaleX = islandW.to(w => w - 0.12);
  const leftCapX = islandW.to(w => -(w - 0.12) / 2);
  const rightCapX = islandW.to(w => (w - 0.12) / 2);
  
  const lensX = islandW.to(w => w / 2 - 0.07);
  const albumX = islandW.to(w => -w / 2 + 0.07);
  const visX = islandW.to(w => w / 2 - 0.17);
  const contentScale = islandW.to(w => Math.max(0, (w - 0.38) / 0.22));

  // Tiny animated bars for the visualizer
  const bar1Ref = useRef<THREE.Mesh>(null);
  const bar2Ref = useRef<THREE.Mesh>(null);
  const bar3Ref = useRef<THREE.Mesh>(null);
  const albumDivRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    const w = islandW.get();
    const opacity = Math.max(0, (w - 0.38) / 0.22);
    if (albumDivRef.current) albumDivRef.current.style.opacity = opacity.toString();

    if (showExpanded && bar1Ref.current && bar2Ref.current && bar3Ref.current) {
      const t = state.clock.elapsedTime;
      const s1 = 0.3 + Math.abs(Math.sin(t * 8)) * 0.7;
      bar1Ref.current.scale.y = s1;
      bar1Ref.current.position.y = (s1 - 1) * 0.025; 

      const s2 = 0.3 + Math.abs(Math.cos(t * 11)) * 0.7;
      bar2Ref.current.scale.y = s2;
      bar2Ref.current.position.y = (s2 - 1) * 0.025;

      const s3 = 0.3 + Math.abs(Math.sin(t * 14)) * 0.7;
      bar3Ref.current.scale.y = s3;
      bar3Ref.current.position.y = (s3 - 1) * 0.025;
    }
  });

  return (
    <group position={[0, TOP + 0.006, -1.26]}>
      {/* Expanding Pill Shape */}
      <group rotation={R as any}>
        <animated.mesh position-x={leftCapX as any}>
          <circleGeometry args={[0.06, 32]} />
          <meshBasicMaterial color="#000000" />
        </animated.mesh>
        <animated.mesh position-x={rightCapX as any}>
          <circleGeometry args={[0.06, 32]} />
          <meshBasicMaterial color="#000000" />
        </animated.mesh>
        <animated.mesh scale-x={centerScaleX as any}>
          <planeGeometry args={[1, 0.12]} />
          <meshBasicMaterial color="#000000" />
        </animated.mesh>
      </group>

      {/* Animated Camera Lens */}
      <animated.group position-x={lensX as any}>
        <mesh position={[0, 0.001, 0]} rotation={R as any}>
          <circleGeometry args={[0.02, 16]} />
          <meshBasicMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0, 0.002, 0.005]} rotation={R as any}>
          <circleGeometry args={[0.006, 8]} />
          <meshBasicMaterial color="#4a4a8a" />
        </mesh>
      </animated.group>

      {/* Album Art Overlay */}
      {spotifyData && spotifyData.album_art_url && (
        <animated.group position-x={albumX as any} position-y={0.001}>
          <mesh rotation={R as any}>
            <circleGeometry args={[0.06, 32]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
          <Html transform rotation={R as any} distanceFactor={1.2} style={{ pointerEvents: 'none' }}>
            <div ref={albumDivRef} style={{ opacity: 0 }}>
              <CrossfadeImage 
                url={spotifyData.album_art_url}
                style={{ width: '30px', height: '30px', borderRadius: '50%' }}
              />
            </div>
          </Html>
        </animated.group>
      )}

      {/* Green Visualizer */}
      <animated.group position-x={visX as any} position-y={0.001} rotation={R as any} scale={contentScale as any}>
        <mesh ref={bar1Ref} position={[-0.03, 0, 0]}>
          <planeGeometry args={[0.012, 0.05]} />
          <meshBasicMaterial color="#1db954" />
        </mesh>
        <mesh ref={bar2Ref} position={[0, 0, 0]}>
          <planeGeometry args={[0.012, 0.05]} />
          <meshBasicMaterial color="#1db954" />
        </mesh>
        <mesh ref={bar3Ref} position={[0.03, 0, 0]}>
          <planeGeometry args={[0.012, 0.05]} />
          <meshBasicMaterial color="#1db954" />
        </mesh>
      </animated.group>
    </group>
  );
}

function CrossfadeImage({ url, style, blur = false }: { url: string, style: any, blur?: boolean }) {
  const [images, setImages] = useState([{ url, id: Date.now() }]);
  
  useEffect(() => {
    if (url && images[images.length - 1]?.url !== url) {
      const newId = Date.now();
      setImages(prev => [...prev, { url, id: newId }]);
      setTimeout(() => {
        setImages(current => current.filter(img => img.id === newId));
      }, 1500);
    }
  }, [url]);

  return (
    <div style={{ position: 'relative', width: style.width, height: style.height, pointerEvents: 'none' }}>
      {images.map((img, i) => {
        const isCurrent = i === images.length - 1;
        return (
          <img 
            key={img.id}
            src={img.url} 
            alt="Art"
            style={{ 
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%', height: '100%', 
              objectFit: 'cover',
              borderRadius: style.borderRadius || 0,
              filter: blur ? 'blur(80px) brightness(0.4) saturate(1.5)' : 'none',
              opacity: isCurrent ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
            }} 
          />
        );
      })}
    </div>
  );
}

function SpotifyScreen({ spotifyData, spotifyDataRef, openApp }: any) {
  const progressRef = useRef<THREE.Mesh>(null);
  const timeTextRef = useRef<any>(null);
  const totalTextRef = useRef<any>(null);

  const formatTime = (ms: number) => {
    if (ms < 0) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const truncate = (str: string, max: number) => str && str.length > max ? str.substring(0, max - 3) + '...' : str;

  useFrame(() => {
    const data = spotifyDataRef.current;
    if (!data || !progressRef.current || !timeTextRef.current || !totalTextRef.current) {
      if (progressRef.current) progressRef.current.scale.x = 0;
      return;
    }
    const { timestamps } = data;
    const now = Date.now();
    const duration = timestamps.end - timestamps.start;
    const current = Math.max(0, now - timestamps.start);
    let p = duration > 0 ? current / duration : 0;
    p = Math.min(Math.max(p, 0), 1);

    progressRef.current.scale.x = p;
    progressRef.current.position.x = -0.5 + (p * 1.0) / 2;

    timeTextRef.current.text = formatTime(current);
    totalTextRef.current.text = formatTime(duration);
  });

  return (
    <group>
      <AppBackground color="#121212" />

      {/* Header */}
      <Text fontSize={0.045} color="#ffffff" position={[0, TY, -1.0]} rotation={R as any} anchorX="center" fontWeight="bold">
        {spotifyData ? truncate(spotifyData.album, 35) : ''}
      </Text>

      {/* Album Art Area */}
      <mesh position={[0, TY, -0.4]} rotation={R as any}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial transparent opacity={0} />
        {openApp === 'spotify' && spotifyData && spotifyData.album_art_url && (
          <Html transform position={[0, 0, 0.01]} distanceFactor={1.2} style={{ pointerEvents: 'none' }}>
            <CrossfadeImage 
              url={spotifyData.album_art_url} 
              style={{ width: '335px', height: '335px', borderRadius: '16px' }} 
            />
          </Html>
        )}
      </mesh>

      {/* Song Info */}
      <Text fontSize={0.075} color="#ffffff" position={[-0.5, TY, 0.33]} rotation={R as any} anchorX="left" anchorY="top" fontWeight="bold">
        {spotifyData ? truncate(spotifyData.song, 22) : ''}
      </Text>
      <Text fontSize={0.05} color="#b3b3b3" position={[-0.5, TY, 0.58]} rotation={R as any} anchorX="left" anchorY="top">
        {spotifyData ? truncate(spotifyData.artist, 32) : ''}
      </Text>

      {/* Progress Bar Background */}
      <mesh position={[0, TY, 0.75]} rotation={R as any}>
        <planeGeometry args={[1.0, 0.01]} />
        <meshBasicMaterial color="#4d4d4d" />
      </mesh>
      
      {/* Progress Bar Fill */}
      <mesh ref={progressRef} position={[-0.5, TY, 0.75]} rotation={R as any}>
        <planeGeometry args={[1.0, 0.01]} />
        <meshBasicMaterial color="#1db954" />
      </mesh>

      {/* Timestamps */}
      <Text ref={timeTextRef} fontSize={0.035} color="#b3b3b3" position={[-0.5, TY, 0.82]} rotation={R as any} anchorX="left">
        0:00
      </Text>
      <Text ref={totalTextRef} fontSize={0.04} color="#b3b3b3" position={[0.5, TY, 0.85]} rotation={R as any} anchorX="right" anchorY="top">
        0:00
      </Text>

      {/* Open in Spotify Button */}
      {spotifyData && spotifyData.track_id && (
        <group 
          position={[0, TY + 0.005, 1.05]} 
          rotation={R as any}
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://open.spotify.com/track/${spotifyData.track_id}`, '_blank');
          }}
          onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor='pointer'; }}
          onPointerOut={() => document.body.style.cursor='auto'}
        >
          <mesh>
            <shapeGeometry args={[SPOTIFY_BTN_SHAPE]} />
            <meshBasicMaterial color="#1db954" />
          </mesh>
          <Text fontSize={0.045} color="#000000" position={[0, 0, 0.005]} anchorX="center" anchorY="middle" fontWeight="bold">
            OPEN IN SPOTIFY
          </Text>
        </group>
      )}
    </group>
  );
}

const APP_SCREENS: Record<AppId, React.FC> = {
  contact: ContactScreen,
  github: GitHubScreen,
  spotify: SpotifyScreen,
};

useTexture.preload('/wallpaper.webp');

// ─── Main Smartphone Component ───
export function Smartphone() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isFocused = focusedItem === 'phone';
  const [openApp, setOpenApp] = useState<AppId | null>(null);
  
  // Track active app for exit animations
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  useEffect(() => {
    if (!isFocused) {
      setOpenApp(null);
    }
  }, [isFocused]);

  useEffect(() => {
    if (openApp !== null) setActiveApp(openApp);
    let timeout: any;
    if (openApp === null) {
      timeout = setTimeout(() => setActiveApp(null), 400);
    }
    return () => clearTimeout(timeout);
  }, [openApp]);

  const getIconPos = (id: AppId | null) => {
    if (id === 'contact') return [-0.35, 0, -0.6];
    if (id === 'github') return [0, 0, -0.6];
    if (id === 'spotify') return [0.35, 0, -0.6];
    return [0, 0, 0];
  };
  const activePos = getIconPos(activeApp);

  const { homeScale } = useSpring({
    homeScale: openApp === null ? 1 : 0.9,
    config: { mass: 1, tension: 350, friction: 35 }
  });

  const { appPos, appScale } = useSpring({
    appPos: openApp !== null ? [0, 0, 0] : activePos,
    appScale: openApp !== null ? 1 : 0.001,
    config: { mass: 1, tension: 350, friction: 35 }
  });

  const { spotifyData, spotifyDataRef } = useSpotifyLanyard();

  const wallpaperTex = useTexture('/wallpaper.webp');
  wallpaperTex.colorSpace = THREE.SRGBColorSpace;
  
  // Fix ShapeGeometry UVs (which map to world coords by default) and apply object-fit: cover
  const W = 1.34;
  const H = 2.74;
  let repX = 1 / W;
  let repY = 1 / H;
  
  if (wallpaperTex.image) {
    const img = wallpaperTex.image as any;
    const imgAspect = img.width / img.height;
    const screenAspect = W / H;
    if (imgAspect > screenAspect) {
      repX *= (screenAspect / imgAspect);
    } else {
      repY *= (imgAspect / screenAspect);
    }
  }
  
  wallpaperTex.repeat.set(repX, repY);
  wallpaperTex.offset.set(0.5, 0.5);

  // Execute synchronously before any children render to ensure textures are loaded
  useMemo(() => { initTextures(); }, []);

  const chassisGeom = useMemo(() => {
    const shape = makeRoundedRect(1.4, 2.8, 0.22);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.06, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.01, bevelThickness: 0.005,
    });
    geom.rotateX(Math.PI / 2);
    return geom;
  }, []);

  const { pos, rot, scale } = useSpring({
    pos: isFocused ? [0, 1.5, 0] : [-4.0, 0.04, -0.5],
    rot: isFocused ? [0.25, 0, 0] : [0, 0.2, 0],
    scale: isFocused ? [1.6, 1.6, 1.6] : [0.75, 0.75, 0.75],
    config: { mass: 1, tension: 180, friction: 26, clamp: true },
  });

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (!isFocused) {
      setFocusedItem('phone');
      document.body.style.cursor = 'auto';
    }
  }, [isFocused, setFocusedItem]);

  const handleBack = useCallback((e: any) => {
    e.stopPropagation();
    setOpenApp(null);
  }, []);

  const stopProp = useCallback((e: any) => e.stopPropagation(), []);

  return (
    <animated.group 
      position={pos as any} 
      rotation={rot as any} 
      scale={scale as any} 
      onClick={handleClick}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        if (!isFocused) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (!isFocused) document.body.style.cursor = 'auto';
      }}
      onPointerDown={stopProp}
      onPointerUp={stopProp}
      onPointerMove={stopProp}
      onDoubleClick={stopProp}
    >

      {/* iPhone chassis */}
      <mesh geometry={chassisGeom} castShadow receiveShadow>
        <meshStandardMaterial color="#1f1f1f" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Screen Base (Wallpaper) */}
      <mesh position={[0, TOP, 0]} rotation={R as any}>
        <shapeGeometry args={[SCREEN_SHAPE]} />
        <meshBasicMaterial 
          color="#ffffff"
          map={wallpaperTex}
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* OS Content */}
      <Suspense fallback={null}>
        <group>
          <LiveTime />
          <DynamicIsland spotifyData={spotifyData} openApp={openApp} />

          {/* Universal Home Bar */}
          <group 
            onClick={openApp ? handleBack : undefined} 
            onPointerOver={openApp ? () => document.body.style.cursor='pointer' : undefined} 
            onPointerOut={openApp ? () => document.body.style.cursor='auto' : undefined}
          >
            <mesh position={[0, TOP + 0.006, 1.2]} rotation={R as any} visible={false}>
              <planeGeometry args={[0.6, 0.2]} />
            </mesh>
            <mesh position={[0, TOP + 0.006, 1.25]} rotation={R as any}>
              <shapeGeometry args={[HOME_BAR_SHAPE]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={openApp ? 0.6 : 0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>

          {/* Home Screen */}
          <animated.group scale={homeScale as any}>
            <AppIcon x={-0.35} z={-0.6} app={GRID_APPS[0]} onTap={setOpenApp} />
            <AppIcon x={0} z={-0.6} app={GRID_APPS[1]} onTap={setOpenApp} />
            <AppIcon x={0.35} z={-0.6} app={GRID_APPS[2]} onTap={setOpenApp} />
          </animated.group>

          {/* App View */}
          {activeApp !== null && (
            <animated.group position={appPos as any} scale={appScale as any}>
              {activeApp === 'contact' && <ContactScreen />}
              {activeApp === 'github' && <GitHubScreen />}
              {activeApp === 'spotify' && <SpotifyScreen spotifyData={spotifyData} spotifyDataRef={spotifyDataRef} openApp={openApp} />}
            </animated.group>
          )}
        </group>
      </Suspense>
    </animated.group>
  );
}
