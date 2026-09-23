import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { storage } from '@/src/utils/storage';
import { api, setToken, onUnauthorized } from './api';
import { setColorScheme } from './theme';
import { User } from './types';

WebBrowser.maybeCompleteAuthSession();
const TOKEN_KEY = 'ritim-session';
const processed = new Set<string>();
const Context = createContext<any>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accept = async (result: { session_token: string; user: User }) => {
    const saved = await storage.secureSet(TOKEN_KEY, result.session_token);
    if (!saved) throw new Error('Güvenli oturum saklanamadı. Lütfen yeniden dene.');
    setToken(result.session_token); setUser(result.user); setError('');
  };
  const clear = async () => { setToken(null); setUser(null); await storage.secureRemove(TOKEN_KEY); };
  const exchange = async (url: string | null) => {
    const match = url?.match(/[?#&]session_id=([^&#]+)/);
    if (!match) return false;
    const id = decodeURIComponent(match[1]);
    if (processed.has(id)) return true;
    processed.add(id);
    await accept(await api('/auth/session', 'POST', { session_id: id }));
    if (Platform.OS === 'web') {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('session_id');
      const hash = new URLSearchParams(clean.hash.slice(1)); hash.delete('session_id'); clean.hash = hash.toString();
      window.history.replaceState(window.history.state, '', clean.toString());
    }
    return true;
  };
  useEffect(() => {
    onUnauthorized(() => { void clear(); });
    const start = async () => {
      try {
        const url = Platform.OS === 'web' ? window.location.href : await Linking.getInitialURL();
        if (await exchange(url)) return;
        const stored = await storage.secureGet<string | null>(TOKEN_KEY, null);
        if (stored) { setToken(stored); setUser(await api('/auth/me')); }
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    void start();
    const sub = Linking.addEventListener('url', ({ url }) => { exchange(url).catch(e => setError(e.message)); });
    return () => sub.remove();
    // One initialization; all requests share the API token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setColorScheme(user?.theme || 'light'); }, [user?.theme]);
  const google = async () => {
    setError('');
    const redirect = Platform.OS === 'web' ? `${window.location.origin}/` : Linking.createURL('');
    const url = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === 'web') { window.location.href = url; return; }
    let captured: string | null = null;
    const listener = Linking.addEventListener('url', event => { captured = event.url; });
    try {
      const result = await WebBrowser.openAuthSessionAsync(url, redirect);
      const callback = result.type === 'success' ? result.url : captured || await Linking.getInitialURL();
      await exchange(callback);
    } finally { listener.remove(); }
  };
  const logout = async () => { try { await api('/auth/logout', 'POST'); } finally { await clear(); } };
  return <Context.Provider value={{ user, setUser, loading, error, setError, accept, google, logout }}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context) as { user: User | null; setUser: (u: User) => void; loading: boolean; error: string; setError: (e: string) => void; accept: (r: any) => Promise<void>; google: () => Promise<void>; logout: () => Promise<void> };