/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const brandRed = '#E30613';
const brandDark = '#1F1F21';
const lightBackground = '#F8F6F6';
const darkBackground = '#0F1216';

export const Colors = {
  brand: brandRed,
  brandDark,
  light: {
    text:          '#11181C',
    textBody:      '#1F1F21',
    textSecondary: '#4b5563',
    textMuted:     '#6b7280',
    textFaint:     '#9ca3af',
    background:    lightBackground,
    card:          '#ffffff',
    separator:     '#f3f4f6',
    border:        '#e5e7eb',
    subtleBg:      '#f9fafb',
    tint:          brandRed,
    icon:          '#687076',
    tabIconDefault:  '#687076',
    tabIconSelected: brandRed,
  },
  dark: {
    text:          '#ECEDEE',
    textBody:      '#E8E8EC',
    textSecondary: '#a0a8b4',
    textMuted:     '#8a8fa8',
    textFaint:     '#5a6070',
    background:    darkBackground,
    card:          '#1c1f24',
    separator:     '#252830',
    border:        '#2e3138',
    subtleBg:      '#1a1d22',
    tint:          '#ffffff',
    icon:          '#9BA1A6',
    tabIconDefault:  '#9BA1A6',
    tabIconSelected: '#ffffff',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
