"use client";

import React, { useSyncExternalStore, ReactNode } from 'react';

export type FocusedItem = string | null;

class FocusStore {
  private item: FocusedItem = null;
  private listeners = new Set<() => void>();

  getSnapshot = () => this.item;

  setItem = (item: FocusedItem) => {
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
