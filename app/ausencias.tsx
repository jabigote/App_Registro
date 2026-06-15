import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Switch, Text, TextInput, View,
} from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { TIPOS_AUSENCIA_OPTS, needsAusenciaDesc } from '@/hooks/useJornadaForm';
import { todayDateStr } from '@/utils/date';
import { fmtDuration, parseHoursInput } from '@/utils/time';

// ── Calendario ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDayStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** Genera los días del mes con prefijo null para completar la primera semana (lunes primero). */
function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Dom
  const startOffset = (firstDow + 6) % 7;            // 0=Lun … 6=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function AusenciasScreen() {
  const router = useRouter();
  const { addRegistro } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const [saving, setSaving] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const today = todayDateStr();
  const now = new Date();

  // Mes visible en el calendario
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Selección de días (iso strings "YYYY-MM-DD")
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Tipo de ausencia
  const [tipoAusencia, setTipoAusencia] = useState('');

  // Opciones (solo Permiso / Enfermedad)
  const [soloHoras, setSoloHoras]     = useState(false);
  const [horasInput, setHorasInput]   = useState('');
  const [descripcion, setDescripcion] = useState('');

  const showOpts = needsAusenciaDesc(tipoAusencia);

  // Navegación de mes
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const toggleDay = (day: number) => {
    const ds = toDayStr(viewYear, viewMonth, day);
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(ds)) next.delete(ds); else next.add(ds);
      return next;
    });
  };

  const horasMin = soloHoras ? (parseHoursInput(horasInput) ?? null) : 480;
  const horasError = soloHoras && horasInput.trim() !== '' && parseHoursInput(horasInput) === null;
  const canSave =
    !saving &&
    tipoAusencia.length > 0 &&
    selectedDates.size > 0 &&
    (!soloHoras || (horasMin !== null));

  const handleSave = async () => {
    if (!canSave || horasMin === null) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const dates = Array.from(selectedDates).sort();
      for (const d of dates) {
        await addRegistro({
          titulo:      tipoAusencia,
          fecha:       d,
          inicio:      '',
          fin:         '',
          duracion:    fmtDuration(horasMin),
          descripcion: descripcion.trim(),
        });
      }
      const n = dates.length;
      showToast(n > 1 ? `${n} ausencias registradas` : 'Ausencia registrada');
      navTimerRef.current = setTimeout(() => router.replace('/registros'), 1300);
    } catch {
      showToast('Error al guardar. Inténtalo de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Construir grid del mes visible
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selectedCount = selectedDates.size;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo screenTitle="Ausencias" />
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Tipo de ausencia ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TIPO DE AUSENCIA</Text>
          <View style={styles.cardSep} />
          <View style={styles.chipArea}>
            {TIPOS_AUSENCIA_OPTS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, tipoAusencia === opt.value && styles.chipActive]}
                onPress={() => {
                  setTipoAusencia(opt.value);
                  if (!needsAusenciaDesc(opt.value)) {
                    setSoloHoras(false);
                    setHorasInput('');
                    setDescripcion('');
                  }
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: tipoAusencia === opt.value }}
              >
                <Text style={[styles.chipText, tipoAusencia === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Calendario ── */}
        <View style={styles.card}>
          {/* Navegación de mes */}
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} style={styles.monthNavBtn} accessibilityRole="button" accessibilityLabel="Mes anterior">
              <Text style={styles.monthNavArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{MESES[viewMonth]} {viewYear}</Text>
            <Pressable onPress={nextMonth} style={styles.monthNavBtn} accessibilityRole="button" accessibilityLabel="Mes siguiente">
              <Text style={styles.monthNavArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.cardSep} />

          {/* Cabecera de días de la semana */}
          <View style={styles.calendarRow}>
            {DAY_LABELS.map((d) => (
              <View key={d} style={styles.calCell}>
                <Text style={styles.calDayLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grid de días */}
          {rows.map((row, ri) => (
            <View key={ri} style={styles.calendarRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={styles.calCell} />;
                const ds = toDayStr(viewYear, viewMonth, day);
                const isSelected = selectedDates.has(ds);
                const isToday = ds === today;
                const isPast = ds < today;
                return (
                  <Pressable
                    key={ci}
                    style={[styles.calCell, isSelected && styles.calCellSelected]}
                    onPress={() => toggleDay(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day} de ${MESES[viewMonth]} de ${viewYear}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[
                      styles.calDayText,
                      isToday && !isSelected && styles.calDayTextToday,
                      isPast && !isSelected && styles.calDayTextPast,
                      isSelected && styles.calDayTextSelected,
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Contador de días seleccionados */}
          {selectedCount > 0 && (
            <>
              <View style={[styles.cardSep, { marginTop: 8 }]} />
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedInfoText}>
                  {selectedCount === 1 ? '1 día seleccionado' : `${selectedCount} días seleccionados`}
                </Text>
                <Pressable onPress={() => setSelectedDates(new Set())} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* ── Opciones (solo Permiso / Enfermedad) ── */}
        {showOpts && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>OPCIONES</Text>
            <View style={styles.cardSep} />

            {/* Toggle horas parciales */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>Solo por horas</Text>
                <Text style={styles.switchHint}>Activa si es una ausencia parcial del día</Text>
              </View>
              <Switch
                value={soloHoras}
                onValueChange={(v) => { setSoloHoras(v); if (!v) setHorasInput(''); }}
                trackColor={{ false: C.border, true: `${Colors.brand}60` }}
                thumbColor={soloHoras ? Colors.brand : '#f4f3f4'}
              />
            </View>

            {soloHoras && (
              <View style={styles.horasRow}>
                <TextInput
                  style={[styles.input, horasError && styles.inputError]}
                  placeholder="Horas ausentes (p.ej. 2 o 2:30)"
                  placeholderTextColor={C.textFaint}
                  value={horasInput}
                  onChangeText={setHorasInput}
                  keyboardType="numbers-and-punctuation"
                />
                {horasError && <Text style={styles.fieldError}>Formato no válido</Text>}
              </View>
            )}

            <View style={styles.cardSep} />

            {/* Descripción */}
            <View style={styles.descSection}>
              <Text style={styles.optionLabel}>
                {tipoAusencia === 'Enfermedad' ? 'Descripción / diagnóstico' : 'Motivo del permiso'}
                {'  '}<Text style={styles.optional}>opcional</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  tipoAusencia === 'Enfermedad'
                    ? 'Diagnóstico, número de parte médico…'
                    : 'Motivo del permiso…'
                }
                placeholderTextColor={C.textFaint}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
              />
            </View>
          </View>
        )}

        {/* ── Botón guardar ── */}
        <Pressable
          style={[styles.btnPrimary, !canSave && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
        >
          <Text style={styles.btnPrimaryText}>
            {saving
              ? 'Guardando…'
              : selectedCount > 0
              ? `Registrar ${selectedCount === 1 ? 'ausencia' : `${selectedCount} ausencias`}`
              : 'Registrar ausencia'}
          </Text>
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
      paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
      backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    page: {
      padding: 20, paddingTop: 18, gap: 14, paddingBottom: 40,
      width: '100%', maxWidth: 720, alignSelf: 'center',
    },

    // ── Card ──
    card: {
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    cardLabel: {
      fontSize: 11, fontWeight: '800', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 1.3,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    },
    cardSep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },

    // ── Tipo chips ──
    chipArea: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
    chip: {
      paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20,
      backgroundColor: C.background, borderWidth: 1.5, borderColor: C.border,
    },
    chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    chipText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '700' },

    // ── Calendario ──
    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 8, paddingVertical: 12,
    },
    monthNavBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    monthNavArrow: { fontSize: 28, color: Colors.brand, fontWeight: '500', lineHeight: 32 },
    monthLabel: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1, textAlign: 'center' },

    calendarRow: { flexDirection: 'row', paddingHorizontal: 8 },
    calCell: {
      flex: 1, height: 42,
      justifyContent: 'center', alignItems: 'center',
      borderRadius: 21, marginVertical: 1, marginHorizontal: 1,
    },
    calCellSelected: { backgroundColor: Colors.brand },
    calDayLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },
    calDayText: { fontSize: 14, fontWeight: '500', color: C.text },
    calDayTextToday: { color: Colors.brand, fontWeight: '800' },
    calDayTextPast: { color: C.textFaint },
    calDayTextSelected: { color: '#fff', fontWeight: '700' },

    selectedInfo: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    selectedInfoText: { fontSize: 13, fontWeight: '700', color: Colors.brand },
    clearBtn: { paddingVertical: 4, paddingHorizontal: 10 },
    clearBtnText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },

    // ── Opciones ──
    switchRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    switchTextCol: { flex: 1, marginRight: 12 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: C.text },
    switchHint: { fontSize: 12, color: C.textMuted, marginTop: 2 },

    horasRow: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
    descSection: { padding: 14, gap: 8 },
    optionLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
    optional: { fontSize: 12, fontWeight: '400', color: C.textFaint },

    input: {
      backgroundColor: C.background, borderRadius: 14, padding: 14,
      fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border,
    },
    inputError: { borderColor: '#f59e0b' },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    fieldError: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },

    // ── Botón ──
    btnPrimary: {
      backgroundColor: Colors.brand, borderRadius: 16,
      paddingVertical: 17, alignItems: 'center', marginTop: 4,
    },
    btnDisabled: { backgroundColor: '#d1d5db' },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
