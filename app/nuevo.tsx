import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ClienteSearchInput } from '@/components/cliente-search-input';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { DIETA_OPTS, TIPOS_JORNADA, needsCliente, useJornadaForm } from '@/hooks/useJornadaForm';
import { formatFecha, offsetDateStr, todayDateStr } from '@/utils/date';
import { parseHoursInput } from '@/utils/time';

export default function NuevoRegistroScreen() {
  const router = useRouter();
  const { inicioPreset, finPreset, fechaPreset, descripcionPreset } =
    useLocalSearchParams<{ inicioPreset?: string; finPreset?: string; fechaPreset?: string; descripcionPreset?: string }>();
  const { addRegistro, saveQuickEntry } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const [saving, setSaving] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  useEffect(() => {
    return () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); };
  }, []);

  const [fecha, setFecha] = useState(fechaPreset ?? todayDateStr());
  const today = todayDateStr();

  const {
    tipoJornada, setTipoJornada,
    tipoOpen, setTipoOpen,
    nombreCliente, setNombreCliente,
    inicio1, setInicio1,
    fin1, setFin1,
    inicio2, setInicio2,
    fin2, setFin2,
    homeRecoveryInput, setHomeRecoveryInput,
    externalHoursInput, setExternalHoursInput,
    dieta, setDieta,
    pernocta, setPernocta,
    horasExtras, setHorasExtras,
    descripcion, setDescripcion,
    isMixed,
    duracion,
    mixedDuration,
    effectiveDuration,
    canSave,
  } = useJornadaForm({
    initialInicio1:     inicioPreset      ?? '08:00',
    initialFin1:        finPreset         ?? '13:00',
    initialInicio2:     inicioPreset ? '' : '14:00',
    initialFin2:        inicioPreset ? '' : '17:00',
    initialDescripcion: descripcionPreset ?? '',
    resetOnTipoChange:  true,
  });

  const horasExtrasInvalid = horasExtras.trim().length > 0 && parseHoursInput(horasExtras) === null;

  const handleGuardar = async () => {
    if (!canSave || !effectiveDuration || saving) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      if (isMixed) {
        await addRegistro({
          titulo:   tipoJornada,
          cliente:  nombreCliente.trim() || undefined,
          fecha,
          inicio:   '',
          fin:      '',
          duracion: effectiveDuration,
          homeRecoveryHours: homeRecoveryInput.trim() || undefined,
          externalHours:     externalHoursInput.trim() || undefined,
          dieta,
          pernocta,
          horasExtras: (parseHoursInput(horasExtras) ?? 0) / 60,
          descripcion: descripcion.trim(),
        });
      } else {
        const has2 = inicio2.trim().length > 0 && fin2.trim().length > 0;
        await addRegistro({
          titulo:   tipoJornada,
          cliente:  needsCliente(tipoJornada) ? nombreCliente.trim() : undefined,
          fecha,
          inicio:   inicio1,
          fin1:     fin1,
          inicio2:  has2 ? inicio2 : undefined,
          fin:      has2 ? fin2 : fin1,
          duracion: effectiveDuration,
          dieta,
          pernocta,
          horasExtras: (parseHoursInput(horasExtras) ?? 0) / 60,
          descripcion: descripcion.trim(),
        });
      }
      if (inicioPreset) await saveQuickEntry(null);
      showToast('Jornada guardada');
      navTimerRef.current = setTimeout(() => router.push('/registros'), 1200);
    } catch {
      showToast('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo onFichajeRapido={showToast} />
      </View>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Registro de jornada</Text>
        <Text style={styles.subtitle}>Captura los detalles de tu jornada de trabajo.</Text>

        {/* Fecha */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Fecha de la jornada</Text>
          <View style={styles.dateNav}>
            <Pressable onPress={() => setFecha((f) => offsetDateStr(f, -1))} style={styles.dateNavBtn}>
              <Text style={styles.dateNavBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.dateNavLabel}>{formatFecha(fecha)}</Text>
            <Pressable
              onPress={() => setFecha((f) => offsetDateStr(f, 1))}
              style={[styles.dateNavBtn, fecha >= today && styles.dateNavBtnDisabled]}
              disabled={fecha >= today}
            >
              <Text style={[styles.dateNavBtnText, fecha >= today && styles.dateNavBtnTextDisabled]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Tipo de jornada — chips horizontales */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Tipo de jornada</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tipoChipRow}
          >
            {TIPOS_JORNADA.map((tipo) => (
              <Pressable
                key={tipo.value}
                style={[styles.tipoChip, tipoJornada === tipo.value && styles.tipoChipActive]}
                onPress={() => setTipoJornada(tipo.value)}
              >
                <Text style={[styles.tipoChipText, tipoJornada === tipo.value && styles.tipoChipTextActive]}>
                  {tipo.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Cliente (solo para Cliente y Mixto) */}
        {needsCliente(tipoJornada) && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>
              Cliente <Text style={styles.required}>*</Text>
            </Text>
            <ClienteSearchInput value={nombreCliente} onChangeText={setNombreCliente} />
          </View>
        )}

        {/* HORARIO: tramos normales (no Mixto) */}
        {!isMixed && tipoJornada.length > 0 && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Horario</Text>

            <Text style={styles.tramoLabel}>Tramo 1</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="08:00"
                placeholderTextColor={C.textFaint}
                value={inicio1}
                onChangeText={setInicio1}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.timeSep}>→</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="13:00"
                placeholderTextColor={C.textFaint}
                value={fin1}
                onChangeText={setFin1}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <Text style={[styles.tramoLabel, { marginTop: 10 }]}>Tramo 2 (tarde)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="14:00"
                placeholderTextColor={C.textFaint}
                value={inicio2}
                onChangeText={setInicio2}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.timeSep}>→</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="17:00"
                placeholderTextColor={C.textFaint}
                value={fin2}
                onChangeText={setFin2}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total trabajado</Text>
              <Text style={[styles.totalValue, !duracion && styles.totalInvalid]}>
                {duracion ?? 'Revisa los horarios'}
              </Text>
            </View>
          </View>
        )}

        {/* HORARIO: desglose para Mixto */}
        {isMixed && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Desglose de horas</Text>

            <Text style={styles.tramoLabel}>Horas en casa / recuperación</Text>
            <TextInput
              style={styles.input}
              placeholder="p.ej. 2:00 o 2"
              placeholderTextColor={C.textFaint}
              value={homeRecoveryInput}
              onChangeText={setHomeRecoveryInput}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.tramoLabel, { marginTop: 10 }]}>Horas cliente / exterior</Text>
            <TextInput
              style={styles.input}
              placeholder="p.ej. 6:30 o 6.5"
              placeholderTextColor={C.textFaint}
              value={externalHoursInput}
              onChangeText={setExternalHoursInput}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total jornada</Text>
              <Text style={[styles.totalValue, !mixedDuration && styles.totalInvalid]}>
                {mixedDuration ?? 'Introduce al menos un tramo'}
              </Text>
            </View>
          </View>
        )}

        {/* Dieta */}
        {tipoJornada.length > 0 && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Dieta</Text>
            <View style={styles.chipRow}>
              {DIETA_OPTS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, dieta === opt.value && styles.chipSelected]}
                  onPress={() => setDieta(opt.value)}
                >
                  <Text style={[styles.chipText, dieta === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Pernocta */}
        {tipoJornada.length > 0 && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Pernocta</Text>
            <View style={styles.chipRow}>
              <Pressable style={[styles.chip, !pernocta && styles.chipSelected]} onPress={() => setPernocta(false)}>
                <Text style={[styles.chipText, !pernocta && styles.chipTextSelected]}>No</Text>
              </Pressable>
              <Pressable style={[styles.chip, pernocta && styles.chipSelected]} onPress={() => setPernocta(true)}>
                <Text style={[styles.chipText, pernocta && styles.chipTextSelected]}>Sí</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Horas extras */}
        {tipoJornada.length > 0 && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Horas extras (+25 %)</Text>
            <TextInput
              style={[styles.input, styles.inputCompact, horasExtrasInvalid && styles.inputError]}
              placeholder="0"
              placeholderTextColor={C.textFaint}
              value={horasExtras}
              onChangeText={(v) => setHorasExtras(v.replace(/[^0-9.:,]/g, ''))}
              keyboardType="numbers-and-punctuation"
            />
            {horasExtrasInvalid && (
              <Text style={styles.fieldError}>Formato inválido. Usa p.ej. 1.5 o 1:30</Text>
            )}
          </View>
        )}

        {/* Descripción */}
        {tipoJornada.length > 0 && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tareas, incidencias o notas"
              placeholderTextColor={C.textFaint}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />
          </View>
        )}

        <Pressable
          style={[styles.buttonPrimary, (!canSave || saving) && styles.buttonDisabled]}
          onPress={handleGuardar}
          disabled={!canSave || saving}
        >
          <Text style={styles.buttonPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
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
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4,
      zIndex: 10, elevation: 6, backgroundColor: C.background,
    },
    page: { padding: 24, paddingTop: 16, gap: 4, paddingBottom: 40 },
    title: { fontSize: 30, fontWeight: '800', color: C.text },
    subtitle: { marginTop: 4, marginBottom: 8, color: C.textSecondary, fontSize: 15, lineHeight: 22 },
    required: { color: Colors.brand },
    fieldset: { marginTop: 16, gap: 10 },
    fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
    tramoLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted },
    dateNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 4, paddingVertical: 2,
    },
    dateNavBtn: { padding: 12, borderRadius: 12 },
    dateNavBtnDisabled: { opacity: 0.25 },
    dateNavBtnText: { fontSize: 26, color: Colors.brand, fontWeight: '700', lineHeight: 30 },
    dateNavBtnTextDisabled: { color: C.textFaint },
    dateNavLabel: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1, textAlign: 'center' },
    input: {
      backgroundColor: C.card, borderRadius: 16, padding: 16,
      fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border,
    },
    inputCompact: { paddingVertical: 14 },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    timeInput: { flex: 1 },
    timeSep: { fontSize: 16, color: C.textFaint, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
      borderWidth: 1, borderColor: C.border, marginTop: 4,
    },
    totalLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    totalValue: { fontSize: 16, fontWeight: '800', color: C.text },
    totalInvalid: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
    tipoChipRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
    tipoChip: {
      paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20,
      backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    },
    tipoChipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    tipoChipText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
    tipoChipTextActive: { color: '#ffffff' },
    inputError: { borderColor: '#f59e0b', borderWidth: 1.5 },
    fieldError: { fontSize: 12, color: '#f59e0b', fontWeight: '600', marginTop: -4 },
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: {
      paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    chipSelected: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    chipText: { fontSize: 14, fontWeight: '600', color: C.text },
    chipTextSelected: { color: '#ffffff' },
    buttonPrimary: {
      marginTop: 28, backgroundColor: Colors.brand,
      borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    },
    buttonDisabled: { backgroundColor: '#d1d5db' },
    buttonPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  });
}
