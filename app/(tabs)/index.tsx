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
import { buildMonthlyBreakdown, filterRegistrosByMonth } from '@/src/services/monthly/analytics';
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
  const { registros, loading, quickEntry, saveQuickEntry } = useRegistro();
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

  // ── Stats (reservado para futura pantalla de análisis) ──────────────────────
  const registrosMes = useMemo(() => {
    const n = new Date();
    return filterRegistrosByMonth(registros, n.getFullYear(), n.getMonth());
  }, [registros]);
  const monthlyBreakdown = useMemo(() => buildMonthlyBreakdown(registrosMes), [registrosMes]);
  const fmtMinutes = (min: number) => {
    if (min === 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };
  void loading; void monthlyBreakdown; void fmtMinutes;
  // ────────────────────────────────────────────────────────────────────────────

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

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Encabezado — igual que el resto de pantallas ── */}
      <View style={styles.header}>
        <BrandLogo />
      </View>

      {/* ── Saludo / Fecha / Reloj ── */}
      <View style={styles.infoSection}>
        {nombre ? (
          <Text style={styles.infoGreeting}>{getSaludo()}, {nombre}</Text>
        ) : null}
        <Text style={styles.infoDate}>{dateLabel}</Text>
        <Text style={styles.infoClock}>{clockStr}</Text>
      </View>

      {/* ── Separador ── */}
      <View style={styles.sep} />

      {/* ── Fichaje rápido ── */}
      <View style={styles.fichajeSection}>

        {fichajeState === 'idle' && (
          <View style={styles.fichajeCard}>
            <View style={styles.statusRow}>
              <View style={styles.dotIdle} />
              <Text style={styles.statusLabel}>Sin fichar</Text>
            </View>
            <View style={styles.cardSep} />
            <Text style={styles.fichajeHint}>Registra tu entrada para empezar a contar el tiempo</Text>
            <Pressable
              style={[styles.heroBtn, styles.heroBtnEntrada, quickSaving && styles.heroBtnDisabled]}
              onPress={handleEntrada}
              disabled={quickSaving}
              accessibilityRole="button"
              accessibilityLabel="Registrar entrada"
            >
              <Text style={styles.heroBtnText}>Registrar entrada</Text>
            </Pressable>
          </View>
        )}

        {fichajeState === 'active' && (
          <View style={styles.fichajeCard}>
            <View style={styles.statusRow}>
              <View style={styles.dotActive} />
              <Text style={[styles.statusLabel, styles.statusActive]}>Jornada en curso</Text>
              <Text style={styles.statusSince}> · {quickEntry!.inicio}</Text>
            </View>
            {isOldEntry && <Text style={styles.warnText}>Fichaje del {quickEntry!.fecha}</Text>}
            <View style={styles.cardSep} />
            <Text style={styles.elapsedTime}>{elapsed || '—'}</Text>
            <View style={styles.cardSep} />
            <Pressable
              style={[styles.heroBtn, styles.heroBtnSalida, quickSaving && styles.heroBtnDisabled]}
              onPress={handleSalida}
              disabled={quickSaving}
              accessibilityRole="button"
              accessibilityLabel="Registrar salida"
            >
              <Text style={styles.heroBtnText}>Registrar salida</Text>
            </Pressable>
            <Pressable style={styles.cancelLink} onPress={handleCancelarEntrada} disabled={quickSaving}>
              <Text style={styles.cancelLinkText}>Cancelar entrada</Text>
            </Pressable>
          </View>
        )}

        {fichajeState === 'complete' && (
          <View style={styles.fichajeCard}>
            <View style={styles.statusRow}>
              <View style={styles.dotPending} />
              <Text style={[styles.statusLabel, styles.statusPending]}>Pendiente de completar</Text>
            </View>
            {isOldEntry && <Text style={styles.warnText}>Fichaje del {quickEntry!.fecha}</Text>}
            <View style={styles.cardSep} />
            <Text style={styles.completeRange}>{quickEntry!.inicio} → {quickEntry!.fin}</Text>
            <View style={styles.cardSep} />
            <Pressable
              style={[styles.heroBtn, styles.heroBtnCompletar]}
              onPress={handleCompletarJornada}
              accessibilityRole="button"
              accessibilityLabel="Completar jornada"
            >
              <Text style={styles.heroBtnText}>Completar jornada →</Text>
            </Pressable>
            <Pressable style={styles.cancelLink} onPress={handleCancelarEntrada} disabled={quickSaving}>
              <Text style={styles.cancelLinkText}>Descartar fichaje</Text>
            </Pressable>
          </View>
        )}

      </View>

      {/* ── CTAs secundarias ── */}
      <View style={styles.ctaRow}>
        <Pressable
          style={styles.btnNuevo}
          onPress={() => router.push('/nuevo')}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva jornada"
        >
          <Text style={styles.btnNuevoText}>+ Nueva jornada</Text>
        </Pressable>
        <Pressable
          style={styles.btnAusencias}
          onPress={() => router.push('/ausencias')}
          accessibilityRole="button"
          accessibilityLabel="Registrar ausencia"
        >
          <Text style={styles.btnAusenciasText}>Ausencias</Text>
        </Pressable>
      </View>

      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },

    // ── Encabezado (igual que el resto de pantallas) ──
    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },

    // ── Saludo / Fecha / Reloj ──
    infoSection: {
      alignItems: 'center',
      paddingTop: 18,
      paddingBottom: 20,
      paddingHorizontal: 24,
      gap: 4,
    },
    infoGreeting: {
      fontSize: 20,
      fontWeight: '800',
      color: C.text,
    },
    infoDate: {
      fontSize: 15,
      fontWeight: '500',
      color: C.textMuted,
      textTransform: 'capitalize',
    },
    infoClock: {
      fontSize: 40,
      fontWeight: '800',
      color: Colors.brand,
      letterSpacing: 2,
      marginTop: 6,
      lineHeight: 46,
    },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.border,
    },

    // ── Fichaje ──
    fichajeSection: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 10,
      justifyContent: 'center',
    },
    fichajeCard: {
      backgroundColor: C.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    cardSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.border,
    },

    // Status row
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    dotIdle: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: C.border,
    },
    dotActive: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#22c55e',
    },
    dotPending: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#f59e0b',
    },
    statusLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: C.textSecondary,
    },
    statusActive: { color: '#22c55e' },
    statusPending: { color: '#f59e0b' },
    statusSince: {
      fontSize: 13,
      color: C.textMuted,
      fontWeight: '500',
    },

    fichajeHint: {
      fontSize: 14,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },

    // Datos centrales
    elapsedTime: {
      fontSize: 52,
      fontWeight: '900',
      color: C.text,
      letterSpacing: -1,
      lineHeight: 60,
      textAlign: 'center',
      paddingVertical: 16,
    },
    completeRange: {
      fontSize: 36,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -0.5,
      textAlign: 'center',
      paddingVertical: 16,
    },

    warnText: {
      fontSize: 12,
      color: '#b45309',
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 20,
      paddingBottom: 4,
    },

    // Botones hero
    heroBtn: {
      marginHorizontal: 20,
      marginBottom: 4,
      marginTop: 4,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: 'center',
    },
    heroBtnEntrada: { backgroundColor: '#22c55e' },
    heroBtnSalida:  { backgroundColor: Colors.brand },
    heroBtnCompletar: { backgroundColor: Colors.brand },
    heroBtnDisabled: { opacity: 0.55 },
    heroBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },

    cancelLink: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    cancelLinkText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },

    // ── Stats (reservado para análisis futuro) ──
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 20,
      marginHorizontal: 20,
      marginBottom: 10,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontSize: 18, fontWeight: '800', color: C.text },
    statLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
    statSep: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: C.border },

    // ── CTAs ──
    ctaRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 10,
    },
    btnNuevo: {
      flex: 2,
      backgroundColor: Colors.brand,
      borderRadius: 18,
      paddingVertical: 17,
      alignItems: 'center',
    },
    btnNuevoText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    btnAusencias: {
      flex: 1,
      borderRadius: 18,
      paddingVertical: 17,
      alignItems: 'center',
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    btnAusenciasText: { color: C.textSecondary, fontSize: 14, fontWeight: '700' },
  });
}
