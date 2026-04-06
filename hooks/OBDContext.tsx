import React, { createContext, useContext, useState } from 'react';

export interface OBDStats {
  coolant: number; rpm: number; voltage: number; speed: number;
  throttle: number; load: number; runTime: number; instantFuel: number;
}

export interface OBDContextType {
  stats: OBDStats;
  updateStats: (newUpdates: Partial<OBDStats>) => void;
  lastRaw: string;
  setLastRaw: (val: string) => void;
}

const OBDContext = createContext<OBDContextType | undefined>(undefined);

export const OBDProvider = ({ children }: { children: React.ReactNode }) => {
  const [stats, setStats] = useState<OBDStats>({
    coolant: 0, rpm: 0, voltage: 12.5, speed: 0,
    throttle: 0, load: 0, runTime: 0, instantFuel: 0
  });
  const [lastRaw, setLastRaw] = useState("IDLE");

  const updateStats = (newUpdates: Partial<OBDStats>) => {
    setStats(prev => ({ ...prev, ...newUpdates }));
  };

  return (
    <OBDContext.Provider value={{ stats, updateStats, lastRaw, setLastRaw }}>
      {children}
    </OBDContext.Provider>
  );
};

export const useOBD = () => {
  const context = useContext(OBDContext);
  if (!context) throw new Error;
  return context;
};