import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';

const brandMark = require('../assets/images/salvagnini-mark.png');
const brandLogo = require('../assets/images/salvagnini-logo.webp');

export function BrandLogo() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);

  const handleNavigate = (path: '/' | '/nuevo' | '/registros' | '/registro-mensual' | '/ajustes') => {
    setMenuVisible(false);
    router.push(path);
  };

  return (
    <View style={styles.container}>
      {/* Icono S — botón de menú */}
      <Pressable style={styles.iconButton} onPress={() => setMenuVisible((prev) => !prev)}>
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

      {/* Logo + subtítulo */}
      <View style={styles.textGroup}>
        {!logoFailed ? (
          <Image
            source={brandLogo}
            style={styles.logoImage}
            contentFit="fill"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Text style={styles.brandName}>SALVAGNINI</Text>
        )}
        <Text style={styles.brandTag}>Registro de jornada laboral</Text>
      </View>

      {/* Menú desplegable */}
      {menuVisible && (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/')}>
            <Text style={styles.menuItemText}>Inicio</Text>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    position: 'relative',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  icon: {
    width: 30,
    height: 30,
  },
  iconFallback: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  textGroup: {
    flex: 1,
    gap: 4,
  },
  // fill: la imagen se estira para ocupar EXACTAMENTE el área indicada
  // — garantiza que el logo sea tan alto como el botón S (56 px)
  logoImage: {
    width: '100%',
    height: 160,
  },
  brandName: {
    fontSize: 72,
    fontWeight: '900',
    color: Colors.brandDark,
    letterSpacing: 1,
  },
  brandTag: {
    fontSize: 12,
    color: '#6b7280',
    letterSpacing: 0.4,
  },
  menu: {
    position: 'absolute',
    top: 190,
    left: 0,
    zIndex: 10,
    width: 200,
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 13,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.brandDark,
    fontWeight: '700',
  },
});
