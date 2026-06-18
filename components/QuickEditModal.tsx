import { useEffect, useMemo, useState } from 'react';
import {
  Modal, Pressable, SafeAreaView, StyleSheet,
  Switch, Text, TextInput, View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { type Dieta, type Registro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { fmtDuration, parseTime } from '@/utils/time';

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function computeDuration(inicio: string, fin: string): string | null {
  const s = parseTime(inicio);
  const e = parseTime(fin);
  if (s === null || e === null) return null;
  const diff = e < s ? e + 24 * 60 - s : e - s;
  if (diff <= 0) return null;
  return fmtDuration(diff);
}

const DIETA_OPTS: { value: Dieta; label: string }[] = [
  { value: 'ninguna',  label: 'Ninguna' },
  { value: 'media',    label: '½ Dieta' },
  { value: 'completa', label: 'Completa' },
];

type Props = {
  registro: Registro | null;
  onClose: () => void;
  onSave: (data: Partial<Omit<Registro, 'id' | 'createdAt'>>) => Promise<void>;
  onFullEdit: () => void;
};

export function QuickEditModal({ registro, onClose, onSave, onFullEdit }: Props) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [saving, setSaving] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [dieta, setDieta] = useState<Dieta>('ninguna');
  const [pernocta, setPernocta] = useState(false);
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (!registro) return;
    setInicio(registro.inicio);
    setFin(registro.fin);
    setDieta(registro.dieta ?? 'ninguna');
    setPernocta(registro.pernocta ?? false);
    setDescripcion(registro.descripcion);
  }, [registro?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isComplex = Boolean(registro?.fin1 && registro?.inicio2) || registro?.titulo === 'Mixto';
  const newDuration = !isComplex && inicio && fin ? computeDuration(inicio, fin) : null;
  const inicioOk = TIME_RE.test(inicio);
  const finOk = TIME_RE.test(fin);
  const canSave = !isComplex && inicioOk && finOk && newDuration !== null && !saving;

  const handleSave = async () => {
    if (!canSave || !newDuration) return;
    setSaving(true);
    try {
      await onSave({ inicio, fin, duracion: newDuration, dieta, pernocta, descripcion });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={Boolean(registro)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Text style={styles.title}>Edición rápida</Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Text>
          </Pressable>
        </View>

        {/* Info de la jornada */}
        <View style={styles.infoRow}>
          <Text style={styles.infoTipo}>{registro?.titulo}</Text>
          {registro?.fecha ? <Text style={styles.infoFecha}>{registro.fecha}</Text> : null}
        </View>

        {/* Aviso si jornada compleja */}
        {isComplex && (
          <View style={styles.complexWarn}>
            <Text style={styles.complexWarnText}>
              Esta jornada tiene un formato complejo. Usa la edición completa para modificarla.
            </Text>
          </View>
        )}

        <View style={styles.page}>
          {/* Horario */}
          {!isComplex && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>HORARIO</Text>
              <View style={styles.cardSep} />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>Entrada</Text>
                  <TextInput
                    style={[styles.timeInput, !inicioOk && inicio.length > 0 && styles.inputError]}
                    value={inicio}
                    onChangeText={setInicio}
                    placeholder="08:00"
                    placeholderTextColor={C.textFaint}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.timeSep}>→</Text>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>Salida</Text>
                  <TextInput
                    style={[styles.timeInput, !finOk && fin.length > 0 && styles.inputError]}
                    value={fin}
                    onChangeText={setFin}
                    placeholder="17:00"
                    placeholderTextColor={C.textFaint}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>Duración</Text>
                  <Text style={[styles.durationText, !newDuration && inicio && fin ? styles.durationError : null]}>
                    {newDuration ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Dieta */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DIETA</Text>
            <View style={styles.cardSep} />
            <View style={styles.chipRow}>
              {DIETA_OPTS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, dieta === opt.value && styles.chipActive]}
                  onPress={() => setDieta(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dieta === opt.value }}
                >
                  <Text style={[styles.chipText, dieta === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Pernocta */}
          <View style={[styles.card, styles.switchCard]}>
            <Text style={styles.switchLabel}>Pernocta</Text>
            <Switch
              value={pernocta}
              onValueChange={setPernocta}
              trackColor={{ false: C.border, true: `${Colors.brand}60` }}
              thumbColor={pernocta ? Colors.brand : '#f4f3f4'}
            />
          </View>

          {/* Descripción */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>NOTAS</Text>
            <View style={styles.cardSep} />
            <TextInput
              style={styles.notasInput}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Notas de la jornada…"
              placeholderTextColor={C.textFaint}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Edición completa */}
          <Pressable style={styles.fullEditBtn} onPress={onFullEdit} accessibilityRole="button">
            <Text style={styles.fullEditText}>Editar todos los campos →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    headerBtn: { minWidth: 80, minHeight: 44, justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '700', color: C.text },
    cancelText: { fontSize: 16, color: C.textSecondary, fontWeight: '500' },
    saveText: { fontSize: 16, color: Colors.brand, fontWeight: '700', textAlign: 'right' },
    saveTextDisabled: { color: C.textFaint },

    infoRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 12,
      backgroundColor: C.subtleBg,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    infoTipo: { fontSize: 15, fontWeight: '700', color: C.text },
    infoFecha: { fontSize: 13, color: C.textMuted },

    complexWarn: {
      backgroundColor: 'rgba(245,158,11,0.1)', margin: 16, marginBottom: 0,
      borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    },
    complexWarnText: { fontSize: 14, color: '#b45309', lineHeight: 20 },

    page: { padding: 16, gap: 12, flex: 1 },

    card: {
      backgroundColor: C.card, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    cardLabel: {
      fontSize: 11, fontWeight: '800', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 1.2,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    },
    cardSep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },

    timeRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, gap: 8,
    },
    timeField: { flex: 1, alignItems: 'center', gap: 4 },
    timeFieldLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase' },
    timeInput: {
      fontSize: 20, fontWeight: '700', color: C.text,
      textAlign: 'center', width: '100%',
      borderBottomWidth: 1.5, borderBottomColor: C.border, paddingVertical: 4,
    },
    inputError: { borderBottomColor: '#f59e0b' },
    timeSep: { fontSize: 20, color: C.textFaint, marginTop: 16 },
    durationText: { fontSize: 16, fontWeight: '700', color: Colors.brand, marginTop: 4 },
    durationError: { color: '#dc2626' },

    chipRow: { flexDirection: 'row', gap: 8, padding: 12 },
    chip: {
      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
      backgroundColor: C.background, borderWidth: 1, borderColor: C.border,
    },
    chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    chipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: '#fff', fontWeight: '700' },

    switchCard: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
    },
    switchLabel: { fontSize: 15, fontWeight: '600', color: C.text },

    notasInput: {
      fontSize: 15, color: C.text, padding: 14, minHeight: 80,
    },

    fullEditBtn: {
      paddingVertical: 14, alignItems: 'center', marginTop: 4,
    },
    fullEditText: { fontSize: 15, color: Colors.brand, fontWeight: '600' },
  });
}
