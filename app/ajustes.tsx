import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { useAuth } from '@/contexts/auth-context';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

export default function AjustesScreen() {
  const { registros } = useRegistro();
  const { usuario, logout } = useAuth();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo onFichajeRapido={showToast} />
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
          <Text style={styles.sectionValue}>{Constants.expoConfig?.version ?? '—'}</Text>
        </View>

        <View style={styles.logoutArea}>
          <Pressable onPress={logout} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },
    header: {
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4,
      zIndex: 10, elevation: 6, backgroundColor: C.background,
    },
    page: { padding: 24, paddingTop: 16, gap: 18 },
    title: { fontSize: 30, fontWeight: '800', color: C.text },
    subtitle: { fontSize: 15, color: C.textSecondary, lineHeight: 22 },
    section: {
      marginTop: 4, backgroundColor: C.card, borderRadius: 20, padding: 22,
      borderWidth: 1, borderColor: C.border,
    },
    sectionLabel: { fontSize: 14, color: C.textMuted, fontWeight: '700', marginBottom: 10 },
    sectionValue: { fontSize: 18, color: C.text, fontWeight: '700' },
    sectionMeta: { fontSize: 14, color: C.textMuted, marginTop: 4 },
    logoutArea: { marginTop: 24, alignItems: 'center', paddingBottom: 8 },
    logoutButton: { paddingVertical: 14, paddingHorizontal: 32 },
    logoutPressed: { opacity: 0.5 },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  });
}
