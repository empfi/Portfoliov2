"use client";

import { useSyncExternalStore } from 'react';

// Shared between the 3D guestbook (renders the text on the page) and the on-screen
// composer (a real <input>, the only thing mobile browsers raise a keyboard for).
export const MAX_CHARS = 100;

type Draft = { text: string; status: string | null; sending: boolean };

let state: Draft = { text: '', status: null, sending: false };
const listeners = new Set<() => void>();

function update(patch: Partial<Draft>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const draft = {
  get: () => state,
  setText: (next: string | ((prev: string) => string)) =>
    update({ text: (typeof next === 'function' ? next(state.text) : next).slice(0, MAX_CHARS), status: null }),
  setStatus: (status: string | null) => update({ status }),
  setSending: (sending: boolean) => update({ sending }),
  // The guestbook owns the Turnstile token and page cache, so it performs the POST
  requestSubmit: () => window.dispatchEvent(new CustomEvent('guestbook-submit')),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

export function useDraft() {
  return useSyncExternalStore(draft.subscribe, draft.get, draft.get);
}
