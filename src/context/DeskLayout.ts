"use client";

import { useSyncExternalStore } from 'react';

export type Vec3 = [number, number, number];
export type Rest = { pos: Vec3; rot: Vec3 };

// Where each item rests on the desk. Landscape is the original wide arrangement; portrait
// re-flows the same items into a tall grid (desk turned 90°) so phones see everything
// upright — held/inspection poses are shared, so nothing has to rotate when you pick
// something up.
const LANDSCAPE: Record<string, Rest> = {
  hyperplex:  { pos: [1.5, 0.25, -1.0],   rot: [0, Math.PI / 4, 0] },
  luakey:     { pos: [0.5, 0.05, -1.5],   rot: [Math.PI / 2, 0, -0.4] },
  minedock:   { pos: [2.2, 0.45, -2.8],   rot: [0, -0.4, 0] },
  bloxvault:  { pos: [-2.5, 0.4, -2.5],   rot: [0, -0.3, 0] },
  neutrabots: { pos: [3.2, 0.35, -1.2],   rot: [0, 0, 0] },
  mysterybox: { pos: [-5.8, 0, -1.8],     rot: [0, 0, 0] },
  book:       { pos: [-1.8, 0.06, 0.6],   rot: [0, -0.15, 0] },
  guestbook:  { pos: [5.2, 0.06, -1.5],   rot: [0, -0.3, 0] },
  phone:      { pos: [-4.0, 0.04, -0.5],  rot: [0, 0.2, 0] },
  polaroid_1: { pos: [3.5, 0.02, 2.5],    rot: [0, -0.2, 0] },
  polaroid_2: { pos: [2.2, 0.02, 3.0],    rot: [0, 0.3, 0] },
  polaroid_3: { pos: [0.8, 0.02, 2.8],    rot: [0, -0.1, 0] },
};

const PORTRAIT: Record<string, Rest> = {
  minedock:   { pos: [-2.1, 0.45, -5.4],  rot: [0, 0.3, 0] },
  mysterybox: { pos: [0.1, 0, -5.5],      rot: [0, 0, 0] },
  bloxvault:  { pos: [2.2, 0.4, -5.3],    rot: [0, -0.3, 0] },
  book:       { pos: [-1.3, 0.06, -2.5],  rot: [0, -0.1, 0] },
  phone:      { pos: [1.9, 0.04, -2.5],   rot: [0, 0.15, 0] },
  hyperplex:  { pos: [-2.0, 0.25, 0.3],   rot: [0, Math.PI / 4, 0] },
  luakey:     { pos: [0.1, 0.05, 0.1],    rot: [Math.PI / 2, 0, -0.5] },
  neutrabots: { pos: [2.1, 0.35, 0.3],    rot: [0, -0.2, 0] },
  guestbook:  { pos: [1.2, 0.06, 3.8],    rot: [0, -0.15, 0] },
  polaroid_1: { pos: [-2.2, 0.02, 2.4],   rot: [0, -0.2, 0] },
  polaroid_2: { pos: [-1.5, 0.02, 3.9],   rot: [0, 0.3, 0] },
  polaroid_3: { pos: [-2.3, 0.02, 5.4],   rot: [0, -0.1, 0] },
};

// Footprint (x = width, z = depth) the camera must fit in the overview
export const CONTENT = {
  landscape: { w: 13, d: 7.4 },
  portrait: { w: 6.6, d: 12.8 },
};

const query = '(orientation: portrait)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function usePortrait() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function useRest(id: string): Rest {
  const portrait = usePortrait();
  return (portrait ? PORTRAIT : LANDSCAPE)[id];
}
