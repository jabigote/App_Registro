import { useNavigationState } from '@react-navigation/native';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

const brandMark = require('../assets/images/salvagnini-mark.png');
const brandLogo = require('../assets/images/salvagnini-logo.webp');
const TAB_PATHS = new Set(['/', '/registros', '/registro-mensual', '/ajustes']);

const ROUTE_LABELS: Record<string, string> = {
  index: 'Inicio',
  registros: 'Registros',
  nuevo: 'Nueva jornada',
  ausencias: 'Ausencias',
  'registro-mensual': 'Mensual',
  'registro-detalle': 'Jornada',
  'historial-versiones': 'Versiones',
  ajustes: 'Ajustes',
};

export function BrandLogo({ screenTitle }: { screenTitle?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const previousLabel = useNavigationState((state) => {
    if (!state?.routes || state.routes.length < 2) return null;
    const previous = state.routes[state.routes.length - 2];
    return ROUTE_LABELS[previous?.name ?? ''] ?? 'Atrás';
  });
  const canGoBack = !TAB_PATHS.has(pathname) && previousLabel !== null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {canGoBack ? (
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={`Volver a ${previousLabel}`}
            hitSlop={10}
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backLabel} numberOfLines={1}>{previousLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.iconButton} accessibilityElementsHidden>
            {!markFailed ? (
              <Image source={brandMark} style={styles.icon} contentFit="contain" onError={() => setMarkFailed(true)} />
            ) : (
              <Text style={styles.iconFallback}>S</Text>
            )}
          </View>
        )}

        {!logoFailed ? (
          <Image source={brandLogo} style={styles.logoImage} contentFit="cover" onError={() => setLogoFailed(true)} />
        ) : (
          <Text style={styles.brandName}>SALVAGNINI</Text>
        )}
      </View>
      {screenTitle ? <Text style={styles.screenTitle}>{screenTitle}</Text> : null}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { position: 'relative' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconButton: {
      width: 48, height: 48, borderRadius: 15, backgroundColor: Colors.brand,
      justifyContent: 'center', alignItems: 'center',
    },
    icon: { width: 26, height: 26 },
    iconFallback: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    backButton: {
      minWidth: 72, minHeight: 48, flexDirection: 'row', alignItems: 'center',
      gap: 1, paddingRight: 6,
    },
    backChevron: { fontSize: 30, color: Colors.brand, fontWeight: '300', lineHeight: 36 },
    backLabel: { fontSize: 16, fontWeight: '600', color: Colors.brand, maxWidth: 94 },
    logoImage: { flex: 1, height: 52, borderRadius: 10 },
    brandName: { flex: 1, fontSize: 36, fontWeight: '900', color: Colors.brand, letterSpacing: 1 },
    screenTitle: {
      fontSize: 22, fontWeight: '800', color: C.text,
      textAlign: 'center', marginTop: 10,
    },
  });
}
