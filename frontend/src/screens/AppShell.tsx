import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/src/theme';
import { useSession } from '@/src/session';
import { api } from '@/src/api';
import { AppContext, Panel } from '@/src/app-context';
import { Dashboard, Meal, Tab } from '@/src/types';
import { Icon, Button, IconName } from '@/src/components/ui';
import { storage } from '@/src/utils/storage';
import Today from './Today';
import Meals from './Meals';
import Habits from './Habits';
import Profile from './Profile';
import Capture from './Capture';
import Panels from './Panels';
import MealDetail from './MealDetail';

const TABS: { key: Tab; label: string; icon: IconName; active: IconName }[] = [
  { key: 'today', label: 'Bugün', icon: 'grid-outline', active: 'grid' },
  { key: 'meals', label: 'Öğünler', icon: 'leaf-outline', active: 'leaf' },
  { key: 'habits', label: 'Alışkanlıklar', icon: 'sunny-outline', active: 'sunny' },
  { key: 'profile', label: 'Ben', icon: 'person-outline', active: 'person' },
];
export default function AppShell() {
  const s = useStyles(); const { colors: c } = useTheme(); const insets = useSafeAreaInsets(); const { user } = useSession();
  const [tab, setTab] = useState<Tab>('today'); const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const [panel, setPanel] = useState<Panel>(null); const [meal, inspectMeal] = useState<Meal | null>(null); const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (text: string) => { if (timer.current) clearTimeout(timer.current); setToast(text); timer.current = setTimeout(() => setToast(''), 4000); };
  const refresh = useCallback(async () => { setRefreshing(true); try { setData(await api<Dashboard>('/dashboard')); setError(''); } catch (e: any) { setError(e.message); } finally { setRefreshing(false); } }, []);
  useEffect(() => { void refresh(); storage.getItem('ritim-first-camera', false).then(async value => { if (value) { await storage.removeItem('ritim-first-camera'); setPanel('capture'); } }); return () => { if (timer.current) clearTimeout(timer.current); }; }, [refresh]);
  const title = { today: `Merhaba, ${user?.name.split(' ')[0]}.`, meals: 'Beslenme günlüğün', habits: 'Küçük adımların', profile: 'Sana ait bir alan' }[tab];
  const subtitle = tab === 'today' ? new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).toLocaleUpperCase('tr-TR') : { meals: 'DOĞALLIĞA YER AÇ', habits: 'MÜKEMMEL DEĞİL, SÜRDÜRÜLEBİLİR', profile: 'KENDİ RİTMİNDE' }[tab];
  const tabButton = (item: typeof TABS[0]) => <Pressable key={item.key} testID={`tab-${item.key}`} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={({ pressed }) => [s.tab, pressed && s.pressed]}><Icon name={tab === item.key ? item.active : item.icon} size={21} color={tab === item.key ? c.brandPrimary : c.muted} /><Text style={[s.tabText, tab === item.key && s.tabActive]}>{item.label}</Text><View style={[s.tabDot, { backgroundColor: tab === item.key ? c.brandPrimary : c.transparent }]} /></Pressable>;
  return <AppContext.Provider value={{ data, refresh, refreshing, error, setTab, setPanel, notify, inspectMeal }}>
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}><View style={s.headerText}><Text style={s.eyebrow}>{subtitle}</Text><Text testID="screen-title" numberOfLines={1} style={s.title}>{title}</Text></View><Pressable testID="header-profile-button" onPress={() => setTab('profile')} style={({ pressed }) => [s.avatar, pressed && s.pressed]}><Text style={s.avatarText}>{user?.name[0]?.toLocaleUpperCase('tr-TR')}</Text><View style={s.avatarDot} /></Pressable></View>
      <View style={s.main}>{!data ? <View style={s.loading}>{refreshing ? <ActivityIndicator size="large" color={c.brandPrimary} /> : <><Text style={s.error}>{error || 'Günün hazırlanıyor.'}</Text><Button title="Yeniden dene" testID="dashboard-retry-button" onPress={refresh} /></>}</View> : tab === 'today' ? <Today /> : tab === 'meals' ? <Meals /> : tab === 'habits' ? <Habits /> : <Profile />}</View>
      <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, 10) }]}>{TABS.slice(0, 2).map(tabButton)}<View style={s.cameraSlot}><Pressable testID="camera-add-button" accessibilityRole="button" accessibilityLabel="Öğün ekle" onPress={() => setPanel('capture')} style={({ pressed }) => [s.camera, pressed && s.pressed]}><Icon name="add" size={30} color={c.onBrandPrimary} /></Pressable></View>{TABS.slice(2).map(tabButton)}</View>
      {!!toast && !panel && !meal && <Pressable testID="toast-message" onPress={() => setToast('')} style={[s.toast, { bottom: 90 + insets.bottom }]}><Icon name="checkmark-circle-outline" size={19} color={c.onSurfaceInverse} /><Text style={s.toastText}>{toast}</Text></Pressable>}
    </View>
    {panel === 'capture' ? <Capture onClose={() => setPanel(null)} /> : panel ? <Panels panel={panel} onClose={() => setPanel(null)} /> : null}
    {meal && <MealDetail meal={meal} onClose={() => inspectMeal(null)} />}
  </AppContext.Provider>;
}
const useStyles = makeStyles(c => ({ screen: { flex: 1, backgroundColor: c.surface }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 18, gap: 12 }, headerText: { flex: 1, gap: 8 }, eyebrow: { fontSize: 9, letterSpacing: 1.5, color: c.muted, fontWeight: '500' }, title: { fontSize: 27, color: c.onSurface, fontWeight: '500', letterSpacing: -1 }, avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: c.brandSecondary, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 18, color: c.brandPrimary, fontWeight: '500' }, avatarDot: { position: 'absolute', bottom: 0, right: 1, height: 10, width: 10, borderRadius: 8, borderWidth: 2, borderColor: c.surface, backgroundColor: c.success }, main: { flex: 1 }, loading: { flex: 1, justifyContent: 'center', padding: 30, gap: 20 }, error: { color: c.onSurfaceTertiary, textAlign: 'center' }, nav: { paddingTop: 10, paddingHorizontal: 12, flexDirection: 'row', borderTopWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: 'center' }, tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 5 }, tabText: { fontSize: 9, color: c.muted }, tabActive: { color: c.brandPrimary }, tabDot: { height: 3, width: 3, borderRadius: 3 }, cameraSlot: { flex: 1, alignItems: 'center' }, camera: { width: 54, height: 54, backgroundColor: c.brandPrimary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: -5 }, pressed: { opacity: .65, transform: [{ scale: .97 }] }, toast: { position: 'absolute', left: 24, right: 24, backgroundColor: c.surfaceInverse, borderRadius: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 10 }, toastText: { color: c.onSurfaceInverse, fontSize: 13, flex: 1 } }));