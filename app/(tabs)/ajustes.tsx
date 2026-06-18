import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, LayoutAnimation, Pressable, SafeAreaView, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/app-settings-context';
import { useAuth } from '@/contexts/auth-context';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemePreference, useThemePreference } from '@/contexts/theme-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { isRegistro, type Registro } from '@/src/domain/registro';
import { NOTIFICATION_REMINDER_KEY } from '@/utils/notifications';

const EOD_ENABLED_KEY = '@salvagnini_notif_eod_enabled';
const EOD_HORA_KEY = '@salvagnini_notif_eod_hora';

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
      <Pressable
        style={styles.groupHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Cerrar' : 'Abrir'} sección ${title}`}
      >
        <Text style={styles.groupLabel}>{title}</Text>
        <Text style={styles.groupChevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && <View style={styles.groupCard}>{children}</View>}
    </View>
  );
}

export default function AjustesScreen() {
  const {
    registros, mergeRegistros, replaceRegistros, clearRegistros, storageWarning,
    quickEntry, saveQuickEntry,
  } = useRegistro();
  const { usuario, updateProfile, logout } = useAuth();
  const {
    reminderHours, setReminderHours, monthlyTargetHours, setMonthlyTargetHours,
    templates, deleteTemplate,
  } = useAppSettings();
  const { preference, setPreference } = useThemePreference();
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [backupLoading, setBackupLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [notifCierre, setNotifCierre] = useState(true);
  const [eodEnabled, setEodEnabled] = useState(false);
  const [eodHora, setEodHora] = useState('17:00');
  const [targetHoursInput, setTargetHoursInput] = useState(String(monthlyTargetHours));

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = String(now.getFullYear());

  const extrasStats = useMemo(() => {
    let total = 0, thisMes = 0, thisAnio = 0;
    for (const r of registros) {
      const h = r.horasExtras ?? 0;
      if (h <= 0) continue;
      total += h;
      const d = r.fecha ?? r.createdAt.slice(0, 10);
      if (d.startsWith(currentMonth)) thisMes += h;
      if (d.startsWith(currentYear)) thisAnio += h;
    }
    return { total, thisMes, thisAnio };
  }, [registros, currentMonth, currentYear]);
  const [open, setOpen] = useState<Record<string, boolean>>({
    cuenta: true,   // CUENTA abierto por defecto
    pantalla: false,
    notif: false,
    datos: false,
    app: false,
  });

  useEffect(() => {
    AsyncStorage.multiGet([NOTIFICATION_REMINDER_KEY, EOD_ENABLED_KEY, EOD_HORA_KEY])
      .then(([cierre, eodEn, eodH]) => {
        if (cierre[1] !== null) setNotifCierre(cierre[1] === 'true');
        if (eodEn[1] !== null) setEodEnabled(eodEn[1] === 'true');
        if (eodH[1]) setEodHora(eodH[1]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTargetHoursInput(String(monthlyTargetHours));
  }, [monthlyTargetHours]);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNotifCierre = async (val: boolean) => {
    setNotifCierre(val);
    await AsyncStorage.setItem(NOTIFICATION_REMINDER_KEY, String(val));
    if (quickEntry && !quickEntry.fin) {
      await saveQuickEntry({ ...quickEntry, notificationId: undefined });
    }
  };

  const toggleEod = async (val: boolean) => {
    setEodEnabled(val);
    await AsyncStorage.setItem(EOD_ENABLED_KEY, String(val));
  };

  const saveEodHora = async () => {
    const clean = eodHora.trim();
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean)) {
      showToast('Hora no válida. Usa formato HH:MM', 'error');
      return;
    }
    await AsyncStorage.setItem(EOD_HORA_KEY, clean);
    showToast('Hora de aviso fin de jornada actualizada.');
  };

  const handleReminderHours = async (hours: number) => {
    await setReminderHours(hours);
    if (quickEntry && !quickEntry.fin && notifCierre) {
      await saveQuickEntry({ ...quickEntry, notificationId: undefined });
    }
  };

  const handleTargetHours = async () => {
    const hours = Number(targetHoursInput.replace(',', '.'));
    if (!Number.isFinite(hours) || hours <= 0) {
      showToast('Introduce un objetivo mensual válido.', 'error');
      return;
    }
    await setMonthlyTargetHours(hours);
    showToast('Objetivo mensual actualizado.');
  };

  const handleExportBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const data = JSON.stringify(
        { version: 3, exportedAt: new Date().toISOString(), registros },
        null, 2,
      );
      const path = `${FileSystem.documentDirectory}salvagnini_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, data, { encoding: 'utf8' });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Exportar backup' });
      } else {
        showToast('Compartir archivos no está disponible en este dispositivo.', 'error');
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
        `Contiene ${imported.length} registro${imported.length === 1 ? '' : 's'}.\n` +
        `Periodo: ${imported.map((r) => r.fecha ?? r.createdAt.slice(0, 10)).sort()[0]} — ` +
        `${imported.map((r) => r.fecha ?? r.createdAt.slice(0, 10)).sort().at(-1)}.\n` +
        `Tipos: ${[...new Set(imported.map((r) => r.titulo))].join(', ')}.`,
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

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', 'Los registros locales se conservarán en este dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout().catch(() => {}) },
    ]);
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

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">

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
          <View style={styles.rowDivider} />
          <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={handleLogout}>
            <Text style={[styles.rowLabel, styles.destructive]}>Cerrar sesión</Text>
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
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
          <View style={styles.rowDivider} />
          <View style={styles.settingBlock}>
            <Text style={styles.rowLabel}>Avisar después de</Text>
            <View style={styles.appearanceRow}>
              {[8, 8.5, 9, 10].map((hours) => (
                <Pressable
                  key={hours}
                  style={[styles.appearanceChip, reminderHours === hours && styles.appearanceChipActive]}
                  onPress={() => handleReminderHours(hours)}
                >
                  <Text style={[styles.appearanceText, reminderHours === hours && styles.appearanceTextActive]}>
                    {hours} h
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <View style={styles.rowLabelGroup}>
              <Text style={styles.rowLabel}>Aviso fin de jornada</Text>
              <Text style={styles.rowSublabel}>Recordatorio fijo al final del día</Text>
            </View>
            <Switch
              value={eodEnabled}
              onValueChange={toggleEod}
              trackColor={{ false: C.border, true: Colors.brand }}
              thumbColor="#ffffff"
            />
          </View>
          {eodEnabled && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Hora del aviso</Text>
              <TextInput
                style={styles.compactInput}
                value={eodHora}
                onChangeText={setEodHora}
                onEndEditing={saveEodHora}
                placeholder="17:00"
                placeholderTextColor={C.textFaint}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                autoCorrect={false}
              />
            </View>
          )}
        </Section>

        {/* ── DATOS ── */}
        <Section title="Datos" open={open.datos} onToggle={() => toggle('datos')} styles={styles}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Jornadas guardadas</Text>
            <Text style={styles.rowValue}>{registros.length}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Horas extra este mes</Text>
            <Text style={[styles.rowValue, extrasStats.thisMes > 0 && styles.extrasPositive]}>
              {extrasStats.thisMes > 0 ? `+${extrasStats.thisMes} h` : '—'}
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Horas extra este año</Text>
            <Text style={[styles.rowValue, extrasStats.thisAnio > 0 && styles.extrasPositive]}>
              {extrasStats.thisAnio > 0 ? `+${extrasStats.thisAnio} h` : '—'}
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Horas extra totales</Text>
            <Text style={[styles.rowValue, extrasStats.total > 0 && styles.extrasPositive]}>
              {extrasStats.total > 0 ? `+${extrasStats.total} h` : '—'}
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Objetivo mensual</Text>
            <TextInput
              style={styles.compactInput}
              value={targetHoursInput}
              onChangeText={setTargetHoursInput}
              onEndEditing={handleTargetHours}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.settingBlock}>
            <Text style={styles.rowLabel}>Plantillas guardadas</Text>
            {templates.map((template) => (
              <View key={template.id} style={styles.templateRow}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Pressable onPress={() => deleteTemplate(template.id)} hitSlop={8}>
                  <Text style={styles.destructive}>Eliminar</Text>
                </Pressable>
              </View>
            ))}
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
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push('/historial-versiones' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Abrir historial de versiones"
          >
            <Text style={styles.rowLabel}>Versión</Text>
            <View style={styles.versionLink}>
              <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '—'}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
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
    page: {
      padding: 20, paddingTop: 20, paddingBottom: 48,
      width: '100%', maxWidth: 720, alignSelf: 'center',
    },

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
    versionLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    destructive: { color: '#dc2626' },
    extrasPositive: { color: '#22c55e', fontWeight: '700' },
    warningText: { color: '#b45309', fontSize: 13, lineHeight: 18, padding: 16 },
    profileInput: {
      color: C.text, fontSize: 14, textAlign: 'right', minWidth: 150,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingVertical: 4,
    },
    compactInput: {
      color: C.text, fontSize: 14, textAlign: 'right', width: 72,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, paddingVertical: 4,
    },
    settingBlock: { padding: 16, gap: 10 },
    templateRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6, gap: 12,
    },
    templateName: { flex: 1, color: C.textMuted, fontSize: 13 },
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
