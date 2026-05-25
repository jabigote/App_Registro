import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRegistro } from '@/contexts/registro-context';

export default function AjustesScreen() {
  const { registros } = useRegistro();
  const { usuario, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Configuración de la app de registro de jornada para Salvagnini.</Text>

        {usuario && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Usuario</Text>
            <Text style={styles.sectionValue}>{usuario.nombre}</Text>
            {usuario.email ? <Text style={styles.sectionMeta}>{usuario.email}</Text> : null}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Empresa</Text>
          <Text style={styles.sectionValue}>Salvagnini Ibérica S.L.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Total de registros</Text>
          <Text style={styles.sectionValue}>{registros.length}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Versión</Text>
          <Text style={styles.sectionValue}>0.1.0</Text>
        </View>

        <View style={styles.logoutArea}>
          <Pressable onPress={logout} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 10,
    elevation: 6,
    backgroundColor: Colors.light.background,
  },
  page: {
    padding: 24,
    paddingTop: 16,
    gap: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.brandDark,
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  section: {
    marginTop: 4,
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionValue: {
    fontSize: 18,
    color: Colors.brandDark,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutArea: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 8,
  },
  logoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  logoutPressed: {
    opacity: 0.5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
});
