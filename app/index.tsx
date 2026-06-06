import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { todayDateStr } from '@/utils/date';
import { roundToNearest30 } from '@/utils/time';

export default function HomeScreen() {
  const router = useRouter();
  const { registros, loading, quickEntry, saveQuickEntry } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const total = registros.length;
  const latest = registros[0];
  const recientes = registros.slice(0, 3);

  const handleEntrada = async () => {
    const hora = roundToNearest30(new Date());
    await saveQuickEntry({ fecha: todayDateStr(), inicio: hora });
    showToast(`Entrada registrada: ${hora}`);
  };

  const handleSalida = async () => {
    if (!quickEntry) return;
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
                <Pressable style={styles.fichajeBtnPrimary} onPress={handleEntrada}>
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

        {!loading && recientes.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Últimas jornadas</Text>
            {recientes.map((r) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [styles.recentCard, pressed && styles.recentCardPressed]}
                onPress={() => router.push({ pathname: '/registro-detalle', params: { id: r.id } })}
              >
                <View style={styles.recentCardLeft}>
                  <Text style={styles.recentCardTitulo} numberOfLines={1}>{r.titulo}</Text>
                  {r.cliente
                    ? <Text style={styles.recentCardMeta} numberOfLines={1}>{r.cliente}</Text>
                    : null}
                  {r.inicio ? <Text style={styles.recentCardMeta}>{`${r.inicio} — ${r.fin}`}</Text> : null}
                </View>
                <Text style={styles.recentCardDuracion}>{r.duracion}</Text>
              </Pressable>
            ))}
          </View>
        )}
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
    fichajeRow: { flexDirection: 'row', gap: 12 },
    fichajeBtnPrimary: {
      flex: 1, backgroundColor: Colors.brand, borderRadius: 14,
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
      backgroundColor: C.card, borderRadius: 18, padding: 16,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 }, elevation: 2,
    },
    recentCardPressed: { opacity: 0.7 },
    recentCardLeft: { flex: 1, marginRight: 12 },
    recentCardTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
    recentCardMeta: { fontSize: 13, color: C.textMuted, marginTop: 3 },
    recentCardDuracion: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  });
}
