import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { makeStyles, useTheme } from '@/src/theme';
import { useApp } from '@/src/app-context';
import { Icon, Card, Info, useTypography } from '@/src/components/ui';
import ScoreRing from '@/src/components/ScoreRing';
import MealCard, { MealImage } from '@/src/components/MealCard';

export default function Today() {
  const s = useStyles(); const t = useTypography(); const { colors: c } = useTheme();
  const { data, refresh, refreshing, error, setTab, setPanel, inspectMeal } = useApp();
  if (!data) return null;
  const { log, meals } = data;
  const nutrition = meals.length ? Math.round(meals.reduce((a, m) => a + m.score, 0) / meals.length) : null;
  return <ScrollView testID="today-scroll" showsVerticalScrollIndicator={false} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brandPrimary} />}>
    {!!error && <Info text={error} error />}
    <Animated.View entering={FadeInDown.duration(500)}>
      <View testID="daily-score-card" style={s.hero}>
        <LinearGradient colors={[c.mint, c.brandTertiary]} style={s.heroGradient} />
        <View style={t.between}><View style={t.row}><View style={s.liveDot} /><Text style={s.heroLabel}>GÜNLÜK DENGEN</Text></View><Pressable testID="score-method-button" onPress={() => setPanel('method')} accessibilityLabel="Puan nasıl hesaplanır?" style={s.infoButton}><Icon name="information-circle-outline" size={20} color={c.onSurfaceTertiary} /></Pressable></View>
        <View style={s.ringRow}><ScoreRing score={log.overall_score} /><View style={s.heroCopy}><Icon name={log.recovery_mode ? 'moon-outline' : 'leaf-outline'} size={27} color={c.brandPrimary} /><Text style={s.heroTitle}>{log.recovery_mode ? 'Dinlenmek de\nbir adım.' : log.overall_score === null ? 'Her güzel ritim,\nbir adımla başlar.' : log.overall_score >= 80 ? 'Kendi ritminde,\nçok iyi gidiyorsun.' : 'Küçük adımlar,\ngüzel bir denge.'}</Text><Text style={s.heroSubtitle}>{log.overall_score === null ? 'İlk kaydınla dengeni\nkeşfetmeye başla.' : 'Mükemmel olmak değil,\ndevam etmek önemli.'}</Text></View></View>
        <View style={s.heroFooter}><Icon name="sparkles-outline" size={13} color={c.brandPrimary} /><Text style={s.heroFooterText}>Bedenini dinle. Kendine iyi davran.</Text></View>
      </View>
    </Animated.View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.metrics} style={s.metricScroller}>
      <Pressable testID="metric-nutrition" onPress={() => setTab('meals')} style={({ pressed }) => [s.metric, { backgroundColor: c.peach }, pressed && s.pressed]}><View style={t.between}><Icon name="leaf-outline" size={18} /><Icon name="arrow-up-outline" size={13} /></View><Text style={s.metricValue}>{nutrition ?? '—'}<Text style={s.metricUnit}> /100</Text></Text><Text style={s.metricLabel}>Beslenme</Text></Pressable>
      <Pressable testID="metric-sleep" onPress={() => setPanel('sleep')} style={({ pressed }) => [s.metric, { backgroundColor: c.lavender }, pressed && s.pressed]}><View style={t.between}><Icon name="moon-outline" size={18} /><Icon name="add" size={15} /></View><Text style={s.metricValue}>{log.sleep === null ? '—' : log.sleep.toLocaleString('tr-TR')}<Text style={s.metricUnit}> saat</Text></Text><Text style={s.metricLabel}>Uyku</Text></Pressable>
      <Pressable testID="metric-water" onPress={() => setTab('habits')} style={({ pressed }) => [s.metric, { backgroundColor: c.water }, pressed && s.pressed]}><View style={t.between}><Icon name="water-outline" size={18} /><Icon name="add" size={15} /></View><Text style={s.metricValue}>{log.water}<Text style={s.metricUnit}> /8</Text></Text><Text style={s.metricLabel}>Su dengesi</Text></Pressable>
    </ScrollView>
    <Animated.View entering={FadeInDown.delay(120).duration(500)}>
      <Pressable testID="photo-prompt-button" accessibilityRole="button" onPress={() => setPanel('capture')} style={({ pressed }) => [s.photoCard, pressed && s.pressed]}>
        <View style={s.photoCopy}><Text style={t.eyebrow}>BİR FOTOĞRAFLA BAŞLA</Text><Text style={s.photoTitle}>Tabağında{ '\n' }ne kadar doğa var?</Text><View style={s.photoLink}><Text style={s.photoLinkText}>Öğününü keşfet</Text><Icon name="arrow-forward" size={16} color={c.brandPrimary} /></View></View>
        <View style={s.photoImageWrap}><MealImage style={s.photoImage} /></View><View style={s.cameraBadge}><Icon name="camera-outline" size={20} color={c.onBrandPrimary} /></View>
      </Pressable>
    </Animated.View>
    <View style={s.section}><View style={t.between}><Text style={t.h2}>Bugünün öğünleri</Text><Pressable testID="all-meals-button" onPress={() => setTab('meals')} style={s.textButton}><Text style={s.link}>Tümü</Text><Icon name="arrow-forward" size={15} color={c.brandPrimary} /></Pressable></View>
      {meals.length ? meals.slice(0, 2).map(m => <MealCard key={m.meal_id} meal={m} onPress={() => inspectMeal(m)} />) : <Pressable testID="empty-meals-add-button" onPress={() => setPanel('capture')} style={({ pressed }) => [s.empty, pressed && s.pressed]}><View style={s.emptyIcon}><Icon name="restaurant-outline" size={20} color={c.brandPrimary} /></View><View style={t.flex}><Text style={s.emptyTitle}>Günlüğünde sana yer var.</Text><Text style={t.small}>İlk öğününü ekle, doğallığını keşfet.</Text></View><Icon name="add" size={20} /></Pressable>}
    </View>
    <Pressable testID="insights-open-button" onPress={() => setPanel('insights')} style={({ pressed }) => [pressed && s.pressed]}><Card style={s.insight}><View style={t.row}><View style={s.insightIcon}><Icon name="sparkles-outline" size={18} color={c.onInfo} /></View><Text style={[t.h3, t.flex]}>Bedeninin küçük ipuçları</Text><Text style={s.pro}>PRO</Text></View><Text style={t.body}>{data.insight?.message || 'Uykun, beslenmen ve hislerin arasındaki bağlantıları keşfet.'}</Text><Text style={t.small}>Bilgilendirici korelasyonlar; tıbbi tavsiye değildir.</Text></Card></Pressable>
    <Text style={s.endnote}>İyi yaşam, kendine dönmekle başlar.</Text>
  </ScrollView>;
}
const useStyles = makeStyles(c => ({
  content: { paddingHorizontal: 24, paddingTop: 3, paddingBottom: 28, gap: 20, maxWidth: 680, width: '100%', alignSelf: 'center' }, hero: { borderRadius: 28, overflow: 'hidden', padding: 18, paddingBottom: 16 }, heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.brandPrimary }, heroLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.6, color: c.onSurfaceTertiary }, infoButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, ringRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -11, marginTop: -4, gap: 1 }, heroCopy: { flex: 1, gap: 10, paddingBottom: 8, paddingRight: 0 }, heroTitle: { fontSize: 17, lineHeight: 23, fontWeight: '500', color: c.onSurface, letterSpacing: -.6 }, heroSubtitle: { fontSize: 10, lineHeight: 17, color: c.onSurfaceTertiary }, heroFooter: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: 10, borderTopWidth: 1, borderColor: c.borderStrong }, heroFooterText: { color: c.onSurfaceTertiary, fontSize: 10 },
  metrics: { gap: 10 }, metricScroller: { marginTop: -6 }, metric: { width: 111, borderRadius: 23, padding: 14, gap: 9 }, metricValue: { fontSize: 26, fontWeight: '500', color: c.onSurface, letterSpacing: -.8 }, metricUnit: { fontSize: 11, color: c.onSurfaceTertiary, letterSpacing: 0 }, metricLabel: { fontSize: 11, color: c.onSurfaceTertiary },
  photoCard: { height: 161, borderRadius: 26, backgroundColor: c.surfaceSecondary, overflow: 'hidden', borderWidth: 1, borderColor: c.border, flexDirection: 'row' }, photoCopy: { flex: 1, padding: 19, paddingRight: 0, gap: 10 }, photoTitle: { color: c.onSurface, fontSize: 21, lineHeight: 25, fontWeight: '500', letterSpacing: -.7 }, photoLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }, photoLinkText: { fontSize: 11, color: c.brandPrimary, fontWeight: '600' }, photoImageWrap: { width: 125, height: 161, flexShrink: 0, overflow: 'hidden', borderTopLeftRadius: 80, borderBottomLeftRadius: 80 }, photoImage: { width: 125, height: 161 }, cameraBadge: { width: 37, height: 37, borderRadius: 22, backgroundColor: c.brandPrimary, position: 'absolute', bottom: 12, right: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.surfaceSecondary },
  section: { gap: 12 }, textButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 }, link: { fontSize: 11, color: c.brandPrimary }, empty: { flexDirection: 'row', gap: 12, padding: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, borderRadius: 22, alignItems: 'center' }, emptyIcon: { height: 39, width: 39, borderRadius: 15, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 13, color: c.onSurface, fontWeight: '500', marginBottom: 3 }, insight: { backgroundColor: c.lavender, borderColor: c.transparent }, insightIcon: { backgroundColor: c.info, borderRadius: 15, width: 35, height: 35, alignItems: 'center', justifyContent: 'center' }, pro: { fontSize: 8, color: c.onInfo, letterSpacing: 1.4, fontWeight: '700' }, endnote: { textAlign: 'center', color: c.muted, fontSize: 10, paddingTop: 3 }, pressed: { opacity: .75 },
}));