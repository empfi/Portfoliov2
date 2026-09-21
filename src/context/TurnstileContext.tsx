"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

const TurnstileContext = createContext<{
  token: string | null;
  setToken: (t: string | null) => void;
}>({ token: null, setToken: () => {} });

export function TurnstileProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  return (
    <TurnstileContext.Provider value={{ token, setToken }}>
      {children}
    </TurnstileContext.Provider>
  );
}

export function useTurnstile() {
  return useContext(TurnstileContext);
}
