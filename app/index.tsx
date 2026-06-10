import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { dateToDateStr } from '@/utils/date';
import { roundDateToNearest30 } from '@/utils/time';

const TIPO_COLORS: Record<string, string> = {
  Oficina:     '#3b82f6',
  Cliente:     '#f59e0b',
  Teletrabajo: '#8b5cf6',
  Mixto:       '#14b8a6',
  Casa:        '#22c55e',
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

function durationToMinutes(duracion: string): number {
  const h = duracion.match(/(\d+)h/);
  const m = duracion.match(/(\d+)m/);
  return (h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0);
}

export default function HomeScreen() {
  const router = useRouter();
  const { registros, loading, quickEntry, saveQuickEntry } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const [quickSaving, setQuickSaving] = useState(false);
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const total = registros.length;
  const recientes = registros.slice(0, 5);

  const timerActive = Boolean(quickEntry && !quickEntry.fin);
  const elapsed = useElapsedTimer(quickEntry?.fecha, quickEntry?.inicio, timerActive);

  // Horas totales del mes actual
  const horasMes = useMemo(() => {
    const now = new Date();
    const mes = now.getMonth();
    const año = now.getFullYear();
    const totalMin = registros
      .filter((r) => {
        const d = r.fecha ? new Date(`${r.fecha}T12:00:00`) : new Date(r.createdAt);
        return d.getMonth() === mes && d.getFullYear() === año;
      })
      .reduce((sum, r) => sum + durationToMinutes(r.duracion), 0);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : '—';
  }, [registros]);

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
      await saveQuickEntry({ ...quickEntry, fin: rounded.time });
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

  // Estado descriptivo del fichaje actual
  const fichajeEstado = quickEntry?.fin
    ? `${quickEntry.inicio} → ${quickEntry.fin}`
    : quickEntry
    ? `Entrada a las ${quickEntry.inicio}`
    : 'Sin fichar';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Encabezado estático ── */}
      <View style={styles.header}>
        <BrandLogo screenTitle="Panel de control" />
      </View>

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>

        {/* ── Fichaje rápido: sección abierta, sin card ── */}
        <View style={styles.fichajeSection}>
          <View style={styles.fichajeTopRow}>
            <Text style={styles.fichajeSectionLabel}>Fichaje rápido</Text>
            {timerActive && elapsed ? (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>{elapsed}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.fichajeEstado}>{fichajeEstado}</Text>
          {quickEntry && quickEntry.fecha !== dateToDateStr(new Date()) ? (
            <Text style={styles.quickWarning}>Este fichaje pertenece al {quickEntry.fecha}. Revísalo antes de continuar.</Text>
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

        {/* ── Stats del mes en curso ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '…' : total}</Text>
            <Text style={styles.statLabel}>Jornadas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '…' : horasMes}</Text>
            <Text style={styles.statLabel}>Este mes</Text>
          </View>
          <Pressable
            style={[styles.statCard, styles.statCardAction]}
            onPress={() => router.push('/registro-mensual')}
          >
            <Text style={[styles.statValue, { color: Colors.brand }]}>→</Text>
            <Text style={[styles.statLabel, { color: Colors.brand }]}>Mensual</Text>
          </Pressable>
        </View>

        {/* ── CTA nuevo registro ── */}
        <Pressable style={styles.btnNuevo} onPress={() => router.push('/nuevo')}>
          <Text style={styles.btnNuevoText}>+ Nueva jornada</Text>
        </Pressable>

        {/* ── Últimas jornadas ── */}
        {!loading && recientes.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Últimas jornadas</Text>
              <Pressable onPress={() => router.push('/registros')}>
                <Text style={styles.recentVerTodo}>Ver todo →</Text>
              </Pressable>
            </View>
            {recientes.map((r) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [styles.recentCard, pressed && styles.recentCardPressed]}
                onPress={() => router.push({ pathname: '/registro-detalle', params: { id: r.id } })}
              >
                <View style={styles.recentCardLeft}>
                  <View style={[styles.tipoTag, { backgroundColor: `${TIPO_COLORS[r.titulo] ?? Colors.brand}20` }]}>
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
                <Text style={styles.recentDuracion}>{r.duracion}</Text>
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
      padding: 24, paddingTop: 20, gap: 20, paddingBottom: 40,
      width: '100%', maxWidth: 900, alignSelf: 'center',
    },

    // ── Fichaje rápido ──
    fichajeSection: { gap: 12 },
    fichajeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fichajeSectionLabel: {
      fontSize: 12, fontWeight: '800', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 1,
    },
    timerBadge: {
      backgroundColor: '#22c55e18', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 4,
      borderWidth: 1, borderColor: '#22c55e40',
    },
    timerText: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
    fichajeEstado: { fontSize: 22, fontWeight: '700', color: C.text },
    quickWarning: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#b45309' },
    fichajeActions: { flexDirection: 'row', gap: 12 },
    btnPrimary: {
      flex: 1, backgroundColor: Colors.brand, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
    },
    btnEntrada: {
      flex: 1, backgroundColor: '#22c55e', borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
    },
    btnDisabled: { backgroundColor: '#d1d5db' },
    btnPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    btnSecondary: {
      flex: 1, backgroundColor: `${Colors.brand}15`, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
      borderWidth: 1, borderColor: `${Colors.brand}40`,
    },
    btnSecondaryText: { color: Colors.brand, fontSize: 15, fontWeight: '700' },

    // ── Stats ──
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
    recentSection: { gap: 10 },
    recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recentTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    recentVerTodo: { fontSize: 13, fontWeight: '600', color: Colors.brand },
    recentCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 }, elevation: 1,
    },
    recentCardPressed: { opacity: 0.7 },
    recentCardLeft: { flex: 1, gap: 4, marginRight: 12 },
    tipoTag: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    tipoDot: { width: 6, height: 6, borderRadius: 3 },
    tipoTagText: { fontSize: 11, fontWeight: '700' },
    recentMeta: { fontSize: 12, color: C.textMuted },
    recentDuracion: { fontSize: 16, fontWeight: '800', color: Colors.brand },

    emptyState: {
      backgroundColor: C.card, borderRadius: 20, padding: 28,
      alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 6,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
