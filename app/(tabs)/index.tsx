import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

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
const brandLogo = require('../../assets/images/salvagnini-logo.webp');

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

      {/* ── Header ── */}
      <View style={styles.header}>
        <Image source={brandLogo} style={styles.logoHeader} contentFit="contain" />
        <View style={styles.infoBlock}>
          {nombre ? (
            <Text style={styles.headerGreeting}>{getSaludo()}, {nombre}</Text>
          ) : null}
          <Text style={styles.headerDate}>{dateLabel}</Text>
          <Text style={styles.headerClock}>{clockStr}</Text>
        </View>
      </View>

      {/* ── Zona de fichaje ── */}
      <View style={styles.fichajeZone}>

        {fichajeState === 'idle' && (
          <View style={styles.fichajeCard}>
            <View style={styles.idleRing}>
              <View style={styles.idleRingInner} />
            </View>
            <Text style={styles.stateTitle}>Sin fichar</Text>
            <Text style={styles.stateSubtitle}>Toca para registrar tu entrada</Text>
            <Pressable
              style={[styles.heroBtn, styles.heroBtnEntrada, quickSaving && styles.heroBtnDisabled]}
              onPress={handleEntrada}
              disabled={quickSaving}
              accessibilityRole="button"
              accessibilityLabel="Registrar entrada"
            >
              <Text style={styles.heroBtnText}>Entrada</Text>
            </Pressable>
          </View>
        )}

        {fichajeState === 'active' && (
          <View style={styles.fichajeCard}>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Jornada en curso</Text>
            </View>
            <Text style={styles.elapsedTime}>{elapsed || '—'}</Text>
            <Text style={styles.stateSubtitle}>desde las {quickEntry!.inicio}</Text>
            {isOldEntry && (
              <Text style={styles.warnText}>Fichaje del {quickEntry!.fecha}</Text>
            )}
            <Pressable
              style={[styles.heroBtn, styles.heroBtnSalida, quickSaving && styles.heroBtnDisabled]}
              onPress={handleSalida}
              disabled={quickSaving}
              accessibilityRole="button"
              accessibilityLabel="Registrar salida"
            >
              <Text style={styles.heroBtnText}>Salida</Text>
            </Pressable>
            <Pressable style={styles.cancelLink} onPress={handleCancelarEntrada} disabled={quickSaving}>
              <Text style={styles.cancelLinkText}>Cancelar entrada</Text>
            </Pressable>
          </View>
        )}

        {fichajeState === 'complete' && (
          <View style={styles.fichajeCard}>
            <View style={[styles.activeBadge, styles.pendingBadge]}>
              <Text style={styles.pendingBadgeText}>Pendiente de completar</Text>
            </View>
            <Text style={styles.completeRange}>
              {quickEntry!.inicio} → {quickEntry!.fin}
            </Text>
            {isOldEntry && (
              <Text style={styles.warnText}>Fichaje del {quickEntry!.fecha}</Text>
            )}
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

      {/* ── Stats strip — reservado para futura pantalla de análisis ──
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loading ? '…' : fmtMinutes(monthlyBreakdown.workedMinutes)}</Text>
          <Text style={styles.statLabel}>este mes</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loading ? '…' : fmtMinutes(monthlyBreakdown.overtimeMinutes)}</Text>
          <Text style={styles.statLabel}>extras</Text>
        </View>
        <View style={styles.statSep} />
        <Pressable
          style={styles.statItem}
          onPress={() => router.push('/registro-mensual')}
          accessibilityRole="button"
          accessibilityLabel="Ver resumen mensual"
        >
          <Text style={[styles.statValue, { color: Colors.brand }]}>Mensual</Text>
          <Text style={[styles.statLabel, { color: Colors.brand }]}>→</Text>
        </Pressable>
      </View>
      ── */}

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

    // ── Header ──
    header: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
      gap: 6,
    },
    logoHeader: {
      height: 38,
      width: 190,
    },
    infoBlock: {
      alignItems: 'center',
      gap: 1,
    },
    headerGreeting: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
    },
    headerDate: {
      fontSize: 12,
      fontWeight: '500',
      color: C.textMuted,
      textTransform: 'capitalize',
    },
    headerClock: {
      fontSize: 26,
      fontWeight: '800',
      color: Colors.brand,
      letterSpacing: 1,
      marginTop: 4,
    },

    // ── Fichaje zone ──
    fichajeZone: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    fichajeCard: {
      backgroundColor: C.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: C.border,
      padding: 28,
      alignItems: 'center',
      gap: 14,
    },

    // Estado idle
    idleRing: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 2.5,
      borderColor: C.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    idleRingInner: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: C.subtleBg,
    },
    stateTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: C.text,
    },
    stateSubtitle: {
      fontSize: 14,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Estado active
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#22c55e18',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#22c55e40',
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22c55e',
    },
    activeBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#22c55e',
    },
    elapsedTime: {
      fontSize: 60,
      fontWeight: '900',
      color: C.text,
      letterSpacing: -2,
      lineHeight: 68,
    },

    // Estado complete
    pendingBadge: {
      backgroundColor: '#f59e0b18',
      borderColor: '#f59e0b40',
    },
    pendingBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#f59e0b',
    },
    completeRange: {
      fontSize: 38,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -1,
    },

    warnText: {
      fontSize: 12,
      color: '#b45309',
      fontWeight: '600',
      textAlign: 'center',
    },

    // Botones hero
    heroBtn: {
      width: '100%',
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 6,
    },
    heroBtnEntrada: { backgroundColor: '#22c55e' },
    heroBtnSalida:  { backgroundColor: Colors.brand },
    heroBtnCompletar: { backgroundColor: Colors.brand },
    heroBtnDisabled: { opacity: 0.55 },
    heroBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

    cancelLink: { paddingVertical: 8, paddingHorizontal: 16 },
    cancelLinkText: { fontSize: 14, color: C.textMuted, fontWeight: '600' },

    // ── Stats bar ──
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
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statValue: { fontSize: 18, fontWeight: '800', color: C.text },
    statLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
    statSep: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: C.border,
    },

    // ── CTA row ──
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
