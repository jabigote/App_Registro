import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = '@salvagnini_theme';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
  effectiveScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: async () => {},
  effectiveScheme: 'light',
});

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = async (p: ThemePreference) => {
    setPreferenceState(p);
    await AsyncStorage.setItem(KEY, p).catch(() => {});
  };

  const effectiveScheme: 'light' | 'dark' =
    preference === 'system' ? systemScheme : preference;

  return (
    <ThemeContext.Provider value={{ preference, setPreference, effectiveScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
