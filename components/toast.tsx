import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ToastEntry = {
  message: string;
  type: 'success' | 'error';
  key: number;
  actionLabel?: string;
  onAction?: () => void;
};

export function useToast() {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const counter = useRef(0);

  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' = 'success',
    action?: { label: string; onPress: () => void },
  ) => {
    counter.current += 1;
    setToast({ message, type, key: counter.current, actionLabel: action?.label, onAction: action?.onPress });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}

type ToastProps = {
  toast: ToastEntry | null;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    seq.start(({ finished }) => { if (finished) onDismiss(); });
    return () => seq.stop();
  }, [toast, onDismiss, opacity]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        isDark && styles.containerDark,
        toast.type === 'error' && styles.containerError,
        { opacity },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Text style={styles.text}>{toast.message}</Text>
        {toast.actionLabel && toast.onAction ? (
          <Pressable onPress={() => { toast.onAction?.(); onDismiss(); }} accessibilityRole="button">
            <Text style={styles.action}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: Colors.brandDark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  // En dark mode, el fondo claro (#1F1F21 sobre #0F1216) tiene poco contraste;
  // un gris azulado más elevado da separación visual clara sin romper el estilo.
  containerDark: { backgroundColor: '#2e3446' },
  containerError: { backgroundColor: '#dc2626' },
  text: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  action: { color: '#ffffff', fontSize: 14, fontWeight: '900', textDecorationLine: 'underline' },
});
