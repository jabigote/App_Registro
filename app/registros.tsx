import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';

export default function RegistrosScreen() {
  const { registros, loading } = useRegistro();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Registros</Text>
        <Text style={styles.subtitle}>Visualiza todas tus jornadas de trabajo en un solo lugar.</Text>
        {loading ? (
          <Text style={styles.loadingText}>Cargando registros...</Text>
        ) : registros.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No hay jornadas guardadas</Text>
            <Text style={styles.emptyText}>Tus jornadas aparecerán aquí cuando guardes un registro.</Text>
          </View>
        ) : (
          registros.map((registro) => {
            const dietaLabel = registro.dieta === 'media' ? '½ Dieta' : registro.dieta === 'completa' ? 'Dieta completa' : null;
            const extras = registro.horasExtras && registro.horasExtras > 0 ? `${registro.horasExtras}h extra` : null;
            const tags = [dietaLabel, registro.pernocta ? 'Pernocta' : null, extras].filter(Boolean);
            return (
              <View key={registro.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>{registro.titulo}</Text>
                  <Text style={styles.recordDuration}>{registro.duracion}</Text>
                </View>
                <Text style={styles.recordSubtitle}>{`${registro.inicio} — ${registro.fin}`}</Text>
                {tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {registro.descripcion ? (
                  <Text style={styles.recordDescription}>{registro.descripcion}</Text>
                ) : null}
              </View>
            );
          })
        )}
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
    gap: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.brandDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  emptyState: {
    marginTop: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brandDark,
    marginBottom: 8,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
  },
  recordCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    gap: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brandDark,
    flex: 1,
    marginRight: 12,
  },
  recordDuration: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand,
  },
  recordSubtitle: {
    fontSize: 14,
    color: '#4b5563',
  },
  recordDescription: {
    marginTop: 6,
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: `${Colors.brand}18`,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand,
  },
});
