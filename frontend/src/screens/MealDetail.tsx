import { useState } from 'react';
import { View, Text } from 'react-native';
import { makeStyles } from '@/src/theme';
import { useApp } from '@/src/app-context';
import { Meal } from '@/src/types';
import { api } from '@/src/api';
import { Sheet, Badge, Button, Info, useTypography } from '@/src/components/ui';
import { MealImage, TAGS, MEAL_TYPES } from '@/src/components/MealCard';

export const MACRO_LABELS: Record<string, string> = { protein: 'Protein', carbs: 'Karbonhidrat', fat: 'Yağ', fiber: 'Lif', sugar: 'Şeker' };
export default function MealDetail({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const s = useStyles(); const t = useTypography(); const { refresh, notify } = useApp(); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const remove = async () => { setBusy(true); try { await api(`/meals/${meal.meal_id}`, 'DELETE'); await refresh(); onClose(); notify('Öğün günlüğünden kaldırıldı.'); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };
  return <Sheet title="Öğününün hikâyesi" testID="meal-detail-sheet" onClose={onClose}>
    <MealImage imageId={meal.image_id} style={s.image} /><View style={t.between}><Badge text={TAGS[meal.tag]} /><Text style={t.small}>{MEAL_TYPES[meal.meal_type]} · {new Date(meal.timestamp).toLocaleDateString('tr-TR')}</Text></View>
    <Text testID="meal-detail-name" style={t.h2}>{meal.name}</Text><Text style={t.body}>{meal.items.join(' · ')}</Text>
    <View style={s.scoreBox}><View><Text style={t.eyebrow}>ÖĞÜN DENGESİ</Text><Text testID="meal-final-score" style={s.score}>{meal.score}<Text style={s.scoreUnit}> / 100</Text></Text></View><View style={s.breakdown}><Text style={s.formula}>%60 × {meal.fni} FNI</Text><Text style={s.formula}>%40 × {meal.macro_balance} denge</Text><Text style={t.small}>İki katman, tek bakış.</Text></View></View>
    <Text style={t.h3}>Tahmini besin dağılımı</Text><View style={s.macros}>{Object.entries(meal.macros).map(([key, value]) => <View key={key} style={s.macro}><Text style={t.body}>{MACRO_LABELS[key]}</Text><Text style={t.h3}>{value} <Text style={t.small}>g</Text></Text></View>)}</View>
    <Info text="Bu öğünün tanıma ve besin değerleri simüle edilmiştir. Fotoğraf analizi, porsiyon ölçümü veya canlı USDA verisi değildir. Kaynak etiketi tek başına sağlık etkisini belirlemez." />
    <Info text={error} error />
    {confirm ? <><Text style={t.body}>Bu öğünü günlüğünden kaldırmak istiyor musun? Günlük puanın yeniden hesaplanacak.</Text><Button testID="meal-delete-confirm-button" title="Evet, öğünü kaldır" onPress={remove} loading={busy} /><Button testID="meal-delete-cancel-button" title="Vazgeç" secondary onPress={() => setConfirm(false)} /></> : <Button testID="meal-delete-button" title="Öğünü kaldır" icon="trash-outline" onPress={() => setConfirm(true)} secondary />}
  </Sheet>;
}
const useStyles = makeStyles(c => ({ image: { height: 170, width: '100%', borderRadius: 24 }, scoreBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.mint, borderRadius: 25, padding: 20 }, score: { fontSize: 48, color: c.onSurface, letterSpacing: -2, marginTop: 5 }, scoreUnit: { fontSize: 13, letterSpacing: 0, color: c.muted }, breakdown: { gap: 7 }, formula: { fontSize: 12, color: c.brandPrimary }, macros: { gap: 2 }, macro: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border } }));