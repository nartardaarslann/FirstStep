import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '@/src/session';
import { useTheme, makeStyles } from '@/src/theme';
import Welcome from '@/src/screens/Welcome';
import Onboarding from '@/src/screens/Onboarding';
import AppShell from '@/src/screens/AppShell';

export default function Index() {
  const { user, loading } = useSession(); const { colors, scheme } = useTheme(); const s = useStyles();
  return <View style={s.root}><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />{loading ? <View style={s.loading}><ActivityIndicator testID="session-loading" size="large" color={colors.brandPrimary} /></View> : !user ? <Welcome /> : !user.onboarding ? <Onboarding /> : <AppShell />}</View>;
}
const useStyles = makeStyles(c => ({ root: { flex: 1, backgroundColor: c.surface }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' } }));