import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ClienteSearchInput } from '@/components/cliente-search-input';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/app-settings-context';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import {
  DIETA_OPTS,
  TIPOS_TRABAJO,
  needsCliente,
  useJornadaForm,
} from '@/hooks/useJornadaForm';
import { formatFecha, offsetDateStr, todayDateStr } from '@/utils/date';
import { parseHoursInput } from '@/utils/time';
import type { JornadaTemplate } from '@/src/domain/app-settings';

export default function NuevoRegistroScreen() {
  const router = useRouter();
  const {
    inicioPreset, finPreset, finFechaPreset, fechaPreset, descripcionPreset,
  } = useLocalSearchParams<{
    inicioPreset?: string;
    finPreset?: string;
    finFechaPreset?: string;
    fechaPreset?: string;
    descripcionPreset?: string;
  }>();
  const { addRegistro, saveQuickEntry } = useRegistro();
  const { templates, addTemplate } = useAppSettings();
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
    validationError,
    extrasError,
    canSave,
  } = useJornadaForm({
    initialInicio1:     inicioPreset      ?? '08:00',
    initialFin1:        finPreset         ?? '13:00',
    initialInicio2:     inicioPreset ? '' : '14:00',
    initialFin2:        inicioPreset ? '' : '17:00',
    initialDescripcion: descripcionPreset ?? '',
    allowNextDay: Boolean(fechaPreset && finFechaPreset && finFechaPreset > fechaPreset),
  });

  const tipoLabel = TIPOS_TRABAJO.find((t) => t.value === tipoJornada)?.label;

  const applyTemplate = (template: JornadaTemplate) => {
    setTipoJornada(template.tipo);
    setNombreCliente(template.cliente ?? '');
    setInicio1(template.inicio1 ?? '08:00');
    setFin1(template.fin1 ?? '13:00');
    setInicio2(template.inicio2 ?? '');
    setFin2(template.fin2 ?? '');
    setHomeRecoveryInput(template.homeRecoveryHours ?? '');
    setExternalHoursInput(template.externalHours ?? '');
    setDieta(template.dieta ?? 'ninguna');
    setPernocta(template.pernocta ?? false);
    showToast(`Plantilla aplicada: ${template.name}`);
  };

  const handleSaveTemplate = async () => {
    if (!tipoJornada) return;
    await addTemplate({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      name: nombreCliente.trim()
        ? `${tipoJornada} · ${nombreCliente.trim()}`
        : `${tipoJornada} personalizado`,
      tipo: tipoJornada as JornadaTemplate['tipo'],
      cliente: nombreCliente.trim() || undefined,
      inicio1, fin1,
      inicio2: inicio2 || undefined,
      fin2: fin2 || undefined,
      homeRecoveryHours: homeRecoveryInput || undefined,
      externalHours: externalHoursInput || undefined,
      dieta, pernocta,
    });
    showToast('Plantilla guardada');
  };

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
          finFecha: undefined,
          duracion: effectiveDuration,
          homeRecoveryHours: homeRecoveryInput.trim() || undefined,
          externalHours:     externalHoursInput.trim() || undefined,
          dieta, pernocta,
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
          finFecha: finFechaPreset && finFechaPreset > fecha ? finFechaPreset : undefined,
          duracion: effectiveDuration,
          dieta, pernocta,
          horasExtras: (parseHoursInput(horasExtras) ?? 0) / 60,
          descripcion: descripcion.trim(),
        });
      }
      if (inicioPreset) await saveQuickEntry(null);
      showToast('Jornada guardada');
      navTimerRef.current = setTimeout(() => router.replace('/registros'), 1200);
    } catch {
      showToast('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo screenTitle="Nueva jornada" />
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Plantillas rápidas ── */}
        {templates.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateRow}
          >
            {templates.map((template) => (
              <Pressable
                key={template.id}
                style={styles.templateChip}
                onPress={() => applyTemplate(template)}
              >
                <Text style={styles.templateChipText}>{template.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── Fecha ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>FECHA</Text>
          <View style={styles.cardSep} />
          <View style={styles.dateNav}>
            <Pressable onPress={() => setFecha((f) => offsetDateStr(f, -1))} style={styles.dateNavBtn}>
              <Text style={styles.dateNavArrow}>‹</Text>
            </Pressable>
            <Text style={styles.dateNavLabel}>{formatFecha(fecha)}</Text>
            <Pressable
              onPress={() => setFecha((f) => offsetDateStr(f, 1))}
              style={[styles.dateNavBtn, fecha >= today && styles.dateNavBtnOff]}
              disabled={fecha >= today}
            >
              <Text style={[styles.dateNavArrow, fecha >= today && styles.dateNavArrowOff]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Tipo de jornada (dropdown) ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TIPO DE JORNADA</Text>
          <View style={styles.cardSep} />
          <Pressable
            style={styles.select}
            onPress={() => setTipoOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: tipoOpen }}
          >
            <Text style={tipoLabel ? styles.selectText : styles.selectPlaceholder}>
              {tipoLabel ?? 'Selecciona el tipo de jornada'}
            </Text>
            <Text style={styles.selectChevron}>{tipoOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {tipoOpen && (
            <View style={styles.dropdownList}>
              {TIPOS_TRABAJO.map((tipo) => (
                <Pressable
                  key={tipo.value}
                  style={[
                    styles.dropdownItem,
                    tipoJornada === tipo.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => { setTipoJornada(tipo.value); setTipoOpen(false); }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    tipoJornada === tipo.value && styles.dropdownItemTextActive,
                  ]}>
                    {tipo.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Cliente ── */}
        {needsCliente(tipoJornada) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              CLIENTE <Text style={styles.requiredMark}>*</Text>
            </Text>
            <View style={styles.cardSep} />
            <View style={styles.cardPad}>
              <ClienteSearchInput value={nombreCliente} onChangeText={setNombreCliente} />
            </View>
          </View>
        )}

        {/* ── Horario (tramos, no Mixto) ── */}
        {!isMixed && tipoJornada.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HORARIO</Text>
            <View style={styles.cardSep} />
            <View style={styles.cardPad}>
              <Text style={styles.rowLabel}>Tramo 1</Text>
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

              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Tramo 2 (tarde)</Text>
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
            </View>

            <View style={styles.cardSep} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total trabajado</Text>
              <Text style={[styles.totalValue, !duracion && styles.totalInvalid]}>
                {duracion ?? 'Revisa los horarios'}
              </Text>
            </View>
            {validationError ? <Text style={styles.fieldError}>{validationError}</Text> : null}
          </View>
        )}

        {/* ── Desglose Mixto ── */}
        {isMixed && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DESGLOSE DE HORAS</Text>
            <View style={styles.cardSep} />
            <View style={styles.cardPad}>
              <Text style={styles.rowLabel}>Casa / recuperación</Text>
              <TextInput
                style={styles.input}
                placeholder="p.ej. 2:00 o 2"
                placeholderTextColor={C.textFaint}
                value={homeRecoveryInput}
                onChangeText={setHomeRecoveryInput}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={[styles.rowLabel, { marginTop: 12 }]}>Cliente / exterior</Text>
              <TextInput
                style={styles.input}
                placeholder="p.ej. 6:30 o 6.5"
                placeholderTextColor={C.textFaint}
                value={externalHoursInput}
                onChangeText={setExternalHoursInput}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.cardSep} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total jornada</Text>
              <Text style={[styles.totalValue, !mixedDuration && styles.totalInvalid]}>
                {mixedDuration ?? 'Introduce al menos un tramo'}
              </Text>
            </View>
            {validationError ? <Text style={styles.fieldError}>{validationError}</Text> : null}
          </View>
        )}

        {/* ── Detalles (dieta + pernocta + extras) ── */}
        {tipoJornada.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DETALLES</Text>
            <View style={styles.cardSep} />

            {/* Dieta */}
            <View style={styles.detailRow}>
              <Text style={styles.detailRowLabel}>Dieta</Text>
              <View style={styles.chipRow}>
                {DIETA_OPTS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, dieta === opt.value && styles.chipActive]}
                    onPress={() => setDieta(opt.value)}
                  >
                    <Text style={[styles.chipText, dieta === opt.value && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.cardSep} />

            {/* Pernocta */}
            <View style={styles.detailRow}>
              <Text style={styles.detailRowLabel}>Pernocta</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, !pernocta && styles.chipActive]}
                  onPress={() => setPernocta(false)}
                >
                  <Text style={[styles.chipText, !pernocta && styles.chipTextActive]}>No</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, pernocta && styles.chipActive]}
                  onPress={() => setPernocta(true)}
                >
                  <Text style={[styles.chipText, pernocta && styles.chipTextActive]}>Sí</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.cardSep} />

            {/* Horas extras */}
            <View style={styles.cardPad}>
              <Text style={styles.rowLabel}>Horas extras (+25 %)</Text>
              <TextInput
                style={[styles.input, extrasError && styles.inputError]}
                placeholder="0"
                placeholderTextColor={C.textFaint}
                value={horasExtras}
                onChangeText={(v) => setHorasExtras(v.replace(/[^0-9.:,]/g, ''))}
                keyboardType="numbers-and-punctuation"
              />
              {extrasError ? <Text style={styles.fieldError}>{extrasError}</Text> : null}
            </View>
          </View>
        )}

        {/* ── Notas ── */}
        {tipoJornada.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>NOTAS</Text>
            <View style={styles.cardSep} />
            <View style={styles.cardPad}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tareas, incidencias o notas del día"
                placeholderTextColor={C.textFaint}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
              />
            </View>
          </View>
        )}

        {/* ── Acciones ── */}
        <Pressable
          style={[styles.btnPrimary, (!canSave || saving) && styles.btnDisabled]}
          onPress={handleGuardar}
          disabled={!canSave || saving}
          accessibilityRole="button"
        >
          <Text style={styles.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar jornada'}</Text>
        </Pressable>

        {tipoJornada ? (
          <Pressable style={styles.btnSecondary} onPress={handleSaveTemplate}>
            <Text style={styles.btnSecondaryText}>Guardar como plantilla</Text>
          </Pressable>
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
      paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
      backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    page: {
      padding: 20, paddingTop: 16, gap: 14, paddingBottom: 40,
      width: '100%', maxWidth: 720, alignSelf: 'center',
    },

    // ── Plantillas ──
    templateRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    templateChip: {
      paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14,
      backgroundColor: C.subtleBg, borderWidth: 1, borderColor: C.border,
    },
    templateChipText: { color: C.text, fontSize: 13, fontWeight: '600' },

    // ── Card base ──
    card: {
      backgroundColor: C.card,
      borderRadius: 20, borderWidth: 1, borderColor: C.border,
      overflow: 'hidden',
    },
    cardLabel: {
      fontSize: 11, fontWeight: '800', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 1.3,
      paddingHorizontal: 16, paddingTop: 13, paddingBottom: 9,
    },
    cardSep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
    cardPad: { padding: 14, gap: 8 },
    requiredMark: { color: Colors.brand },

    // ── Fecha ──
    dateNav: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 4, paddingVertical: 2,
    },
    dateNavBtn: { padding: 12, borderRadius: 10 },
    dateNavBtnOff: { opacity: 0.25 },
    dateNavArrow: { fontSize: 28, color: Colors.brand, fontWeight: '500', lineHeight: 32 },
    dateNavArrowOff: { color: C.textFaint },
    dateNavLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },

    // ── Dropdown tipo ──
    select: {
      flexDirection: 'row', alignItems: 'center',
      padding: 15, gap: 8,
    },
    selectText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
    selectPlaceholder: { flex: 1, fontSize: 15, color: C.textFaint },
    selectChevron: { fontSize: 11, color: C.textMuted, fontWeight: '700' },
    dropdownList: {
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    },
    dropdownItem: {
      paddingVertical: 14, paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator,
    },
    dropdownItemActive: { backgroundColor: `${Colors.brand}10` },
    dropdownItemText: { fontSize: 15, color: C.text, fontWeight: '400' },
    dropdownItemTextActive: { color: Colors.brand, fontWeight: '700' },

    // ── Inputs ──
    input: {
      backgroundColor: C.background, borderRadius: 12, padding: 13,
      fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border,
    },
    inputError: { borderColor: '#f59e0b' },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    timeInput: { flex: 1 },
    timeSep: { fontSize: 16, color: C.textFaint, fontWeight: '500' },
    rowLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, marginBottom: 4 },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 13,
    },
    totalLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    totalValue: { fontSize: 16, fontWeight: '800', color: C.text },
    totalInvalid: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
    fieldError: { fontSize: 12, color: '#f59e0b', fontWeight: '600', paddingHorizontal: 16, paddingBottom: 10 },

    // ── Detalles: dieta / pernocta ──
    detailRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 12, gap: 12,
    },
    detailRowLabel: { fontSize: 14, fontWeight: '600', color: C.text, width: 80 },
    chipRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10,
      backgroundColor: C.background, borderWidth: 1, borderColor: C.border,
    },
    chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    chipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: '#fff' },

    // ── Botones ──
    btnPrimary: {
      backgroundColor: Colors.brand, borderRadius: 16,
      paddingVertical: 17, alignItems: 'center',
    },
    btnDisabled: { backgroundColor: '#d1d5db' },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    btnSecondary: {
      borderRadius: 16, paddingVertical: 15, alignItems: 'center',
      borderWidth: 1, borderColor: Colors.brand,
    },
    btnSecondaryText: { color: Colors.brand, fontSize: 15, fontWeight: '600' },
  });
}
