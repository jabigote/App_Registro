import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-context';

export type ThemeColors = typeof Colors.light;

export function useTheme(): ThemeColors {
  const { effectiveScheme } = useThemePreference();
  return Colors[effectiveScheme];
}
