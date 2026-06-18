import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { useFichajeAlerts } from '@/hooks/useFichajeAlerts';
import { useMonthlyBackupPrompt } from '@/hooks/useMonthlyBackupPrompt';
import { dateToDateStr } from '@/utils/date';
import { roundDateToNearest30 } from '@/utils/time';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function getSaludo(): string {
  const h = new Date().getHours();
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function useElapsedTimer(fecha: string | undefined, inicio: string | undefined, active: boolean): string {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!active || !inicio) { setElapsed(''); return; }
    const update = () => {
      const start = new Date(`${fecha}T${inicio}:00`);
      const diffMs = Date.now() - start.getTime();
      if (diffMs < 0) { setElapsed(''); return; }
      const totalMin = Math.floor(diffMs / 60000);
      const hh = Math.floor(totalMin / 60);
      const mm = totalMin % 60;
      setElapsed(mm > 0 ? `${hh}h ${mm}m` : `${hh}h`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [fecha, inicio, active]);

  return elapsed;
}

type FichajeState = 'idle' | 'active' | 'complete';

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { quickEntry, saveQuickEntry } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const [quickSaving, setQuickSaving] = useState(false);
  const [clockStr, setClockStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const now = new Date();
  const dateLabel = `${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES_ES[now.getMonth()]}`;
  const nombre = usuario?.nombre?.split(' ')[0] ?? '';

  const timerActive = Boolean(quickEntry && !quickEntry.fin);
  const elapsed = useElapsedTimer(quickEntry?.fecha, quickEntry?.inicio, timerActive);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setClockStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const handleEntrada = async () => {
    if (quickSaving) return;
    setQuickSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rounded = roundDateToNearest30(new Date());
      await saveQuickEntry({ fecha: dateToDateStr(rounded.date), inicio: rounded.time });
      showToast(`Entrada: ${rounded.time}`);
    } catch {
      showToast('No se pudo registrar la entrada.', 'error');
    } finally { setQuickSaving(false); }
  };

  const handleSalida = async () => {
    if (!quickEntry || quickSaving) return;
    setQuickSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rounded = roundDateToNearest30(new Date());
      await saveQuickEntry({ ...quickEntry, fin: rounded.time, finFecha: dateToDateStr(rounded.date) });
      showToast(`Salida: ${rounded.time}`);
    } catch {
      showToast('No se pudo registrar la salida.', 'error');
    } finally { setQuickSaving(false); }
  };

  const handleCompletarJornada = () => {
    if (!quickEntry?.fin) return;
    router.push({
      pathname: '/nuevo',
      params: {
        fechaPreset:       quickEntry.fecha,
        inicioPreset:      quickEntry.inicio,
        finPreset:         quickEntry.fin,
        finFechaPreset:    quickEntry.finFecha ?? quickEntry.fecha,
        descripcionPreset: quickEntry.notas ?? '',
      },
    });
  };

  const handleCancelarEntrada = async () => {
    if (quickSaving) return;
    setQuickSaving(true);
    try {
      await saveQuickEntry(null);
      showToast('Entrada cancelada');
    } catch {
      showToast('No se pudo cancelar.', 'error');
    } finally { setQuickSaving(false); }
  };

  const fichajeState: FichajeState =
    !quickEntry ? 'idle' : quickEntry.fin ? 'complete' : 'active';

  const isOldEntry = quickEntry?.fecha != null && quickEntry.fecha !== dateToDateStr(new Date());

  const alerts = useFichajeAlerts();
  useMonthlyBackupPrompt();

  const mainBtnLabel =
    fichajeState === 'idle' ? 'Registrar entrada' :
    fichajeState === 'active' ? 'Registrar salida' :
    'Completar jornada →';

  const handleMainAction = () => {
    if (fichajeState === 'idle') void handleEntrada();
    else if (fichajeState === 'active') void handleSalida();
    else handleCompletarJornada();
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerBrand}><BrandLogo /></View>
          <Pressable
            style={styles.headerAction}
            onPress={() => router.push('/nuevo')}
            accessibilityRole="button"
            accessibilityLabel="Nueva jornada"
          >
            <Text style={styles.headerActionText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Saludo y fecha */}
      <View style={styles.infoRow}>
        <View style={styles.infoTextCol}>
          {nombre ? <Text style={styles.infoGreeting}>{getSaludo()}, {nombre}</Text> : null}
          <Text style={styles.infoDate}>{dateLabel}</Text>
        </View>
        <Text style={styles.infoClock}>{clockStr}</Text>
      </View>

      <View style={styles.sep} />

      {/* Panel de alertas */}
      {alerts.length > 0 && (
        <View style={styles.alertsPanel}>
          {alerts.map((a) => (
            <View key={a.id} style={styles.alertItem}>
              <Text style={styles.alertText}>{a.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Zona de fichaje */}
      <View style={styles.fichajeZone}>

        {/* Badge de estado */}
        <View style={[
          styles.badge,
          fichajeState === 'active' ? styles.badgeActive :
          fichajeState === 'complete' ? styles.badgePending :
          styles.badgeIdle,
        ]}>
          <View style={[
            styles.badgeDot,
            fichajeState === 'active' ? styles.dotActive :
            fichajeState === 'complete' ? styles.dotPending :
            styles.dotIdle,
          ]} />
          <Text style={[
            styles.badgeText,
            fichajeState === 'active' ? styles.badgeTextActive :
            fichajeState === 'complete' ? styles.badgeTextPending :
            styles.badgeTextIdle,
          ]}>
            {fichajeState === 'idle' ? 'Sin fichar' :
             fichajeState === 'active' ? 'En curso' :
             'Pendiente de completar'}
          </Text>
          {fichajeState === 'active' && quickEntry?.inicio
            ? <Text style={styles.badgeSince}> · {quickEntry.inicio}</Text>
            : null}
        </View>

        {isOldEntry && (
          <Text style={styles.oldWarn}>Fichaje del {quickEntry!.fecha}</Text>
        )}

        {/* Pantalla principal de tiempo */}
        {fichajeState === 'active' ? (
          <Text style={styles.bigTimeActive}>{elapsed || '—'}</Text>
        ) : fichajeState === 'complete' ? (
          <Text style={styles.bigTimeComplete}>
            {quickEntry!.inicio} → {quickEntry!.fin}
          </Text>
        ) : (
          <View style={styles.idleRing}>
            <Text style={styles.idleRingText}>
              Sin jornada activa{'\n'}Pulsa para fichar
            </Text>
          </View>
        )}

        {/* Botón principal */}
        <Pressable
          style={[
            styles.mainBtn,
            fichajeState === 'idle' ? styles.mainBtnGreen : styles.mainBtnRed,
            quickSaving ? styles.mainBtnDisabled : null,
          ]}
          onPress={handleMainAction}
          disabled={quickSaving}
          accessibilityRole="button"
          accessibilityLabel={mainBtnLabel}
        >
          <Text style={styles.mainBtnText}>{mainBtnLabel}</Text>
        </Pressable>

        {/* Enlace secundario */}
        {fichajeState !== 'idle' && (
          <Pressable
            style={styles.secondaryLink}
            onPress={handleCancelarEntrada}
            disabled={quickSaving}
          >
            <Text style={styles.secondaryLinkText}>
              {fichajeState === 'active' ? 'Cancelar entrada' : 'Descartar fichaje'}
            </Text>
          </Pressable>
        )}

      </View>

      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },

    // Encabezado
    header: {
      paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
      backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    headerBrand: { flex: 1 },
    headerAction: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    headerActionText: {
      fontSize: 26, fontWeight: '300', color: C.text, lineHeight: 32,
    },

    // Info
    infoRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 24, paddingVertical: 14,
    },
    infoTextCol: { gap: 3 },
    infoGreeting: { fontSize: 17, fontWeight: '700', color: C.text },
    infoDate: { fontSize: 13, fontWeight: '500', color: C.textMuted, textTransform: 'capitalize' },
    infoClock: { fontSize: 34, fontWeight: '800', color: Colors.brand, letterSpacing: 0.5 },

    sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },

    // Zona fichaje
    fichajeZone: {
      flex: 1, paddingHorizontal: 24,
      justifyContent: 'center', alignItems: 'center',
      paddingBottom: 20,
    },

    // Badge
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
      marginBottom: 32,
    },
    badgeIdle:    { backgroundColor: C.subtleBg },
    badgeActive:  { backgroundColor: 'rgba(34,197,94,0.1)' },
    badgePending: { backgroundColor: 'rgba(245,158,11,0.1)' },
    badgeDot: { width: 8, height: 8, borderRadius: 4 },
    dotIdle:    { backgroundColor: C.textFaint },
    dotActive:  { backgroundColor: '#22c55e' },
    dotPending: { backgroundColor: '#f59e0b' },
    badgeText: { fontSize: 14, fontWeight: '700' },
    badgeTextIdle:    { color: C.textSecondary },
    badgeTextActive:  { color: '#22c55e' },
    badgeTextPending: { color: '#f59e0b' },
    badgeSince: { fontSize: 13, fontWeight: '500', color: C.textMuted },

    oldWarn: {
      fontSize: 12, color: '#b45309', fontWeight: '600',
      textAlign: 'center', marginTop: -24, marginBottom: 16,
    },

    // Pantallas de tiempo
    bigTimeActive: {
      fontSize: 72, fontWeight: '900', color: C.text,
      letterSpacing: -2, lineHeight: 80, textAlign: 'center',
      marginBottom: 8,
    },
    bigTimeComplete: {
      fontSize: 36, fontWeight: '800', color: C.text,
      letterSpacing: -0.5, textAlign: 'center',
      marginBottom: 8,
    },
    idleRing: {
      width: 164, height: 164, borderRadius: 82,
      borderWidth: 1.5, borderColor: C.border,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 20,
    },
    idleRingText: {
      fontSize: 14, color: C.textFaint, textAlign: 'center',
      lineHeight: 21, fontWeight: '500', paddingHorizontal: 20,
    },

    // Botón principal
    mainBtn: {
      width: '100%', borderRadius: 18, paddingVertical: 18,
      alignItems: 'center', marginTop: 20,
    },
    mainBtnGreen:    { backgroundColor: '#22c55e' },
    mainBtnRed:      { backgroundColor: Colors.brand },
    mainBtnDisabled: { opacity: 0.55 },
    mainBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

    // Enlace secundario
    secondaryLink: {
      paddingVertical: 14, paddingHorizontal: 20,
      alignItems: 'center', marginTop: 4,
    },
    secondaryLinkText: { fontSize: 14, color: C.textMuted, fontWeight: '600' },

    // Panel de alertas
    alertsPanel: {
      paddingHorizontal: 20, paddingTop: 10, gap: 6,
    },
    alertItem: {
      backgroundColor: 'rgba(245,158,11,0.1)',
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
      borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    },
    alertText: { fontSize: 13, color: '#b45309', fontWeight: '600' },
  });
}
