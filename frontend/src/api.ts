import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const API = `${Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
export const FOOD_IMAGE = `${API}/assets/bowl`;
let token: string | null = null;
let unauthorized: (() => void) | null = null;
export const setToken = (value: string | null) => { token = value; };
export const onUnauthorized = (fn: () => void) => { unauthorized = fn; };
export const authHeaders = () => ({ Authorization: `Bearer ${token || ''}`, 'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul' });

export async function api<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { method, headers: { ...authHeaders(), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  } catch { throw new Error('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.'); }
  if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/session'].includes(path)) unauthorized?.();
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(typeof result.detail === 'string' ? result.detail : 'Bilgileri kontrol edip tekrar dene.');
  }
  return response.json();
}

export async function uploadImage(uri: string) {
  const form = new FormData();
  if (Platform.OS === 'web') form.append('file', await (await fetch(uri)).blob(), 'meal.jpg');
  else form.append('file', { uri, type: 'image/jpeg', name: 'meal.jpg' } as any);
  return api<{ image_id: string }>('/images', 'POST', form);
}

export async function exportReport() {
  if (Platform.OS === 'web') {
    const response = await fetch(`${API}/report`, { headers: authHeaders() });
    if (!response.ok) throw new Error('Rapor oluşturulamadı. Yeniden dene.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url; link.download = 'ritim-klinik-rapor.pdf'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    const file = await FileSystem.downloadAsync(`${API}/report`, `${FileSystem.cacheDirectory}ritim-klinik-rapor.pdf`, { headers: authHeaders() });
    if (file.status !== 200) throw new Error('Rapor oluşturulamadı. Yeniden dene.');
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Diyetisyeninle paylaş' });
    else throw new Error('Bu cihaz dosya paylaşımını desteklemiyor.');
  }
}