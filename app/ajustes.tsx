import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

const KEY_NOTIF_CIERRE = '@salvagnini_notif_cierre';

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
  const [notifCierre, setNotifCierre] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY_NOTIF_CIERRE).then((v) => {
      if (v !== null) setNotifCierre(v === 'true');
    }).catch(() => {});
  }, []);

  const toggleNotifCierre = async (val: boolean) => {
    setNotifCierre(val);
    await AsyncStorage.setItem(KEY_NOTIF_CIERRE, String(val)).catch(() => {});
  };

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
        `¿Importar ${imported.length} registro${imported.length === 1 ? '' : 's'}? Los registros nuevos se añadirán sin borrar los actuales.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: async () => {
              let count = 0;
              for (const r of imported) {
                const { id: _id, createdAt: _ca, ...rest } = r;
                try { await addRegistro(rest); count++; } catch { /* skip */ }
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

  const handleBorrarTodo = () => {
    Alert.alert(
      'Borrar todos los registros',
      `Se eliminarán ${registros.length} jornada${registros.length === 1 ? '' : 's'} de forma permanente. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar todo', style: 'destructive', onPress: () => showToast('Función disponible próximamente.') },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Encabezado estático ── */}
      <View style={styles.header}>
        <BrandLogo />
      </View>

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ajustes</Text>

        {/* ── CUENTA ── */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Cuenta</Text>
          <View style={styles.groupCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nombre</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{usuario?.nombre ?? '—'}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{usuario?.email ?? '—'}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Empresa</Text>
              <Text style={styles.rowValue}>Salvagnini Ibérica S.L.</Text>
            </View>
          </View>
        </View>

        {/* ── NOTIFICACIONES ── */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Notificaciones</Text>
          <View style={styles.groupCard}>
            <View style={styles.row}>
              <View style={styles.rowLabelGroup}>
                <Text style={styles.rowLabel}>Recordatorio de cierre</Text>
                <Text style={styles.rowSublabel}>Aviso tras 9 h de jornada activa</Text>
              </View>
              <Switch
                value={notifCierre}
                onValueChange={toggleNotifCierre}
                trackColor={{ false: C.border, true: Colors.brand }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* ── DATOS ── */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Datos</Text>
          <View style={styles.groupCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Jornadas guardadas</Text>
              <Text style={styles.rowValue}>{registros.length}</Text>
            </View>
            <View style={styles.rowDivider} />
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={handleExportBackup}
              disabled={backupLoading}
            >
              <Text style={styles.rowLabel}>{backupLoading ? 'Exportando…' : 'Exportar backup JSON'}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={handleImportBackup}
            >
              <Text style={styles.rowLabel}>Importar backup JSON</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={handleBorrarTodo}
            >
              <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>Borrar todos los registros</Text>
              <Text style={[styles.chevron, styles.rowLabelDestructive]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* ── APLICACIÓN ── */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Aplicación</Text>
          <View style={styles.groupCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Versión</Text>
              <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '—'}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Plataforma</Text>
              <Text style={styles.rowValue}>iOS · Expo Go</Text>
            </View>
          </View>
        </View>

        {/* ── SESIÓN ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutRow, pressed && styles.rowPressed]}
          onPress={logout}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>

      </ScrollView>
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },
    header: {
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
      zIndex: 10, elevation: 6, backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    page: { padding: 20, paddingTop: 20, gap: 4, paddingBottom: 48 },
    title: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 12 },

    // ── Grupos iOS ──
    group: { gap: 6, marginBottom: 16 },
    groupLabel: {
      fontSize: 12, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
      paddingHorizontal: 4, marginBottom: 2,
    },
    groupCard: {
      backgroundColor: C.card, borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1, borderColor: C.border,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, minHeight: 52,
    },
    rowPressed: { backgroundColor: C.separator },
    rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 16 },
    rowLabel: { fontSize: 15, color: C.text, fontWeight: '500', flex: 1 },
    rowLabelDestructive: { color: '#dc2626' },
    rowLabelGroup: { flex: 1, gap: 2 },
    rowSublabel: { fontSize: 12, color: C.textMuted },
    rowValue: { fontSize: 14, color: C.textMuted, fontWeight: '400', maxWidth: '55%', textAlign: 'right' },
    chevron: { fontSize: 20, color: C.textFaint, fontWeight: '400', lineHeight: 22 },

    // ── Logout ──
    logoutRow: {
      backgroundColor: C.card, borderRadius: 16,
      borderWidth: 1, borderColor: C.border,
      paddingVertical: 16, alignItems: 'center', marginTop: 8,
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  });
}
