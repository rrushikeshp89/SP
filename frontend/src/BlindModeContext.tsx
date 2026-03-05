import { createContext, useContext, useState, type ReactNode } from 'react';

interface BlindModeCtx {
  blind: boolean;
  toggle: () => void;
  mask: (name: string, index?: number) => string;
}

const Ctx = createContext<BlindModeCtx>({ blind: false, toggle: () => {}, mask: (n) => n });

export function BlindModeProvider({ children }: { children: ReactNode }) {
  const [blind, setBlind] = useState(false);

  const mask = (name: string, index?: number) => {
    if (!blind) return name;
    const label = index !== undefined ? String.fromCharCode(65 + (index % 26)) : '?';
    return `Candidate ${label}`;
  };

  return (
    <Ctx.Provider value={{ blind, toggle: () => setBlind((b) => !b), mask }}>
      {children}
    </Ctx.Provider>
  );
}

export const useBlindMode = () => useContext(Ctx);
