import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { filterRegistrosByMonth, totalHoursLabel } from '@/src/services/monthly/analytics';
import { dateToDateStr } from '@/utils/date';
import { roundDateToNearest30 } from '@/utils/time';

const TIPO_COLORS: Record<string, string> = {
  Oficina:     '#3b82f6',
  Cliente:     '#f59e0b',
  Teletrabajo: '#8b5cf6',
  Mixto:       '#14b8a6',
  Casa:        '#22c55e',
  Vacaciones:  '#06b6d4',
  Permiso:     '#64748b',
  Enfermedad:  '#ef4444',
  Festivo:     '#ec4899',
};

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

export default function HomeScreen() {
  const router = useRouter();
  const { registros, loading, quickEntry, saveQuickEntry } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const [quickSaving, setQuickSaving] = useState(false);
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const recientes = useMemo(() => [...registros].sort((a, b) => {
    const dateOrder = (b.fecha ?? b.createdAt.slice(0, 10))
      .localeCompare(a.fecha ?? a.createdAt.slice(0, 10));
    return dateOrder || b.createdAt.localeCompare(a.createdAt);
  }).slice(0, 5), [registros]);

  const timerActive = Boolean(quickEntry && !quickEntry.fin);
  const elapsed = useElapsedTimer(quickEntry?.fecha, quickEntry?.inicio, timerActive);

  const registrosMes = useMemo(() => {
    const now = new Date();
    return filterRegistrosByMonth(registros, now.getFullYear(), now.getMonth());
  }, [registros]);
  const horasMes = registrosMes.length > 0 ? totalHoursLabel(registrosMes) : '—';

  const handleEntrada = async () => {
    if (quickSaving) return;
    setQuickSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rounded = roundDateToNearest30(new Date());
      await saveQuickEntry({ fecha: dateToDateStr(rounded.date), inicio: rounded.time });
      showToast(`Entrada registrada: ${rounded.time}`);
    } catch {
      showToast('No se pudo registrar la entrada.', 'error');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSalida = async () => {
    if (!quickEntry || quickSaving) return;
    setQuickSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rounded = roundDateToNearest30(new Date());
      await saveQuickEntry({ ...quickEntry, fin: rounded.time, finFecha: dateToDateStr(rounded.date) });
      showToast(`Salida registrada: ${rounded.time}`);
    } catch {
      showToast('No se pudo registrar la salida.', 'error');
    } finally {
      setQuickSaving(false);
    }
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
      showToast('No se pudo cancelar la entrada.', 'error');
    } finally {
      setQuickSaving(false);
    }
  };

  const fichajeEstado = quickEntry?.fin
    ? `${quickEntry.inicio} → ${quickEntry.fin}`
    : quickEntry
    ? `Entrada · ${quickEntry.inicio}`
    : 'Sin fichar';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo screenTitle="Panel de control" />
      </View>

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>

        {/* ── Fichaje rápido ── */}
        <View style={styles.fichajeCard}>
          <View style={styles.fichajeTopRow}>
            <Text style={styles.sectionLabel}>FICHAJE RÁPIDO</Text>
            {timerActive && elapsed ? (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>{elapsed}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.separator} />

          <Text style={styles.fichajeEstado}>{fichajeEstado}</Text>

          {quickEntry && quickEntry.fecha !== dateToDateStr(new Date()) ? (
            <Text style={styles.quickWarning}>
              Este fichaje pertenece al {quickEntry.fecha}. Revísalo antes de continuar.
            </Text>
          ) : null}

          {quickEntry?.fin ? (
            <View style={styles.fichajeActions}>
              <Pressable style={styles.btnSecondary} onPress={handleCancelarEntrada}>
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.btnPrimary, { flex: 2 }]} onPress={handleCompletarJornada}>
                <Text style={styles.btnPrimaryText}>Completar jornada →</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.fichajeActions}>
              {quickEntry ? (
                <Pressable style={styles.btnSecondary} onPress={handleCancelarEntrada}>
                  <Text style={styles.btnSecondaryText}>Cancelar</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.btnEntrada}
                  onPress={handleEntrada}
                  disabled={quickSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Registrar entrada"
                >
                  <Text style={styles.btnPrimaryText}>Entrada</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.btnPrimary, !quickEntry && styles.btnDisabled]}
                onPress={handleSalida}
                disabled={!quickEntry || quickSaving}
                accessibilityState={{ disabled: !quickEntry || quickSaving }}
                accessibilityRole="button"
                accessibilityLabel="Registrar salida"
              >
                <Text style={styles.btnPrimaryText}>Salida</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Resumen del mes ── */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionLabel}>ESTE MES</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{loading ? '…' : registrosMes.length}</Text>
              <Text style={styles.statLabel}>Jornadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{loading ? '…' : horasMes}</Text>
              <Text style={styles.statLabel}>Horas</Text>
            </View>
            <Pressable
              style={[styles.statCard, styles.statCardAction]}
              onPress={() => router.push('/registro-mensual')}
            >
              <Text style={[styles.statValue, { color: Colors.brand }]}>→</Text>
              <Text style={[styles.statLabel, { color: Colors.brand }]}>Mensual</Text>
            </Pressable>
          </View>
        </View>

        {/* ── CTA nueva jornada ── */}
        <Pressable style={styles.btnNuevo} onPress={() => router.push('/nuevo')}>
          <Text style={styles.btnNuevoText}>+ Nueva jornada</Text>
        </Pressable>

        {/* ── Últimas jornadas ── */}
        {!loading && recientes.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionLabel}>ÚLTIMAS JORNADAS</Text>
              <Pressable onPress={() => router.push('/registros')}>
                <Text style={styles.recentVerTodo}>Ver todo →</Text>
              </Pressable>
            </View>
            <View style={styles.separator} />
            {recientes.map((r, idx) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [
                  styles.recentCard,
                  pressed && styles.recentCardPressed,
                  idx < recientes.length - 1 && styles.recentCardBorder,
                ]}
                onPress={() => router.push({ pathname: '/registro-detalle', params: { id: r.id } })}
              >
                <View style={styles.recentCardLeft}>
                  <View style={[styles.tipoTag, { backgroundColor: `${TIPO_COLORS[r.titulo] ?? Colors.brand}18` }]}>
                    <View style={[styles.tipoDot, { backgroundColor: TIPO_COLORS[r.titulo] ?? Colors.brand }]} />
                    <Text style={[styles.tipoTagText, { color: TIPO_COLORS[r.titulo] ?? Colors.brand }]}>
                      {r.titulo}
                    </Text>
                  </View>
                  {r.cliente ? (
                    <Text style={styles.recentMeta} numberOfLines={1}>{r.cliente}</Text>
                  ) : null}
                  {r.inicio ? (
                    <Text style={styles.recentMeta}>{r.inicio} — {r.fin}</Text>
                  ) : null}
                </View>
                <View style={styles.recentCardRight}>
                  <Text style={styles.recentDuracion}>{r.duracion}</Text>
                  <Text style={styles.recentFecha}>
                    {r.fecha
                      ? new Date(`${r.fecha}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                      : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : !loading && recientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin jornadas registradas</Text>
            <Text style={styles.emptyText}>Usa los botones de arriba para fichar tu primera jornada.</Text>
          </View>
        ) : null}

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
      padding: 20, paddingTop: 20, gap: 16, paddingBottom: 40,
      width: '100%', maxWidth: 900, alignSelf: 'center',
    },

    // ── Etiquetas de sección ──
    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 1.2,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.border,
    },

    // ── Fichaje rápido ──
    fichajeCard: {
      backgroundColor: C.card, borderRadius: 22,
      borderWidth: 1, borderColor: C.border,
      padding: 18, gap: 12,
    },
    fichajeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timerBadge: {
      backgroundColor: '#22c55e18', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 4,
      borderWidth: 1, borderColor: '#22c55e40',
    },
    timerText: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
    fichajeEstado: { fontSize: 22, fontWeight: '700', color: C.text },
    quickWarning: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#b45309' },
    fichajeActions: { flexDirection: 'row', gap: 10 },
    btnPrimary: {
      flex: 1, backgroundColor: Colors.brand, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center',
    },
    btnEntrada: {
      flex: 1, backgroundColor: '#22c55e', borderRadius: 14,
      paddingVertical: 15, alignItems: 'center',
    },
    btnDisabled: { backgroundColor: '#d1d5db' },
    btnPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    btnSecondary: {
      flex: 1, backgroundColor: `${Colors.brand}12`, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center',
      borderWidth: 1, borderColor: `${Colors.brand}30`,
    },
    btnSecondaryText: { color: Colors.brand, fontSize: 14, fontWeight: '700' },

    // ── Stats ──
    statsSection: { gap: 10 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 16,
      alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: C.border,
    },
    statCardAction: { borderColor: `${Colors.brand}40` },
    statValue: { fontSize: 20, fontWeight: '800', color: C.text },
    statLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },

    // ── CTA ──
    btnNuevo: {
      backgroundColor: Colors.brand, borderRadius: 18,
      paddingVertical: 18, alignItems: 'center',
    },
    btnNuevoText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },

    // ── Últimas jornadas ──
    recentSection: {
      backgroundColor: C.card, borderRadius: 22,
      borderWidth: 1, borderColor: C.border,
      overflow: 'hidden', gap: 0,
    },
    recentHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    recentVerTodo: { fontSize: 13, fontWeight: '600', color: Colors.brand },
    recentCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    recentCardPressed: { backgroundColor: C.subtleBg },
    recentCardBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    recentCardLeft: { flex: 1, gap: 4, marginRight: 12 },
    recentCardRight: { alignItems: 'flex-end', gap: 2 },
    tipoTag: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    },
    tipoDot: { width: 5, height: 5, borderRadius: 3 },
    tipoTagText: { fontSize: 11, fontWeight: '700' },
    recentMeta: { fontSize: 12, color: C.textMuted },
    recentDuracion: { fontSize: 15, fontWeight: '800', color: Colors.brand },
    recentFecha: { fontSize: 11, color: C.textFaint, fontWeight: '500' },

    emptyState: {
      backgroundColor: C.card, borderRadius: 20, padding: 28,
      alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 6,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
