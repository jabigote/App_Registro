import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';

export default function HomeScreen() {
  const router = useRouter();
  const { registros, loading } = useRegistro();
  const total = registros.length;
  const latest = registros[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Panel de control</Text>
        <Text style={styles.pageSubtitle}>Gestión de tus jornadas de trabajo en Salvagnini.</Text>

        <View style={styles.stateCard}>
          <Text style={styles.stateLabel}>Jornadas</Text>
          <Text style={styles.stateValue}>
            {loading ? 'Cargando...' : total === 0 ? 'Sin jornadas registradas' : `${total} jornada${total === 1 ? '' : 's'} guardada${total === 1 ? '' : 's'}`}
          </Text>
          {latest ? <Text style={styles.stateNote}>{`${latest.titulo} · ${latest.inicio}-${latest.fin} · ${latest.duracion}`}</Text> : <Text style={styles.stateNote}>Comienza a guardar tus jornadas de trabajo para tener un histórico personal.</Text>}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.buttonPrimary} onPress={() => router.push('/nuevo')}>
            <Text style={styles.buttonPrimaryText}>Nuevo registro</Text>
          </Pressable>
          <Pressable style={styles.buttonSecondary} onPress={() => router.push('/registros')}>
            <Text style={styles.buttonSecondaryText}>Ver registros</Text>
          </Pressable>
          <Pressable style={styles.buttonSecondary} onPress={() => router.push('/ajustes')}>
            <Text style={styles.buttonSecondaryText}>Ajustes</Text>
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
  },
  page: {
    padding: 24,
    paddingTop: 16,
    gap: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.brandDark,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  stateCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  stateValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brandDark,
    marginBottom: 8,
  },
  stateNote: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  actions: {
    gap: 14,
  },
  buttonPrimary: {
    backgroundColor: Colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonSecondaryText: {
    color: Colors.brandDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
