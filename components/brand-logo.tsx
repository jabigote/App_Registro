import { useNavigationState } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

const brandMark = require('../assets/images/salvagnini-mark.png');
const brandLogo  = require('../assets/images/salvagnini-logo.webp');

const ROUTE_LABELS: Record<string, string> = {
  index:              'Inicio',
  registros:          'Registros',
  nuevo:              'Nueva jornada',
  'registro-mensual': 'Mensual',
  'registro-detalle': 'Jornada',
  'historial-versiones': 'Versiones',
  ajustes:            'Ajustes',
};

interface BrandLogoProps {
  /** Título de pantalla que aparece centrado bajo el banner, fijo en el encabezado. */
  screenTitle?: string;
}

export function BrandLogo({ screenTitle }: BrandLogoProps) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoFailed, setLogoFailed]   = useState(false);
  const [markFailed, setMarkFailed]   = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  // Ruta previa en la pila: si existe, el componente muestra botón de atrás estilo iOS.
  const previousLabel = useNavigationState((state) => {
    if (!state?.routes || state.routes.length < 2) return null;
    const prev = state.routes[state.routes.length - 2];
    return ROUTE_LABELS[prev?.name ?? ''] ?? null;
  });

  const canGoBack = !!previousLabel;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(
      () => setMenuVisible(false),
    );
  };

  const handleNavigate = (path: '/' | '/nuevo' | '/registros' | '/registro-mensual' | '/ajustes') => {
    closeMenu();
    router.replace(path);
  };

  return (
    <View style={styles.container}>
      {/* ── Fila principal: botón izquierda + logo ── */}
      <View style={styles.row}>
        {canGoBack ? (
          /* Botón atrás estilo iOS: ‹ NombrePantalla */
          <Pressable
            style={styles.backButton}
            onPress={() => { closeMenu(); router.back(); }}
            accessibilityRole="button"
            accessibilityLabel={`Volver a ${previousLabel}`}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 12 }}
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backLabel} numberOfLines={1}>{previousLabel}</Text>
          </Pressable>
        ) : (
          /* Botón S — menú de navegación (solo en pantalla raíz) */
          <Pressable
            style={styles.iconButton}
            onPress={() => (menuVisible ? closeMenu() : openMenu())}
            accessibilityRole="button"
            accessibilityLabel={menuVisible ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            accessibilityState={{ expanded: menuVisible }}
          >
            {!markFailed ? (
              <Image
                source={brandMark}
                style={styles.icon}
                contentFit="contain"
                onError={() => setMarkFailed(true)}
              />
            ) : (
              <Text style={styles.iconFallback}>S</Text>
            )}
          </Pressable>
        )}

        {/* Logo SALVAGNINI: ocupa todo el espacio restante.
            Cover recorta las bandas blancas superior/inferior del webp 1280×720. */}
        {!logoFailed ? (
          <Image
            source={brandLogo}
            style={styles.logoImage}
            contentFit="cover"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Text style={styles.brandName}>SALVAGNINI</Text>
        )}
      </View>

      {/* ── Título de sección — fijo, siempre visible, centrado ── */}
      {screenTitle ? <Text style={styles.screenTitle}>{screenTitle}</Text> : null}

      {/* ── Menú desplegable (solo pantalla raíz, cuando se muestra S) ── */}
      {menuVisible && (
        <Animated.View
          style={[
            styles.menu,
            {
              opacity: menuAnim,
              transform: [
                { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              ],
            },
          ]}
        >
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/')} accessibilityRole="button">
            <Text style={styles.menuItemText}>Inicio</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/nuevo')} accessibilityRole="button">
            <Text style={styles.menuItemText}>Nueva jornada</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/registros')} accessibilityRole="button">
            <Text style={styles.menuItemText}>Registros</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/registro-mensual')} accessibilityRole="button">
            <Text style={styles.menuItemText}>Registro mensual</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/ajustes')} accessibilityRole="button">
            <Text style={styles.menuItemText}>Ajustes</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { position: 'relative' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    // ── Botón S izquierda ──
    iconButton: {
      width: 48, height: 48, borderRadius: 15,
      backgroundColor: Colors.brand,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    icon: { width: 26, height: 26 },
    iconFallback: { fontSize: 20, fontWeight: '900', color: '#ffffff' },

    // ── Botón atrás iOS ──
    backButton: {
      flexDirection: 'row', alignItems: 'center', gap: 1,
      minWidth: 72, paddingVertical: 6, paddingRight: 6,
    },
    backChevron: { fontSize: 30, color: Colors.brand, fontWeight: '300', lineHeight: 36, marginTop: -3 },
    backLabel: { fontSize: 16, fontWeight: '600', color: Colors.brand, maxWidth: 94 },

    // ── Logo central ──
    logoImage: { flex: 1, height: 52, borderRadius: 10 },
    brandName: { flex: 1, fontSize: 36, fontWeight: '900', color: Colors.brand, letterSpacing: 1 },

    // ── Título de sección ──
    screenTitle: {
      fontSize: 22, fontWeight: '800', color: C.text,
      textAlign: 'center', marginTop: 10,
    },

    // ── Menú desplegable ──
    menu: {
      position: 'absolute', top: 60, left: 0, zIndex: 100, width: 210,
      backgroundColor: C.card, borderRadius: 18,
      paddingVertical: 10, paddingHorizontal: 14,
      shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 }, elevation: 8,
    },
    menuItem: { paddingVertical: 13 },
    menuItemText: { fontSize: 15, color: C.text, fontWeight: '700' },
  });
}
