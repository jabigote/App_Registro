import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemeColors = typeof Colors.light;

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return Colors[scheme ?? 'light'];
}
