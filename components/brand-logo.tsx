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
    Animated.spring(menuAnim, {
      toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0, duration: 160, useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const handleNavigate = (path: '/' | '/nuevo' | '/registros' | '/registro-mensual' | '/ajustes') => {
    closeMenu();
    router.push(path);
  };

  return (
    <View style={styles.container}>
      {/* Una sola fila: logo (flex:1) + botón S a la derecha */}
      <View style={styles.row}>
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

        <Pressable style={styles.iconButton} onPress={() => (menuVisible ? closeMenu() : openMenu())}>
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
                { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
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
    container: { position: 'relative' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    // El webp es 1280×720 con el wordmark centrado. Cover a height:52 recorta
    // las bandas blancas superiores/inferiores y muestra la zona central del logotipo.
    logoImage: { flex: 1, height: 52, borderRadius: 10 },
    brandName: { flex: 1, fontSize: 38, fontWeight: '900', color: Colors.brand, letterSpacing: 1 },
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
      position: 'absolute', top: 60, right: 0, zIndex: 100, width: 210,
      backgroundColor: C.card, borderRadius: 18,
      paddingVertical: 10, paddingHorizontal: 14,
      shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 }, elevation: 8,
    },
    menuItem: { paddingVertical: 13 },
    menuItemText: { fontSize: 15, color: C.text, fontWeight: '700' },
  });
}
