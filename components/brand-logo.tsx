import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

const brandMark = require('../assets/images/salvagnini-mark.png');
const brandLogo = require('../assets/images/salvagnini-logo.webp');

export function BrandLogo() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() =>
      setMenuVisible(false)
    );
  };

  const toggleMenu = () => (menuVisible ? closeMenu() : openMenu());

  const handleNavigate = (path: '/' | '/nuevo' | '/registros' | '/registro-mensual' | '/ajustes') => {
    closeMenu();
    router.push(path);
  };

  return (
    <View style={styles.container}>
      {/* Logo SALVAGNINI a toda la anchura. El webp original (1280×720) tiene el wordmark
          en una banda central: cover recorta el blanco vertical y lo muestra grande. */}
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

      {/* Fila inferior: icono S como botón de menú */}
      <View style={styles.navRow}>
        <Pressable style={styles.iconButton} onPress={toggleMenu}>
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
      </View>

      {/* Menú desplegable: solo navegación */}
      {menuVisible && (
        <Animated.View
          style={[
            styles.menu,
            {
              opacity: menuAnim,
              transform: [
                {
                  scale: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/')}>
            <Text style={styles.menuItemText}>Inicio</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/nuevo')}>
            <Text style={styles.menuItemText}>Nueva jornada</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/registros')}>
            <Text style={styles.menuItemText}>Registros</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/registro-mensual')}>
            <Text style={styles.menuItemText}>Registro mensual</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/ajustes')}>
            <Text style={styles.menuItemText}>Ajustes</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { gap: 10, position: 'relative' },
    logoImage: { width: '100%', height: 64, borderRadius: 12 },
    brandName: { fontSize: 44, fontWeight: '900', color: Colors.brand, letterSpacing: 1, textAlign: 'center' },
    navRow: { flexDirection: 'row', alignItems: 'center' },
    iconButton: {
      width: 48, height: 48, borderRadius: 15,
      backgroundColor: Colors.brand,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    icon: { width: 26, height: 26 },
    iconFallback: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    menu: {
      position: 'absolute', top: '100%', left: 0, zIndex: 10, width: 210, marginTop: 6,
      backgroundColor: C.card, borderRadius: 18,
      paddingVertical: 10, paddingHorizontal: 14,
      shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 }, elevation: 6,
    },
    menuItem: { paddingVertical: 13 },
    menuItemText: { fontSize: 15, color: C.text, fontWeight: '700' },
  });
}
