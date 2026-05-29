import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { type Dieta, useRegistro } from '@/contexts/registro-context';
import { formatFecha, offsetDateStr, todayDateStr } from '@/utils/date';

const TIPOS_JORNADA = [
  { value: 'Oficina',     label: 'Oficina' },
  { value: 'Cliente',     label: 'Cliente / Exterior' },
  { value: 'Teletrabajo', label: 'Teletrabajo' },
  { value: 'Mixto',       label: 'Mixto (casa + cliente)' },
  { value: 'Casa',        label: 'Casa (recuperación de horas)' },
];

const DIETA_OPTS: { value: Dieta; label: string }[] = [
  { value: 'ninguna',  label: 'Sin dieta' },
  { value: 'media',    label: '½ Dieta' },
  { value: 'completa', label: 'Dieta completa' },
];

const STANDARD_END_MIN = 17 * 60;

function parseTime(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Convierte "H:MM", "H,5", "H.5" o "H" a minutos. Devuelve null si inválido. */
function parseHoursInput(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed || trimmed === '0') return null;
  const colon = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (m > 59) return null;
    return h * 60 + m;
  }
  const num = parseFloat(trimmed.replace(',', '.'));
  if (!isNaN(num) && num > 0) return Math.round(num * 60);
  return null;
}

function needsCliente(tipo: string) {
  return tipo === 'Cliente' || tipo === 'Mixto';
}

