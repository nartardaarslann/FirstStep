import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { makeStyles, useTheme } from '@/src/theme';
import { Button, Icon, IconButton, Info, useTypography, IconName } from '@/src/components/ui';
import { useSession } from '@/src/session';
import { api } from '@/src/api';
import { storage } from '@/src/utils/storage';

const STEPS: { key: string; icon: IconName; title: string; subtitle: string; choices: [string, string, string][] }[] = [
  { key: 'energy', icon: 'sunny-outline', title: 'Gün içinde\nnasıl hissediyorsun?', subtitle: 'Bir sayıdan çok daha fazlasısın. Enerjinden başlayalım.', choices: [['low', 'Biraz yorgun', 'Güne başlamak bazen zor geliyor.'], ['variable', 'İnişli çıkışlı', 'Enerjim gün içinde değişiyor.'], ['high', 'Genelde enerjik', 'Bu iyi hissi sürdürmek istiyorum.']] },
  { key: 'goal', icon: 'leaf-outline', title: 'Kendin için\nneye alan açalım?', subtitle: 'Mükemmel bir hedefe değil, sana iyi gelen bir yöne ihtiyacımız var.', choices: [['balance', 'Daha dengeli beslenmek', 'Yediklerimle iyi bir ilişki kurmak.'], ['energy', 'Daha iyi hissetmek', 'Günlük enerjime destek olmak.'], ['sleep', 'Daha dinlendirici uyku', 'Bedenimin ritmini bulmak.']] },
  { key: 'prep_time', icon: 'time-outline', title: 'Mutfakta\nne kadar zamanın var?', subtitle: 'Alışkanlıkların hayatına uyum sağlasın, tersi değil.', choices: [['quick', 'Hızlı ve pratik', '15 dakikadan az.'], ['medium', 'Biraz zaman ayırabilirim', '15–30 dakika.'], ['slow', 'Yemek yapmayı seviyorum', '30 dakika veya daha fazla.']] },
  { key: 'stress_eating', icon: 'heart-outline', title: 'Stresli bir günde\nyemekle ilişkin nasıl?', subtitle: 'Burada doğru veya yanlış cevap yok. Sadece seni tanıyoruz.', choices: [['often', 'Yemek bana iyi geliyor', 'Sık sık yiyeceklere yöneliyorum.'], ['sometimes', 'Bazen değişiyor', 'Günüme ve hislerime bağlı.'], ['rarely', 'Pek değişmiyor', 'Genelde aynı düzeni koruyorum.']] },
];
export default function Onboarding() {
  const s = useStyles(); const t = useTypography(); const { colors: c } = useTheme(); const { setUser } = useSession();
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const finish = async (camera: boolean) => { setBusy(true); try { const user = await api('/auth/onboarding', 'PUT', answers); await storage.setItem('ritim-first-camera', camera); setUser(user); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };
  const current = STEPS[step];
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <View style={s.header}><IconButton icon="arrow-back" onPress={() => setStep(Math.max(0, step - 1))} testID="onboarding-back-button" /><Text style={s.wordmark}>ritim.</Text><Text style={t.small}>{Math.min(step + 1, 4)} / 4</Text></View>
    <View style={s.progress}>{STEPS.map((_, i) => <View key={i} style={[s.segment, i <= step && s.active]} />)}</View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Animated.View key={step} entering={FadeInDown.duration(350)} style={s.inner}>
        <View style={s.symbol}><Icon name={current?.icon || 'camera-outline'} size={38} color={c.brandPrimary} /></View>
        <Text style={t.eyebrow}>{step < 4 ? 'BİRAZ SENİ TANIYALIM' : 'ŞİMDİ KÜÇÜK BİR KEŞİF'}</Text>
        <Text testID="onboarding-title" style={t.title}>{current?.title || 'Bir fotoğraf.\nYeni bir bakış.'}</Text>
        <Text style={t.body}>{current?.subtitle || 'Yemeğinin doğallığını keşfet. Bir fotoğraf ekle, nerede hazırlandığını seç ve farkı gör.'}</Text>
        {current ? <View style={s.choices}>{current.choices.map(([key, title, subtitle]) => <Pressable testID={`onboarding-option-${key}`} key={key} onPress={() => setAnswers({ ...answers, [current.key]: key })} style={({ pressed }) => [s.choice, answers[current.key] === key && s.selected, pressed && s.pressed]}><View style={t.flex}><Text style={t.h3}>{title}</Text><Text style={[t.small, s.choiceSub]}>{subtitle}</Text></View><View style={[s.radio, answers[current.key] === key && s.radioSelected]}>{answers[current.key] === key && <Icon name="checkmark" size={14} color={c.onBrandPrimary} />}</View></Pressable>)}</View> : <View style={s.aha}><Icon name="sparkles-outline" size={28} color={c.brandPrimary} /><Text style={t.h3}>Kaloriden öte, doğallık.</Text><Text style={t.body}>Aynı öğün, farklı kaynak. Ev yapımı mı, restoran mı, paketli mi? Senin bilgin puanı tamamlar.</Text><Info text="Prototipte fotoğraf tanıma örnek sonuçlarla çalışır. Gerçek besin analizi değildir." /></View>}
      </Animated.View>
    </ScrollView>
    <View style={s.bottom}><Info text={error} error />{step < 4 ? <Button title="Devam et" testID="onboarding-next-button" onPress={() => setStep(step + 1)} disabled={!answers[current.key]} icon="arrow-forward" /> : <><Button title="İlk öğünümü keşfet" testID="onboarding-camera-button" onPress={() => finish(true)} loading={busy} icon="camera-outline" /><Button title="Önce günümü göreyim" testID="onboarding-skip-button" onPress={() => finish(false)} secondary disabled={busy} /></>}<Text style={s.footer}>Senin hızında. Senin ritminde.</Text></View>
  </SafeAreaView>;
}
const useStyles = makeStyles(c => ({ screen: { flex: 1, backgroundColor: c.surface }, header: { paddingHorizontal: 24, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, wordmark: { color: c.onSurface, fontSize: 25, fontWeight: '600', letterSpacing: -1.5 }, progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingTop: 25, paddingBottom: 10 }, segment: { flex: 1, height: 4, backgroundColor: c.border, borderRadius: 4 }, active: { backgroundColor: c.brandPrimary }, content: { padding: 24, paddingTop: 24, maxWidth: 600, width: '100%', alignSelf: 'center' }, inner: { gap: 17 }, symbol: { width: 80, height: 80, borderRadius: 30, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, choices: { gap: 12, marginTop: 10 }, choice: { padding: 20, borderRadius: 24, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 89 }, selected: { borderColor: c.brandPrimary, backgroundColor: c.mint }, pressed: { opacity: .75 }, choiceSub: { marginTop: 5 }, radio: { width: 22, height: 22, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' }, radioSelected: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary }, bottom: { paddingHorizontal: 24, paddingBottom: 14, gap: 10 }, footer: { color: c.muted, textAlign: 'center', fontSize: 11, marginTop: 3 }, aha: { backgroundColor: c.mint, borderRadius: 26, padding: 22, gap: 15 } }));