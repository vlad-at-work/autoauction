'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type DebugModeState = {
  enabled: boolean;
  useMockData: boolean;
  mockUserId: string | null;
};

type DebugModeContextType = {
  debugMode: DebugModeState;
  setDebugMode: (state: DebugModeState) => void;
  enableDebugMode: (userId: string, useMock: boolean) => void;
  disableDebugMode: () => void;
};

const DebugModeContext = createContext<DebugModeContextType | null>(null);

export function DebugModeProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugModeState] = useState<DebugModeState>(() => {
    if (typeof window === 'undefined') {
      return { enabled: false, useMockData: true, mockUserId: null };
    }
    const stored = localStorage.getItem('debugMode');
    if (stored) {
      try {
        return JSON.parse(stored) as DebugModeState;
      } catch {
        localStorage.removeItem('debugMode');
      }
    }
    return { enabled: false, useMockData: true, mockUserId: null };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debugMode', JSON.stringify(debugMode));
    }
  }, [debugMode]);

  const setDebugMode = (state: DebugModeState) => {
    setDebugModeState(state);
  };

  const enableDebugMode = (userId: string, useMock: boolean) => {
    setDebugMode({
      enabled: true,
      useMockData: useMock,
      mockUserId: userId,
    });
  };

  const disableDebugMode = () => {
    setDebugMode({
      enabled: false,
      useMockData: true,
      mockUserId: null,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debugMode');
    }
  };

  return (
    <DebugModeContext.Provider
      value={{ debugMode, setDebugMode, enableDebugMode, disableDebugMode }}
    >
      {children}
    </DebugModeContext.Provider>
  );
}

export function useDebugMode() {
  const context = useContext(DebugModeContext);
  if (!context) {
    throw new Error('useDebugMode must be used within DebugModeProvider');
  }
  return context;
}
