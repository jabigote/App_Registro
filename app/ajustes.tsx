import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';

export default function AjustesScreen() {
  const { registros } = useRegistro();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <BrandLogo />
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Configuración de la app de registro de jornada para Salvagnini.</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  page: {
    padding: 24,
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
    marginTop: 18,
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
});
