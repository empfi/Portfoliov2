"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { RoundedBox, Text, Html } from '@react-three/drei';
import { useFocus } from '@/context/FocusContext';
import { PageEdges } from './PageEdges';

/** Thin gilt rectangle inset on a book cover (cover top surface at y = 0.02) */
function CoverBorder({ color }: { color: string }) {
  const w = 2.15, d = 3.15, t = 0.022;
  const bars: [number, number, number, number][] = [
    [0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d],
  ];
  return (
    <group position={[1.3, 0.022, 0]}>
      {bars.map(([x, z, bw, bd]) => (
        <mesh key={`${x},${z}`} position={[x, 0, z]}>
          <boxGeometry args={[bw, 0.004, bd]} />
          <meshStandardMaterial color={color} metalness={1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
import { useRest } from '@/context/DeskLayout';
import { useTurnstile } from '@/context/TurnstileContext';
import { draft, useDraft, MAX_CHARS } from '@/context/GuestbookDraft';

const FONT = '/fonts/caveat.woff';

const setTyped = draft.setText;

export function GuestBook() {
  const { focusedItem, setFocusedItem } = useFocus();
  const { token: turnstileToken } = useTurnstile();
  const isOpen = focusedItem === 'guestbook';
  const rest = useRest('guestbook');

  const { text: typed } = useDraft();
  const [cursor, setCursor]           = useState(true);
  const [pageCache, setPageCache]     = useState<Record<number, any[]>>({});
  const [totalPages, setTotalPages]   = useState(1);
  const [spread, setSpread]           = useState(0);
  const [selectedAll, setSelectedAll] = useState(false);

  // Layout synchronization states
  const [inputLines, setInputLines]   = useState(1);
  const [entryLines, setEntryLines]   = useState<Record<string, number>>({});

  const inputRef = React.useRef<any>(null);
  const entryRefs = React.useRef<Record<string, any>>({});

  // Robust line measurement fallback for Troika 3D Text
  const measureLines = (mesh: any, currentLc: number) => {
    if (!mesh) return currentLc;
    if (mesh.textRenderInfo?.lineCount) {
      return mesh.textRenderInfo.lineCount;
    }
    if (mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        const h = mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y;
        if (h > 0) return Math.max(1, Math.round(h / 0.216));
      }
    }
    return currentLc;
  };

  /* ── Lazy on-demand paginated fetch: ONLY when book is open ── */
  const fetchPage = useCallback(async (pageNumber: number) => {
    try {
      const res = await fetch(`/api/guestbook?page=${pageNumber}&limit=8`);
      const data = await res.json();
      if (data.entries) {
        setPageCache(prev => ({ ...prev, [pageNumber]: data.entries }));
      }
      if (data.totalPages) {
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load guestbook page', err);
    }
  }, []);

  useEffect(() => {
    // Only fetch if book is open AND this page isn't already cached
    if (isOpen && !pageCache[spread + 1]) {
      fetchPage(spread + 1);
    }
  }, [isOpen, spread, pageCache, fetchPage]);

  // When book is open and someone submits, refresh current page
  useEffect(() => {
    if (!isOpen) return;
    const h = () => {
      setPageCache({});
      fetchPage(spread + 1);
    };
    window.addEventListener('guestbook-updated', h);
    return () => window.removeEventListener('guestbook-updated', h);
  }, [isOpen, spread, fetchPage]);

  /* ── blinking cursor ── */
  useEffect(() => {
    if (!isOpen) { setCursor(true); return; }
    const t = setInterval(() => setCursor(v => !v), 530);
    return () => clearInterval(t);
  }, [isOpen]);

  /* ── keyboard capture (desktop: physical keyboard typed anywhere on the page) ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Typing into a real field (the mobile composer) is handled by that field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedAll(true);
        return;
      }

      if (selectedAll) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          setTyped('');
          setSelectedAll(false);
          return;
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setTyped(e.key);
          setSelectedAll(false);
          return;
        } else {
          setSelectedAll(false);
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setFocusedItem(null);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        submitText(typed);
      } else if (e.key === 'Backspace') {
        setTyped(p => p.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (typed.length < MAX_CHARS) {
          setTyped(p => p + e.key);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, typed, selectedAll]);

  const submitText = async (text: string) => {
    if (!text.trim() || draft.get().sending) return;
    draft.setSending(true);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        body: JSON.stringify({ name: 'Anonymous', message: text.trim(), token: turnstileToken }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        // Keep the draft so nothing typed is lost; the server says why (e.g. daily limit)
        const data = await res.json().catch(() => ({}));
        draft.setStatus(data.error || 'Could not sign the guestbook, please try again.');
        return;
      }
    } catch {
      draft.setStatus('Network error, please try again.');
      return;
    } finally {
      draft.setSending(false);
    }
    setTyped('');
    draft.setStatus('Thanks for signing!');
    
    // Invalidate cache and jump back to page 1 to see the new entry
    setPageCache({});
    setSpread(0);
    fetchPage(1);
    window.dispatchEvent(new CustomEvent('guestbook-updated'));
  };

  // The mobile composer asks us to submit (we own the Turnstile token and page cache)
  useEffect(() => {
    if (!isOpen) return;
    const onSubmit = () => submitText(draft.get().text);
    window.addEventListener('guestbook-submit', onSubmit);
    return () => window.removeEventListener('guestbook-submit', onSubmit);
  });

  /* ── per-spread layout from current page cache ── */
  const PAGE_BOTTOM = -1.15;
  const currentEntries = pageCache[spread + 1] || [];
  
  const currentLeft: any[] = [];
  const currentRight: any[] = [];
  const currentLeftPos: number[] = [];
  const currentRightPos: number[] = [];
  
  const isFirstSpread = spread === 0;
  let leftY = isFirstSpread ? (isOpen ? 0.85 - (0.35 + (inputLines - 1) * 0.216) : 0.85) : 1.25;
  let isLeft = true;
  let currentY = leftY;

  for (const ent of currentEntries) {
    const lines = entryLines[ent.id] || 1;
    const h = 0.35 + (lines - 1) * 0.216;
    
    if (currentY - h < PAGE_BOTTOM) {
      if (isLeft) {
        isLeft = false;
        currentY = 1.25;
      } else {
        break; // Filled current spread
      }
    }
    
    if (isLeft) {
      currentLeft.push(ent);
      currentLeftPos.push(currentY);
      currentY -= h;
    } else {
      currentRight.push(ent);
      currentRightPos.push(currentY);
      currentY -= h;
    }
  }

  const totalSpreads = Math.max(1, totalPages);
  const leftEntries = currentLeft;
  const rightEntries = currentRight;
  const leftPositions = currentLeftPos;
  const rightPositions = currentRightPos;
  
  const col = '#111827';
  const textOpacity = isOpen ? 1 : 0;
  const inputY = 0.85; // Fixed start Y for the input

  /* ── spring ── */
  const { bookPos, bookRot, bookScale, coverRotation } = useSpring({
    bookPos:       isOpen ? [1.25, 4.5, 0]           : rest.pos,
    bookRot:       isOpen ? [0, 0, 0]                 : rest.rot,
    bookScale:     isOpen ? [0.825, 0.825, 0.825]     : [0.75, 0.75, 0.75],
    coverRotation: isOpen ? Math.PI * 0.95            : 0,
    config: { mass: 1, tension: 160, friction: 30, clamp: true },
  });

  const onClickBook = (e: any) => { 
    e.stopPropagation(); 
    setSelectedAll(false); 
    if (!isOpen) setFocusedItem('guestbook'); 
  };
  
  const stopProp = (e: any) => { e.stopPropagation(); setSelectedAll(false); };
  const over = () => { document.body.style.cursor = 'pointer'; };
  const out  = () => { document.body.style.cursor = 'auto'; };

  const formatMessage = (msg: string) => msg.length > MAX_CHARS ? msg.slice(0, MAX_CHARS) + '...' : msg;

  return (
    <animated.group
      position={bookPos as any} rotation={bookRot as any} scale={bookScale as any}
      onPointerDown={stopProp} onPointerUp={stopProp} onPointerMove={stopProp} onDoubleClick={stopProp}
    >
      {/* ── geometry ── */}
      <RoundedBox args={[2.7, 0.04, 3.5]} position={[0, -0.02, 0]} radius={0.02} smoothness={4}
        castShadow receiveShadow onClick={onClickBook} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[2.5, 0.1, 3.4]} position={[0.05, 0.05, 0]} radius={0.01} smoothness={2}
        castShadow receiveShadow onClick={onClickBook} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color="#fefefe" roughness={1} />
      </RoundedBox>
      <PageEdges w={2.5} h={0.1} d={3.4} position={[0.05, 0.05, 0]} />
      <RoundedBox args={[0.2, 0.28, 3.5]} position={[-1.25, 0.1, 0]} radius={0.05} smoothness={4}
        castShadow receiveShadow onClick={onClickBook} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color="#5c3a21" roughness={0.8} />
      </RoundedBox>
      <mesh position={[0.5, 0.05, -1.42]} castShadow onClick={onClickBook} onPointerOver={over} onPointerOut={out}>
        <boxGeometry args={[0.22, 0.01, 0.85]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>

      {/* ── RIGHT PAGE — newest messages ── */}
      <group position={[0.1, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {rightEntries.map((ent, i) => (
          <Text key={ent.id} ref={(r) => { if (r) entryRefs.current[ent.id] = r; }} font={FONT} fontSize={0.18} color={col}
            anchorX="left" anchorY="top" position={[-1.1, rightPositions[i], 0]} maxWidth={2.2} lineHeight={1.2} overflowWrap="break-word"
            onSync={(meshArg) => {
              const mesh = meshArg || entryRefs.current[ent.id];
              const currentLc = entryLines[ent.id] || 1;
              const lc = measureLines(mesh, currentLc);
              if (lc !== currentLc) setEntryLines(p => ({ ...p, [ent.id]: lc }));
            }}>
            {`—\u00A0${formatMessage(ent.message)}`}
          </Text>
        ))}

        {/* Pagination */}
        {totalSpreads > 1 && isOpen && (
          <Html transform position={[0, -1.35, 0]} distanceFactor={1.5} center>
            <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
              style={{ display: 'flex', gap: '16px', alignItems: 'center', pointerEvents: 'auto', userSelect: 'none' }}>
              <style>{`@font-face{font-family:'Caveat';src:url('/fonts/caveat.woff') format('woff');}`}</style>
              <button onClick={() => setSpread(s => Math.max(0, s - 1))} disabled={spread === 0}
                style={{ background: 'none', border: 'none', cursor: spread === 0 ? 'default' : 'pointer', fontFamily: 'Caveat', fontSize: '32px', color: spread === 0 ? '#aaa' : '#000', padding: '0 8px', fontWeight: 'bold' }}>‹</button>
              <span style={{ fontFamily: 'Caveat', fontSize: '24px', color: '#000', fontWeight: 'bold' }}>{spread + 1} / {totalSpreads}</span>
              <button onClick={() => setSpread(s => Math.min(totalSpreads - 1, s + 1))} disabled={spread >= totalSpreads - 1}
                style={{ background: 'none', border: 'none', cursor: spread >= totalSpreads - 1 ? 'default' : 'pointer', fontFamily: 'Caveat', fontSize: '32px', color: spread >= totalSpreads - 1 ? '#aaa' : '#000', padding: '0 8px', fontWeight: 'bold' }}>›</button>
            </div>
          </Html>
        )}
      </group>

      {/* ── LEFT COVER — older messages ── */}
      <animated.group position={[-1.25, 0.221, 0]} rotation-z={coverRotation}>
        <RoundedBox args={[2.5, 0.04, 3.5]} position={[1.25, 0, 0]} radius={0.02} smoothness={4}
          castShadow receiveShadow onClick={onClickBook} onPointerOver={over} onPointerOut={out}>
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
        </RoundedBox>

        <CoverBorder color="#c9a14a" />
        {/* Front Cover Title */}
        <Text font={FONT} fontSize={0.5} color="#3d2314" position={[1.25, 0.025, -1.0]} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
          Guestbook
        </Text>

        <RoundedBox args={[2.45, 0.1, 3.4]} position={[1.25, -0.07, 0]} radius={0.01} smoothness={2}
          castShadow receiveShadow onClick={onClickBook} onPointerOver={over} onPointerOut={out}>
          <meshStandardMaterial color="#fefefe" roughness={1} />
        </RoundedBox>
        <PageEdges w={2.45} h={0.1} d={3.4} position={[1.25, -0.07, 0]} />

        <group position={[1.25, -0.125, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
          {isFirstSpread && (
            <Text font={FONT} fontSize={0.35} color={col} anchorX="center" anchorY="top" position={[0, 1.35, 0]}>
              Guestbook
            </Text>
          )}

          {/* Fake Selection Highlight perfectly scaled to the exact number of rendered lines */}
          {selectedAll && isFirstSpread && (
            <mesh position={[0, inputY - 0.09 - ((inputLines - 1) * 0.108), 0.002]}>
              <planeGeometry args={[2.2, 0.24 + ((inputLines - 1) * 0.216)]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
            </mesh>
          )}

          {/* Input line */}
          {isOpen && isFirstSpread && (
            <Text ref={inputRef} font={FONT} fontSize={0.18} color={selectedAll ? '#ffffff' : col} anchorX="left" anchorY="top"
              position={[-1.1, inputY, 0]} maxWidth={2.2} lineHeight={1.2} overflowWrap="break-word"
              onSync={(meshArg) => {
                const mesh = meshArg || inputRef.current;
                const lc = measureLines(mesh, inputLines);
                if (lc !== inputLines) setInputLines(lc);
              }}>
              {`—\u00A0${typed}${cursor && !selectedAll ? '|' : ' '}`}
            </Text>
          )}

          {/* Drawn underlines - dynamically generates an underline for EVERY line of the input text */}
          {isOpen && isFirstSpread && Array.from({ length: inputLines }).map((_, j) => (
            <mesh key={`ul-${j}`} position={[0, inputY - 0.22 - (j * 0.216), 0.001]}>
              <planeGeometry args={[2.2, 0.008]} />
              <meshBasicMaterial color="#8b5a2b" transparent opacity={0.6} />
            </mesh>
          ))}



          {/* Existing messages */}
          {leftEntries.map((ent, i) => (
            <Text key={ent.id} ref={(r) => { if (r) entryRefs.current[ent.id] = r; }} font={FONT} fontSize={0.18} color={col}
              anchorX="left" anchorY="top" position={[-1.1, leftPositions[i], 0]} maxWidth={2.2} lineHeight={1.2} overflowWrap="break-word"
              onSync={(meshArg) => {
                const mesh = meshArg || entryRefs.current[ent.id];
                const currentLc = entryLines[ent.id] || 1;
                const lc = measureLines(mesh, currentLc);
                if (lc !== currentLc) setEntryLines(p => ({ ...p, [ent.id]: lc }));
              }}>
              {`—\u00A0${formatMessage(ent.message)}`}
            </Text>
          ))}
        </group>
      </animated.group>
    </animated.group>
  );
}
