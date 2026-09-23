import { createContext, useContext } from 'react';
import { Dashboard, Meal, Tab } from './types';
export type Panel = 'capture' | 'sleep' | 'recovery' | 'journal' | 'insights' | 'pro' | 'method' | null;
export const AppContext = createContext<{
  data: Dashboard | null; refresh: () => Promise<void>; refreshing: boolean; error: string;
  setTab: (tab: Tab) => void; setPanel: (panel: Panel) => void;
  notify: (text: string) => void; inspectMeal: (meal: Meal | null) => void;
}>(null as any);
export const useApp = () => useContext(AppContext);