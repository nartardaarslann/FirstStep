import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { makeStyles, useTheme } from '@/src/theme';
import { Icon, Button, Sheet, Field, Info, useTypography } from '@/src/components/ui';
import { api, FOOD_IMAGE } from '@/src/api';
import { useSession } from '@/src/session';

export default function Welcome() {
  const s = useStyles(); const t = useTypography(); const { colors: c } = useTheme();
  const { accept, google, error: authError } = useSession();
  const [mode, setMode] = useState<'register' | 'login' | null>(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    Keyboard.dismiss(); setError('');
    if (!email.trim() || !password || (mode === 'register' && (name.trim().length < 2 || password.length < 8))) { setError('Adını, geçerli bir e-posta ve en az 8 karakterli şifreni gir.'); return; }
    setBusy(true);
    try { await accept(await api(`/auth/${mode}`, 'POST', { email: email.trim(), password, ...(mode === 'register' ? { name: name.trim() } : {}) })); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const googleLogin = async () => { setBusy(true); try { await google(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.brand}><View style={s.brandIcon}><Icon name="leaf-outline" size={23} color={c.brandPrimary} /></View><Text testID="app-brand" style={s.logo}>ritim<Text style={s.dot}>.</Text></Text><Text style={s.brandNote}>İYİ YAŞAMIN DOĞASI</Text></View>
      <Animated.View entering={FadeInDown.duration(600)} style={s.hero}>
        <Image source={{ uri: FOOD_IMAGE }} style={s.heroImage} contentFit="cover" />
        <LinearGradient colors={[c.transparent, c.surfaceInverse]} style={s.gradient} />
        <View style={s.heroTop}><Icon name="leaf-outline" size={14} color={c.onSurfaceInverse} /><Text style={s.heroTopText}>DAHA DOĞAL. DAHA SEN.</Text></View>
        <View style={s.heroBottom}><Text style={s.heroQuote}>Küçük seçimler,{'\n'}iyi hissettiren bir yaşam.</Text><View style={s.orbit}><Icon name="arrow-forward" size={24} color={c.onSurfaceInverse} /></View></View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={s.intro}>
        <Text testID="welcome-title" style={s.title}>İyi hissetmenin{ '\n' }kendi ritmi var.</Text>
        <Text style={s.subtitle}>Kalori saymadan. Kendini yargılamadan.{ '\n' }Beslenme, uyku ve alışkanlıkların bir arada.</Text>
        <View style={s.pillRow}>{[['leaf-outline', 'Doğallık'], ['moon-outline', 'Uyku'], ['water-outline', 'Denge']].map(([icon, label]) => <View key={label} style={s.pill}><Icon name={icon as any} size={15} color={c.brandPrimary} /><Text style={s.pillText}>{label}</Text></View>)}</View>
      </Animated.View>
      <View style={s.actions}><Button testID="welcome-start-button" title="Ritmini bul" icon="arrow-forward" onPress={() => { setMode('register'); setError(''); }} /><Pressable testID="welcome-login-button" accessibilityRole="button" onPress={() => { setMode('login'); setError(''); }} style={s.loginLink}><Text style={s.loginText}>Zaten hesabım var <Text style={s.loginBold}>Giriş yap</Text></Text></Pressable></View>
      <Text style={s.footer}>Mükemmel olmak değil, iyi hissetmek için.</Text>
      {!!authError && <Info text={authError} error />}
    </ScrollView>
    {mode && <Sheet title={mode === 'register' ? 'Kendin için bir başlangıç.' : 'Yeniden hoş geldin.'} onClose={() => setMode(null)} testID="auth-sheet">
      <Text style={t.body}>{mode === 'register' ? 'Sana ait bir ritim, küçük bir adımla başlar.' : 'Kaldığın yerden, kendi hızında devam et.'}</Text>
      {mode === 'register' && <Field testID="auth-name-input" label="Adın" placeholder="Sana nasıl seslenelim?" value={name} onChangeText={setName} autoComplete="given-name" />}
      <Field testID="auth-email-input" label="E-posta" placeholder="sen@ornek.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field testID="auth-password-input" label="Şifre" placeholder="En az 8 karakter" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onSubmitEditing={submit} />
      <Info text={error} error />
      <Button testID="auth-submit-button" title={mode === 'register' ? 'Hesabımı oluştur' : 'Giriş yap'} onPress={submit} loading={busy} />
      <Button testID="google-login-button" title="Google ile devam et" icon="logo-google" onPress={googleLogin} secondary disabled={busy} />
      <Text style={t.small}>Sağlık kayıtların yalnızca hesabında tutulur. Bu uygulama tıbbi tanı veya tedavi sunmaz.</Text>
    </Sheet>}
  </SafeAreaView>;
}
const useStyles = makeStyles(c => ({
  screen: { flex: 1, backgroundColor: c.surface }, content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 23, gap: 8 }, brandIcon: { width: 36, height: 36, backgroundColor: c.mint, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 34, fontWeight: '600', letterSpacing: -2, color: c.onSurface }, dot: { color: c.success }, brandNote: { fontSize: 8, letterSpacing: 1.6, color: c.muted, marginLeft: 'auto' },
  hero: { height: 278, borderRadius: 30, overflow: 'hidden', backgroundColor: c.mint }, heroImage: { width: '100%', height: '100%' }, gradient: { position: 'absolute', top: '35%', bottom: 0, left: 0, right: 0, opacity: .8 },
  heroTop: { position: 'absolute', top: 18, left: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: c.overlay, flexDirection: 'row', gap: 6, alignItems: 'center' }, heroTopText: { color: c.onSurfaceInverse, fontSize: 8, letterSpacing: 1.2, fontWeight: '500' },
  heroBottom: { position: 'absolute', bottom: 22, left: 22, right: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, heroQuote: { color: c.onSurfaceInverse, fontSize: 20, lineHeight: 27, fontWeight: '500', letterSpacing: -.4 }, orbit: { width: 38, height: 38, borderWidth: 1, borderColor: c.onSurfaceInverse, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  intro: { paddingTop: 26, gap: 13 }, title: { fontSize: 36, lineHeight: 41, color: c.onSurface, letterSpacing: -1.8, fontWeight: '500' }, subtitle: { fontSize: 14, lineHeight: 22, color: c.onSurfaceTertiary },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4 }, pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: c.border, paddingVertical: 9, paddingHorizontal: 12 }, pillText: { color: c.onSurfaceTertiary, fontSize: 11 },
  actions: { marginTop: 25, gap: 3 }, loginLink: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, loginText: { color: c.muted, fontSize: 12 }, loginBold: { fontWeight: '600', color: c.brandPrimary }, footer: { color: c.muted, textAlign: 'center', fontSize: 10, marginTop: 5 },
}));