export default function NuevoRegistroScreen() {
  const router = useRouter();
  const { addRegistro } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [fecha, setFecha] = useState(todayDateStr);
  const today = todayDateStr();

  const [tipoJornada, setTipoJornada]   = useState('');
  const [tipoOpen, setTipoOpen]         = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');

  // Horario normal (tramos, para tipos distintos de Mixto)
  const [inicio1, setInicio1] = useState('08:00');
  const [fin1,    setFin1]    = useState('13:00');
  const [inicio2, setInicio2] = useState('14:00');
  const [fin2,    setFin2]    = useState('17:00');

  // Horas desglosadas para Mixto
  const [homeRecoveryInput, setHomeRecoveryInput] = useState('');
  const [externalHoursInput, setExternalHoursInput] = useState('');

  const [dieta,       setDieta]       = useState<Dieta>('ninguna');
  const [pernocta,    setPernocta]    = useState(false);
  const [horasExtras, setHorasExtras] = useState('0');
  const [descripcion, setDescripcion] = useState('');

  const isMixed = tipoJornada === 'Mixto';

  // Duración para tipos con tramos de horario (no Mixto)
  const { duracion, suggestedExtras } = useMemo(() => {
    if (isMixed) return { duracion: null, suggestedExtras: null };

    const s1 = parseTime(inicio1); const e1 = parseTime(fin1);
    if (s1 === null || e1 === null || e1 <= s1) return { duracion: null, suggestedExtras: null };
    let total = e1 - s1;
    let lastEnd = e1;

    const has2 = inicio2.trim().length > 0 || fin2.trim().length > 0;
    if (has2) {
      const s2 = parseTime(inicio2); const e2 = parseTime(fin2);
      if (s2 === null || e2 === null || e2 <= s2) return { duracion: null, suggestedExtras: null };
      total  += e2 - s2;
      lastEnd = e2;
    }

    const extraMin       = Math.max(0, lastEnd - STANDARD_END_MIN);
    const suggestedExtras = Math.round(extraMin / 60 * 10) / 10;
    return { duracion: fmtDuration(total), suggestedExtras };
  }, [isMixed, inicio1, fin1, inicio2, fin2]);

  // Duración para Mixto: suma de ambas partes
  const mixedDuration = useMemo(() => {
    if (!isMixed) return null;
    const homeMin = parseHoursInput(homeRecoveryInput) ?? 0;
    const extMin  = parseHoursInput(externalHoursInput) ?? 0;
    const total   = homeMin + extMin;
    return total > 0 ? fmtDuration(total) : null;
  }, [isMixed, homeRecoveryInput, externalHoursInput]);

  useEffect(() => {
    if (!isMixed && suggestedExtras !== null) {
      setHorasExtras(suggestedExtras > 0 ? String(suggestedExtras) : '0');
    }
  }, [isMixed, suggestedExtras]);

  // Resetear campos al cambiar tipo
  useEffect(() => {
    setNombreCliente('');
    setHomeRecoveryInput('');
    setExternalHoursInput('');
    setHorasExtras('0');
  }, [tipoJornada]);

  const effectiveDuration = isMixed ? mixedDuration : duracion;

  const canSave =
    tipoJornada.length > 0 &&
    (!needsCliente(tipoJornada) || nombreCliente.trim().length > 0) &&
    effectiveDuration !== null;

  const handleGuardar = async () => {
    if (!canSave || !effectiveDuration || saving) return;
    setSaving(true);

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
        horasExtras: Number(horasExtras) || 0,
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
        horasExtras: Number(horasExtras) || 0,
        descripcion: descripcion.trim(),
      });
    }

    showToast('Jornada guardada');
    setTimeout(() => router.push('/registros'), 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo />
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

        {/* Tipo de jornada */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Tipo de jornada</Text>
          <Pressable
            style={[styles.select, tipoOpen && styles.selectOpen]}
            onPress={() => setTipoOpen((p) => !p)}
          >
            <Text style={tipoJornada ? styles.selectText : styles.selectPlaceholder}>
              {tipoJornada
                ? TIPOS_JORNADA.find((t) => t.value === tipoJornada)?.label
                : 'Selecciona el tipo de jornada'}
            </Text>
            <Text style={styles.selectArrow}>{tipoOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {tipoOpen && (
            <View style={styles.dropdownList}>
              {TIPOS_JORNADA.map((tipo) => (
                <Pressable
                  key={tipo.value}
                  style={[styles.dropdownItem, tipoJornada === tipo.value && styles.dropdownItemActive]}
                  onPress={() => { setTipoJornada(tipo.value); setTipoOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, tipoJornada === tipo.value && styles.dropdownItemTextActive]}>
                    {tipo.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Cliente (solo para Cliente y Mixto) */}
        {needsCliente(tipoJornada) && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>
              Cliente <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la empresa o contacto"
              placeholderTextColor="#9ca3af"
              value={nombreCliente}
              onChangeText={setNombreCliente}
              autoCapitalize="words"
            />
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
                placeholderTextColor="#9ca3af"
                value={inicio1}
                onChangeText={setInicio1}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.timeSep}>→</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="13:00"
                placeholderTextColor="#9ca3af"
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
                placeholderTextColor="#9ca3af"
                value={inicio2}
                onChangeText={setInicio2}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.timeSep}>→</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="17:00"
                placeholderTextColor="#9ca3af"
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
              placeholderTextColor="#9ca3af"
              value={homeRecoveryInput}
              onChangeText={setHomeRecoveryInput}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.tramoLabel, { marginTop: 10 }]}>Horas cliente / exterior</Text>
            <TextInput
              style={styles.input}
              placeholder="p.ej. 6:30 o 6.5"
              placeholderTextColor="#9ca3af"
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
            <Text style={styles.fieldLabel}>Horas extras (+50 %)</Text>
            <TextInput
              style={[styles.input, styles.inputCompact]}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={horasExtras}
              onChangeText={(v) => setHorasExtras(v.replace(/[^0-9.:,]/g, ''))}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        )}

        {/* Descripción */}
        {tipoJornada.length > 0 && (
          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tareas, incidencias o notas"
              placeholderTextColor="#9ca3af"
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4,
    zIndex: 10, elevation: 6, backgroundColor: Colors.light.background,
  },
  page: { padding: 24, paddingTop: 16, gap: 4, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.brandDark },
  subtitle: { marginTop: 4, marginBottom: 8, color: '#4b5563', fontSize: 15, lineHeight: 22 },
  required: { color: Colors.brand },
  fieldset: { marginTop: 16, gap: 10 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  tramoLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dateNavBtn: { padding: 12, borderRadius: 12 },
  dateNavBtnDisabled: { opacity: 0.25 },
  dateNavBtnText: { fontSize: 26, color: Colors.brand, fontWeight: '700', lineHeight: 30 },
  dateNavBtnTextDisabled: { color: '#9ca3af' },
  dateNavLabel: {
    fontSize: 16, fontWeight: '700', color: Colors.brandDark,
    flex: 1, textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.light.card, borderRadius: 16,
    padding: 16, fontSize: 16, color: Colors.brandDark,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  inputCompact: { paddingVertical: 14 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: { flex: 1 },
  timeSep: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.light.card, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#e5e7eb', marginTop: 4,
  },
  totalLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.brandDark },
  totalInvalid: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  select: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  selectOpen: { borderColor: Colors.brand, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  selectText: { fontSize: 16, color: Colors.brandDark, flex: 1 },
  selectPlaceholder: { fontSize: 16, color: '#9ca3af', flex: 1 },
  selectArrow: { fontSize: 11, color: '#6b7280', marginLeft: 8 },
  dropdownList: {
    backgroundColor: Colors.light.card, borderWidth: 1, borderTopWidth: 0,
    borderColor: Colors.brand, borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: `${Colors.brand}15` },
  dropdownItemText: { fontSize: 15, color: Colors.brandDark },
  dropdownItemTextActive: { color: Colors.brand, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
    backgroundColor: Colors.light.card, borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipSelected: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.brandDark },
  chipTextSelected: { color: '#ffffff' },
  buttonPrimary: {
    marginTop: 28, backgroundColor: Colors.brand,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
