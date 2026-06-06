import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { useAuth } from '@/contexts/auth-context';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import { Colors } from '@/constants/theme';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

function isRegistroArray(value: unknown): value is Registro[] {
  return Array.isArray(value) && value.every(
    (r) => r && typeof r === 'object' && typeof (r as Record<string, unknown>).id === 'string',
  );
}

export default function AjustesScreen() {
  const { registros, addRegistro } = useRegistro();
  const { usuario, logout } = useAuth();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleExportBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), registros }, null, 2);
      const path = `${FileSystem.documentDirectory}salvagnini_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, data, { encoding: 'utf8' });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Exportar backup' });
      }
    } catch {
      showToast('Error al exportar el backup.', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
      const parsed = JSON.parse(raw) as { registros?: unknown };
      const imported = parsed?.registros;
      if (!isRegistroArray(imported) || imported.length === 0) {
        showToast('El archivo no contiene registros válidos.', 'error');
        return;
      }
      Alert.alert(
        'Restaurar backup',
        `¿Importar ${imported.length} registro${imported.length === 1 ? '' : 's'}? Los datos actuales no se borrarán — los registros nuevos se añadirán.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: async () => {
              let count = 0;
              for (const r of imported) {
                const { id: _id, createdAt: _ca, ...rest } = r;
                try { await addRegistro(rest); count++; } catch { /* skip duplicates */ }
              }
              showToast(`${count} registros importados.`);
            },
          },
        ],
      );
    } catch {
      showToast('No se pudo leer el archivo seleccionado.', 'error');
    }
  };

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

        {/* Backup */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Datos y backup</Text>
          <Pressable
            style={[styles.backupBtn, backupLoading && styles.backupBtnDisabled]}
            onPress={handleExportBackup}
            disabled={backupLoading}
          >
            <Text style={styles.backupBtnText}>{backupLoading ? 'Exportando…' : 'Exportar backup JSON'}</Text>
          </Pressable>
          <Pressable style={[styles.backupBtn, styles.backupBtnSecondary]} onPress={handleImportBackup}>
            <Text style={[styles.backupBtnText, styles.backupBtnTextSecondary]}>Importar backup JSON</Text>
          </Pressable>
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
    backupBtn: {
      backgroundColor: Colors.brand, borderRadius: 14,
      paddingVertical: 13, alignItems: 'center', marginTop: 10,
    },
    backupBtnDisabled: { backgroundColor: '#9ca3af' },
    backupBtnSecondary: { backgroundColor: `${Colors.brand}18`, borderWidth: 1, borderColor: `${Colors.brand}40` },
    backupBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    backupBtnTextSecondary: { color: Colors.brand },
    logoutArea: { marginTop: 24, alignItems: 'center', paddingBottom: 8 },
    logoutButton: { paddingVertical: 14, paddingHorizontal: 32 },
    logoutPressed: { opacity: 0.5 },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  });
}
