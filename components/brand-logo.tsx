import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';

const brandMark = require('../assets/images/salvagnini-mark.png');
const brandLogo = require('../assets/images/salvagnini-logo.webp');

export function BrandLogo() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);

  const handleNavigate = (path: '/' | '/nuevo' | '/registros' | '/ajustes') => {
    setMenuVisible(false);
    router.push(path);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.iconButton} onPress={() => setMenuVisible((prev) => !prev)}>
        <Image source={brandMark} style={styles.icon} resizeMode="contain" />
      </Pressable>

      <View style={styles.textGroup}>
        {logoLoaded ? (
          <Image
            source={brandLogo}
            style={styles.logoImage}
            resizeMode="contain"
            onError={() => setLogoLoaded(false)}
          />
        ) : (
          <Text style={styles.brandName}>SALVAGNINI</Text>
        )}
        <Text style={styles.brandTag}>Registro de jornada laboral</Text>
      </View>

      {menuVisible && (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/')}>
            <Text style={styles.menuItemText}>Inicio</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleNavigate('/registros')}>
            <Text style={styles.menuItemText}>Registros</Text>
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
    marginBottom: 14,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  icon: {
    width: 28,
    height: 28,
  },
  textGroup: {
    flex: 1,
  },
  logoImage: {
    width: 180,
    height: 28,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.brandDark,
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandTag: {
    fontSize: 13,
    color: '#4b5563',
    letterSpacing: 0.5,
  },
  menu: {
    position: 'absolute',
    top: 64,
    left: 0,
    zIndex: 10,
    width: 188,
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.brandDark,
    fontWeight: '700',
  },
});
