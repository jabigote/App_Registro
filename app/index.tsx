import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { todayDateStr } from '@/utils/date';
import { roundToNearest30 } from '@/utils/time';

const TIPO_COLORS: Record<string, string> = {
  Oficina:     '#3b82f6',
  Cliente:     '#f59e0b',
  Teletrabajo: '#8b5cf6',
  Mixto:       '#14b8a6',
  Casa:        '#22c55e',
};

function useElapsedTimer(inicio: string | undefined, active: boolean): string {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!active || !inicio) { setElapsed(''); return; }
    const update = () => {
      const [h, m] = inicio.split(':').map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
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
  }, [inicio, active]);

  return elapsed;
}

export default function HomeScreen() {
  const router = useRouter();
  const { registros, loading, quickEntry, saveQuickEntry } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const total = registros.length;
  const latest = registros[0];
  const recientes = registros.slice(0, 3);

  const timerActive = Boolean(quickEntry && !quickEntry.fin);
  const elapsed = useElapsedTimer(quickEntry?.inicio, timerActive);

  const handleEntrada = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hora = roundToNearest30(new Date());
    await saveQuickEntry({ fecha: todayDateStr(), inicio: hora });
    showToast(`Entrada registrada: ${hora}`);
  };

  const handleSalida = async () => {
    if (!quickEntry) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hora = roundToNearest30(new Date());
    await saveQuickEntry({ ...quickEntry, fin: hora });
    showToast(`Salida registrada: ${hora}`);
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
    await saveQuickEntry(null);
    showToast('Entrada cancelada');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo onFichajeRapido={showToast} />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Panel de control</Text>
        <Text style={styles.pageSubtitle}>Gestión de tus jornadas de trabajo en Salvagnini.</Text>

        {/* ── Fichaje rápido ── */}
        <View style={styles.fichajeCard}>
          <Text style={styles.fichajeTitle}>Fichaje rápido</Text>
          <Text style={styles.fichajeStatus}>
            {quickEntry?.fin
              ? `Jornada: ${quickEntry.inicio} → ${quickEntry.fin}`
              : quickEntry
              ? `Entrada registrada · ${quickEntry.inicio}`
              : 'Sin entrada registrada'}
          </Text>

          {/* Timer en vivo */}
          {timerActive && elapsed ? (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>Llevas {elapsed}</Text>
            </View>
          ) : null}

          {quickEntry?.fin ? (
            <View style={styles.fichajeRow}>
              <Pressable style={styles.fichajeBtnSecondary} onPress={handleCancelarEntrada}>
                <Text style={styles.fichajeBtnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.fichajeBtnPrimary, { flex: 2 }]} onPress={handleCompletarJornada}>
                <Text style={styles.fichajeBtnPrimaryText}>Completar jornada</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.fichajeRow}>
              {quickEntry ? (
                <Pressable style={styles.fichajeBtnSecondary} onPress={handleCancelarEntrada}>
                  <Text style={styles.fichajeBtnSecondaryText}>{quickEntry.inicio} · Cancelar</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.fichajeBtnEntrada} onPress={handleEntrada}>
                  <Text style={styles.fichajeBtnPrimaryText}>Entrada</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.fichajeBtnPrimary, !quickEntry && styles.fichajeBtnDisabled]}
                onPress={handleSalida}
                disabled={!quickEntry}
              >
                <Text style={styles.fichajeBtnPrimaryText}>Salida</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Estado general ── */}
        <View style={styles.stateCard}>
          <Text style={styles.stateLabel}>Jornadas</Text>
          <Text style={styles.stateValue}>
            {loading
              ? 'Cargando...'
              : total === 0
              ? 'Sin jornadas registradas'
              : `${total} jornada${total === 1 ? '' : 's'} guardada${total === 1 ? '' : 's'}`}
          </Text>
          {latest ? (
            <Text style={styles.stateNote}>
              {`${latest.titulo} · ${latest.inicio ? `${latest.inicio}–${latest.fin} · ` : ''}${latest.duracion}`}
            </Text>
          ) : (
            <Text style={styles.stateNote}>
              Comienza a guardar tus jornadas de trabajo para tener un histórico personal.
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.buttonPrimary} onPress={() => router.push('/nuevo')}>
            <Text style={styles.buttonPrimaryText}>Nuevo registro completo</Text>
          </Pressable>
        </View>

        {/* ── Últimas jornadas ── */}
        {!loading && recientes.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Últimas jornadas</Text>
            {recientes.map((r) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [styles.recentCard, pressed && styles.recentCardPressed]}
                onPress={() => router.push({ pathname: '/registro-detalle', params: { id: r.id } })}
              >
                {/* Etiqueta de tipo con color */}
                <View
                  style={[
                    styles.tipoTag,
                    { backgroundColor: `${TIPO_COLORS[r.titulo] ?? Colors.brand}20` },
                  ]}
                >
                  <View
                    style={[
                      styles.tipoDot,
                      { backgroundColor: TIPO_COLORS[r.titulo] ?? Colors.brand },
                    ]}
                  />
                  <Text
                    style={[styles.tipoTagText, { color: TIPO_COLORS[r.titulo] ?? Colors.brand }]}
                  >
                    {r.titulo}
                  </Text>
                </View>

                <View style={styles.recentCardBody}>
                  <View style={styles.recentCardLeft}>
                    {r.cliente ? (
                      <Text style={styles.recentCardMeta} numberOfLines={1}>{r.cliente}</Text>
                    ) : null}
                    {r.inicio ? (
                      <Text style={styles.recentCardMeta}>{`${r.inicio} — ${r.fin}`}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.recentCardDuracion}>{r.duracion}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : !loading && recientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin jornadas aún</Text>
            <Text style={styles.emptyText}>Registra tu primera jornada para verla aquí.</Text>
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
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4,
      zIndex: 10, elevation: 6, backgroundColor: C.background,
    },
    page: { padding: 24, paddingTop: 16, gap: 20, paddingBottom: 40 },
    title: { fontSize: 32, fontWeight: '800', color: C.text, marginBottom: 4 },
    pageSubtitle: { fontSize: 15, color: C.textSecondary, lineHeight: 22, marginBottom: 12 },

    fichajeCard: {
      backgroundColor: C.card, borderRadius: 24, padding: 20, gap: 12,
      borderWidth: 1, borderColor: C.border,
      shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 }, elevation: 3,
    },
    fichajeTitle: {
      fontSize: 13, fontWeight: '700', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    fichajeStatus: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
    timerBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#22c55e18',
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5,
      borderWidth: 1, borderColor: '#22c55e40',
    },
    timerText: { fontSize: 14, fontWeight: '700', color: '#22c55e' },
    fichajeRow: { flexDirection: 'row', gap: 12 },
    fichajeBtnPrimary: {
      flex: 1, backgroundColor: Colors.brand, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center',
    },
    fichajeBtnEntrada: {
      flex: 1, backgroundColor: '#22c55e', borderRadius: 14,
      paddingVertical: 14, alignItems: 'center',
    },
    fichajeBtnDisabled: { backgroundColor: '#d1d5db' },
    fichajeBtnPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    fichajeBtnSecondary: {
      flex: 1, backgroundColor: `${Colors.brand}15`, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center',
      borderWidth: 1, borderColor: `${Colors.brand}40`,
    },
    fichajeBtnSecondaryText: { color: Colors.brand, fontSize: 14, fontWeight: '700' },

    stateCard: {
      backgroundColor: C.card, borderRadius: 24, padding: 24,
      shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 }, elevation: 4,
    },
    stateLabel: {
      fontSize: 14, fontWeight: '700', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
    },
    stateValue: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 8 },
    stateNote: { fontSize: 15, lineHeight: 22, color: C.textSecondary },

    actions: { gap: 14 },
    buttonPrimary: {
      backgroundColor: Colors.brand, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
    },
    buttonPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

    recentSection: { gap: 10 },
    recentTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
    recentCard: {
      backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 10,
      shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 }, elevation: 2,
    },
    recentCardPressed: { opacity: 0.7 },
    tipoTag: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start', borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4,
    },
    tipoDot: { width: 7, height: 7, borderRadius: 4 },
    tipoTagText: { fontSize: 11, fontWeight: '700' },
    recentCardBody: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    recentCardLeft: { flex: 1, marginRight: 12 },
    recentCardMeta: { fontSize: 13, color: C.textMuted, marginTop: 2 },
    recentCardDuracion: { fontSize: 16, fontWeight: '800', color: Colors.brand },

    emptyState: {
      backgroundColor: C.card, borderRadius: 22, padding: 32,
      alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 8,
    },
    emptyIcon: { fontSize: 36 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
    emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
