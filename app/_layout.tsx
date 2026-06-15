import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { AppSettingsProvider } from '@/contexts/app-settings-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { RegistroProvider } from '@/contexts/registro-context';
import { ThemePreferenceProvider, useThemePreference } from '@/contexts/theme-context';

function AuthGuard() {
  const { usuario, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!usuario && !inLogin) {
      router.replace('/login');
    } else if (usuario && inLogin) {
      router.replace('/');
    }
  }, [usuario, loading, router, segments]);

  return null;
}

function AppContent() {
  const { effectiveScheme } = useThemePreference();

  return (
    <ThemeProvider value={effectiveScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppSettingsProvider>
          <RegistroProvider>
            <AuthGuard />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors[effectiveScheme].background },
              }}
            />
          </RegistroProvider>
        </AppSettingsProvider>
      </AuthProvider>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <AppContent />
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
