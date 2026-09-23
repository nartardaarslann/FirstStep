import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '@/src/components/error-boundary';
import { queryClient } from '@/src/query-client';
import { SessionProvider } from '@/src/session';

export default function RootLayout() {
  // Prewarm icon assets before rendering, including Expo Go Android.
  const [loaded, error] = useFonts(Ionicons.font);
  if (!loaded && !error) return null;
  return <ErrorBoundary><SafeAreaProvider><QueryClientProvider client={queryClient}><KeyboardProvider><SessionProvider><Stack screenOptions={{ headerShown: false }} /></SessionProvider></KeyboardProvider></QueryClientProvider></SafeAreaProvider></ErrorBoundary>;
}