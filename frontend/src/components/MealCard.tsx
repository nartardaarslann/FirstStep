import { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, Image } from 'react-native';
import { API, FOOD_IMAGE, authHeaders } from '@/src/api';
import { Meal } from '@/src/types';
import { makeStyles, useTheme } from '@/src/theme';
import { Icon } from './ui';

export const TAGS: Record<string, string> = { home: 'Ev yapımı', restaurant: 'Restoran', packaged: 'Paketli' };
export const MEAL_TYPES: Record<string, string> = { breakfast: 'Kahvaltı', lunch: 'Öğle', dinner: 'Akşam', snack: 'Ara öğün' };
export function MealImage({ imageId, style }: { imageId?: string | null; style: any }) {
  const [uri, setUri] = useState(FOOD_IMAGE);
  useEffect(() => {
    let active = true; let objectUrl: string | null = null;
    if (!imageId) { setUri(FOOD_IMAGE); return; }
    if (Platform.OS !== 'web') { setUri(`${API}/images/${imageId}`); return; }
    fetch(`${API}/images/${imageId}`, { headers: authHeaders() }).then(r => { if (!r.ok) throw new Error(); return r.blob(); }).then(blob => { objectUrl = URL.createObjectURL(blob); if (active) setUri(objectUrl); }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageId]);
  return <Image testID="meal-photo" source={{ uri, ...(Platform.OS !== 'web' && imageId ? { headers: authHeaders() } : {}) }} style={style} resizeMode="cover" />;
}
export default function MealCard({ meal, onPress }: { meal: Meal; onPress: () => void }) {
  const s = useStyles(); const { colors: c } = useTheme();
  return <Pressable testID={`meal-card-${meal.meal_id}`} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.card, pressed && s.pressed]}>
    <MealImage imageId={meal.image_id} style={s.image} />
    <View style={s.content}><Text style={s.overline}>{MEAL_TYPES[meal.meal_type]} · {new Date(meal.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text><Text numberOfLines={2} style={s.title}>{meal.name}</Text><View style={s.row}><Icon name="leaf-outline" size={13} color={c.onSurfaceTertiary} /><Text style={s.tag}>{TAGS[meal.tag]}</Text></View></View>
    <View style={[s.score, { backgroundColor: meal.score >= 80 ? c.mint : meal.score >= 50 ? c.peach : c.error }]}><Text style={s.scoreText}>{meal.score}</Text><Text style={s.scoreLabel}>PUAN</Text></View>
  </Pressable>;
}
const useStyles = makeStyles(c => ({ card: { flexDirection: 'row', backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 24, alignItems: 'center', gap: 12 }, pressed: { opacity: .75 }, image: { width: 72, height: 82, borderRadius: 16 }, content: { flex: 1, gap: 5 }, overline: { fontSize: 10, color: c.muted }, title: { fontSize: 14, fontWeight: '600', lineHeight: 19, color: c.onSurface }, row: { flexDirection: 'row', alignItems: 'center', gap: 4 }, tag: { fontSize: 11, color: c.onSurfaceTertiary }, score: { paddingHorizontal: 11, paddingVertical: 12, borderRadius: 18, alignItems: 'center' }, scoreText: { fontSize: 22, color: c.onSurface, fontWeight: '500' }, scoreLabel: { fontSize: 7, letterSpacing: 1, color: c.onSurfaceTertiary, marginTop: 3 } }));