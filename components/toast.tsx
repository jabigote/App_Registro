import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';

type ToastEntry = { message: string; type: 'success' | 'error'; key: number };

export function useToast() {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    counter.current += 1;
    setToast({ message, type, key: counter.current });
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
  }, [toast?.key, onDismiss, opacity]);

  if (!toast) return null;

  return (
    <Animated.View style={[styles.container, toast.type === 'error' && styles.containerError, { opacity }]}>
      <Text style={styles.text}>{toast.message}</Text>
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
  containerError: { backgroundColor: '#dc2626' },
  text: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
