"use client";

import React, { useSyncExternalStore, ReactNode } from 'react';
import { sound } from '@/utils/sound';

export type FocusedItem = string | null;

class FocusStore {
  private item: FocusedItem = null;
  private listeners = new Set<() => void>();

  getSnapshot = () => this.item;
  private putDownTimer: any = null;

  setItem = (item: FocusedItem) => {
    const prev = this.item;
    if (this.putDownTimer) {
      clearTimeout(this.putDownTimer);
      this.putDownTimer = null;
    }
    // Delay sound until the spring drops the item onto the table surface (~370ms)
    if (prev && !item) {
      this.putDownTimer = setTimeout(() => {
        sound.playPutDown();
        this.putDownTimer = null;
      }, 370);
    }
    this.item = item;
    this.listeners.forEach((l) => l());
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

const store = new FocusStore();

export function useFocus() {
  const focusedItem = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { focusedItem, setFocusedItem: store.setItem };
}

// Keep the provider as a pass-through so existing imports don't break
export function FocusProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
