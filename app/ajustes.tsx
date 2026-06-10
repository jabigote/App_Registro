import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, LayoutAnimation, Pressable, SafeAreaView, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemePreference, useThemePreference } from '@/contexts/theme-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { isRegistro, type Registro } from '@/src/domain/registro';

const KEY_NOTIF_CIERRE = '@salvagnini_notif_cierre';

function isRegistroArray(value: unknown): value is Registro[] {
  return Array.isArray(value) && value.every(isRegistro);
}

// ── Componente de sección colapsable estilo iOS ──────────────────────────────
function Section({
  title,
  open,
  onToggle,
  children,
  styles,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.group}>
      <Pressable style={styles.groupHeader} onPress={onToggle}>
        <Text style={styles.groupLabel}>{title}</Text>
        <Text style={styles.groupChevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && <View style={styles.groupCard}>{children}</View>}
    </View>
  );
}

export default function AjustesScreen() {
  const { registros, mergeRegistros, replaceRegistros, clearRegistros, storageWarning } = useRegistro();
  const { usuario, updateProfile } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [backupLoading, setBackupLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [notifCierre, setNotifCierre] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({
    cuenta: true,   // CUENTA abierto por defecto
    pantalla: false,
    notif: false,
    datos: false,
    app: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(KEY_NOTIF_CIERRE)
      .then((v) => { if (v !== null) setNotifCierre(v === 'true'); })
      .catch(() => {});
  }, []);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNotifCierre = async (val: boolean) => {
    setNotifCierre(val);
    await AsyncStorage.setItem(KEY_NOTIF_CIERRE, String(val)).catch(() => {});
  };

  const handleExportBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const data = JSON.stringify(
        { version: 2, exportedAt: new Date().toISOString(), registros },
        null, 2,
      );
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
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
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
        `El backup contiene ${imported.length} registro${imported.length === 1 ? '' : 's'}.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Fusionar',
            onPress: () => mergeRegistros(imported)
              .then((count) => showToast(count ? `${count} registros nuevos importados.` : 'No había registros nuevos.'))
              .catch(() => showToast('Error al fusionar el backup.', 'error')),
          },
          {
            text: 'Reemplazar',
            style: 'destructive',
            onPress: () => replaceRegistros(imported)
              .then(() => showToast(`${imported.length} registros restaurados.`))
              .catch(() => showToast('Error al restaurar el backup.', 'error')),
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
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: () => clearRegistros()
            .then(() => showToast('Todos los registros se han borrado.'))
            .catch(() => showToast('No se pudieron borrar los registros.', 'error')),
        },
      ],
    );
  };

  const handleSaveProfile = async () => {
    if (!nombre.trim() || profileSaving) return;
    setProfileSaving(true);
    try {
      await updateProfile(nombre, email);
      showToast('Perfil actualizado.');
    } catch {
      showToast('No se pudo actualizar el perfil.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const APPEARANCE_OPTS: { value: ThemePreference; label: string }[] = [
    { value: 'light',  label: 'Claro'  },
    { value: 'dark',   label: 'Oscuro' },
    { value: 'system', label: 'Auto'   },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Encabezado estático ── */}
      <View style={styles.header}>
        <BrandLogo screenTitle="Ajustes" />
      </View>

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>

        {/* ── CUENTA ── */}
        <Section title="Cuenta" open={open.cuenta} onToggle={() => toggle('cuenta')} styles={styles}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nombre</Text>
            <TextInput
              style={styles.profileInput}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={C.textFaint}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <TextInput
              style={styles.profileInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Opcional"
              placeholderTextColor={C.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Empresa</Text>
            <Text style={styles.rowValue}>Salvagnini Ibérica S.L.</Text>
          </View>
          <Pressable
            style={[styles.profileButton, (!nombre.trim() || profileSaving) && styles.profileButtonDisabled]}
            disabled={!nombre.trim() || profileSaving}
            onPress={handleSaveProfile}
            accessibilityRole="button"
            accessibilityLabel="Guardar perfil"
          >
            <Text style={styles.profileButtonText}>{profileSaving ? 'Guardando…' : 'Guardar perfil'}</Text>
          </Pressable>
        </Section>

        {/* ── PANTALLA ── */}
        <Section title="Pantalla" open={open.pantalla} onToggle={() => toggle('pantalla')} styles={styles}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Apariencia</Text>
          </View>
          <View style={styles.appearanceRow}>
            {APPEARANCE_OPTS.map(({ value, label }) => {
              const active = preference === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.appearanceChip, active && styles.appearanceChipActive]}
                  onPress={() => setPreference(value)}
                >
                  <Text style={[styles.appearanceText, active && styles.appearanceTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* ── NOTIFICACIONES ── */}
        <Section title="Notificaciones" open={open.notif} onToggle={() => toggle('notif')} styles={styles}>
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
        </Section>

        {/* ── DATOS ── */}
        <Section title="Datos" open={open.datos} onToggle={() => toggle('datos')} styles={styles}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Jornadas guardadas</Text>
            <Text style={styles.rowValue}>{registros.length}</Text>
          </View>
          {storageWarning ? (
            <>
              <View style={styles.rowDivider} />
              <Text style={styles.warningText}>{storageWarning}</Text>
            </>
          ) : null}
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
            <Text style={[styles.rowLabel, styles.destructive]}>Borrar todos los registros</Text>
            <Text style={[styles.chevron, styles.destructive]}>›</Text>
          </Pressable>
        </Section>

        {/* ── APLICACIÓN ── */}
        <Section title="Aplicación" open={open.app} onToggle={() => toggle('app')} styles={styles}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Versión</Text>
            <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '—'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Plataforma</Text>
            <Text style={styles.rowValue}>iOS · Expo Go</Text>
          </View>
        </Section>

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
    page: { padding: 20, paddingTop: 20, paddingBottom: 48 },

    // ── Secciones colapsables ──
    group: { marginBottom: 12 },
    groupHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 4, paddingVertical: 8,
    },
    groupLabel: {
      fontSize: 13, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    groupChevron: { fontSize: 11, color: C.textFaint },
    groupCard: {
      backgroundColor: C.card, borderRadius: 16,
      overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    },

    // ── Filas iOS ──
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, minHeight: 52,
    },
    rowPressed: { backgroundColor: C.separator },
    rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 16 },
    rowLabel: { fontSize: 15, color: C.text, fontWeight: '500', flex: 1 },
    rowLabelGroup: { flex: 1, gap: 2 },
    rowSublabel: { fontSize: 12, color: C.textMuted },
    rowValue: { fontSize: 14, color: C.textMuted, maxWidth: '55%', textAlign: 'right' },
    chevron: { fontSize: 20, color: C.textFaint, lineHeight: 22 },
    destructive: { color: '#dc2626' },
    warningText: { color: '#b45309', fontSize: 13, lineHeight: 18, padding: 16 },
    profileInput: {
      color: C.text, fontSize: 14, textAlign: 'right', minWidth: 150,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingVertical: 4,
    },
    profileButton: {
      margin: 14, marginTop: 4, backgroundColor: Colors.brand,
      paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    },
    profileButtonDisabled: { opacity: 0.45 },
    profileButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

    // ── Chips de apariencia ──
    appearanceRow: {
      flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 8,
    },
    appearanceChip: {
      flex: 1, paddingVertical: 9, borderRadius: 12,
      backgroundColor: C.separator, alignItems: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    appearanceChipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    appearanceText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
    appearanceTextActive: { color: '#ffffff' },

  });
}
