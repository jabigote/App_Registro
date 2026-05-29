import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { type Dieta, useRegistro } from '@/contexts/registro-context';
import { formatFecha, offsetDateStr, todayDateStr } from '@/utils/date';

const TIPOS_JORNADA = [
  { value: 'Casa',        label: 'Casa (recuperación de horas)' },
  { value: 'Cliente',     label: 'Cliente' },
  { value: 'Mixto',       label: 'Mixto' },
  { value: 'Oficina',     label: 'Oficina' },
  { value: 'Teletrabajo', label: 'Teletrabajo' },
];

const DIETA_OPTS: { value: Dieta; label: string }[] = [
  { value: 'ninguna', label: 'Sin dieta' },
  { value: 'media', label: '½ Dieta' },
  { value: 'completa', label: 'Dieta completa' },
];

const DIETA_LABEL: Record<Dieta, string> = {
  ninguna: 'Sin dieta',
  media: '½ Dieta',
  completa: 'Dieta completa',
};

const STANDARD_END_MIN = 17 * 60;

function parseTime(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
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

function needsCliente(tipo: string) {
  return tipo === 'Cliente' || tipo === 'Mixto';
}

export default function RegistroDetalleScreen() {
  const { id, editMode: editParam } = useLocalSearchParams<{ id: string; editMode?: string }>();
  const router = useRouter();
  const { registros, updateRegistro, deleteRegistro } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();

  const [editMode, setEditMode] = useState(editParam === '1');
  const [menuVisible, setMenuVisible] = useState(false);

  const registro = registros.find((r) => r.id === id);

  const today = todayDateStr();
  const [fecha, setFecha] = useState(
    registro?.fecha ?? registro?.createdAt?.slice(0, 10) ?? today
  );
  const [tipoJornada, setTipoJornada] = useState(registro?.titulo ?? '');
  const [tipoOpen, setTipoOpen] = useState(false);
  const [nombreCliente, setNombreCliente] = useState(registro?.cliente ?? '');
  const [inicio1, setInicio1] = useState(registro?.inicio ?? '08:00');
  const [fin1, setFin1] = useState(registro?.fin1 ?? registro?.fin ?? '13:00');
  const [inicio2, setInicio2] = useState(registro?.inicio2 ?? '');
  const [fin2, setFin2] = useState(registro?.inicio2 ? (registro?.fin ?? '17:00') : '');
  const [dieta, setDieta] = useState<Dieta>(registro?.dieta ?? 'ninguna');
  const [pernocta, setPernocta] = useState(registro?.pernocta ?? false);
  const [horasExtras, setHorasExtras] = useState(String(registro?.horasExtras ?? 0));
  const [descripcion, setDescripcion] = useState(registro?.descripcion ?? '');

  const { duracion, suggestedExtras } = useMemo(() => {
    const s1 = parseTime(inicio1); const e1 = parseTime(fin1);
    if (s1 === null || e1 === null || e1 <= s1) return { duracion: null, suggestedExtras: null };
    let total = e1 - s1;
    let lastEnd = e1;

    const has2 = inicio2.trim().length > 0 || fin2.trim().length > 0;
    if (has2) {
      const s2 = parseTime(inicio2); const e2 = parseTime(fin2);
      if (s2 === null || e2 === null || e2 <= s2) return { duracion: null, suggestedExtras: null };
      total += e2 - s2;
      lastEnd = e2;
    }

    const extraMin = Math.max(0, lastEnd - STANDARD_END_MIN);
    const suggestedExtras = Math.round(extraMin / 60 * 10) / 10;

    return { duracion: fmtDuration(total), suggestedExtras };
  }, [inicio1, fin1, inicio2, fin2]);

  useEffect(() => {
    if (suggestedExtras !== null) {
      setHorasExtras(suggestedExtras > 0 ? String(suggestedExtras) : '0');
    }
  }, [suggestedExtras]);

  const canSave =
    tipoJornada.length > 0 &&
    (!needsCliente(tipoJornada) || nombreCliente.trim().length > 0) &&
    duracion !== null;

  if (!registro) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Registro no encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const confirmDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Eliminar jornada',
      '¿Seguro que quieres eliminar esta jornada? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => { await deleteRegistro(id!); router.back(); },
        },
      ]
    );
  };

  const handleGuardar = async () => {
    if (!canSave || !duracion) return;
    const has2 = inicio2.trim().length > 0 && fin2.trim().length > 0;
    await updateRegistro(id!, {
      titulo: tipoJornada,
      cliente: needsCliente(tipoJornada) ? nombreCliente.trim() : undefined,
      fecha,
      inicio: inicio1,
      fin1: fin1,
      inicio2: has2 ? inicio2 : undefined,
      fin: has2 ? fin2 : fin1,
      duracion,
      dieta,
      pernocta,
      horasExtras: Number(horasExtras) || 0,
      descripcion: descripcion.trim(),
    });
    setEditMode(false);
    showToast('Cambios guardados');
  };

  const dietaLabel = DIETA_LABEL[registro.dieta ?? 'ninguna'];
  const extras = registro.horasExtras && registro.horasExtras > 0
    ? `${registro.horasExtras}h extra` : null;
  const registroFecha = registro.fecha ?? registro.createdAt.slice(0, 10);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => { setEditMode(false); setMenuVisible(false); router.back(); }}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Volver</Text>
        </Pressable>

        <View style={styles.topBarRight}>
          {editMode ? (
            <Pressable onPress={() => setEditMode(false)} style={styles.backBtn}>
              <Text style={[styles.backBtnText, { color: '#6b7280' }]}>Cancelar</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => setMenuVisible((v) => !v)}
                style={[styles.menuBubble, menuVisible && styles.menuBubbleActive]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.menuBubbleText}>···</Text>
              </Pressable>
              {menuVisible && (
                <View style={styles.floatingMenu}>
                  <Pressable
                    style={styles.floatingMenuItem}
                    onPress={() => { setMenuVisible(false); setEditMode(true); }}
                  >
                    <Text style={styles.floatingMenuText}>Editar</Text>
                  </Pressable>
                  <View style={styles.floatingMenuDivider} />
                  <Pressable style={styles.floatingMenuItem} onPress={confirmDelete}>
                    <Text style={[styles.floatingMenuText, styles.floatingMenuDestructive]}>Eliminar</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setMenuVisible(false)}
      >
        {/* ── VIEW MODE ── */}
        {!editMode && (
          <>
            <Text style={styles.pageTitle}>{registro.titulo}</Text>
            <View style={styles.infoCard}>
              <Row label="Fecha" value={formatFecha(registroFecha)} />
              {registro.cliente ? <Row label="Cliente" value={registro.cliente} /> : null}
              {registro.inicio2 ? (
                <>
                  <Row label="Tramo 1" value={`${registro.inicio} — ${registro.fin1 ?? registro.fin}`} />
                  <Row label="Tramo 2" value={`${registro.inicio2} — ${registro.fin}`} />
                </>
              ) : registro.inicio ? (
                <Row label="Horario" value={`${registro.inicio} — ${registro.fin}`} />
              ) : null}
              <Row label="Duración" value={registro.duracion} />
              <Row label="Dieta" value={dietaLabel} />
              <Row label="Pernocta" value={registro.pernocta ? 'Sí' : 'No'} />
              {extras ? <Row label="Horas extras" value={extras} /> : null}
              {registro.descripcion ? <Row label="Descripción" value={registro.descripcion} /> : null}
            </View>
          </>
        )}

        {/* ── EDIT MODE ── */}
        {editMode && (
          <>
            <Text style={styles.pageTitle}>Editar jornada</Text>

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

            <View style={styles.fieldset}>
              <Text style={styles.fieldLabel}>Horario</Text>

              <Text style={styles.tramoLabel}>Tramo 1</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={inicio1}
                  onChangeText={setInicio1}
                  keyboardType="numbers-and-punctuation"
                  placeholder="08:00"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.timeSep}>→</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={fin1}
                  onChangeText={setFin1}
                  keyboardType="numbers-and-punctuation"
                  placeholder="13:00"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <Text style={[styles.tramoLabel, { marginTop: 10 }]}>Tramo 2 (tarde)</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={inicio2}
                  onChangeText={setInicio2}
                  keyboardType="numbers-and-punctuation"
                  placeholder="14:00"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.timeSep}>→</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={fin2}
                  onChangeText={setFin2}
                  keyboardType="numbers-and-punctuation"
                  placeholder="17:00"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total trabajado</Text>
                <Text style={[styles.totalValue, !duracion && styles.totalInvalid]}>
                  {duracion ?? 'Revisa los horarios'}
                </Text>
              </View>
            </View>

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

            <View style={styles.fieldset}>
              <Text style={styles.fieldLabel}>Horas extras</Text>
              <TextInput
                style={styles.input}
                value={horasExtras}
                onChangeText={(v) => setHorasExtras(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldset}>
              <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                placeholder="Describe tareas o incidencias"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <Pressable
              style={[styles.buttonPrimary, !canSave && styles.buttonDisabled]}
              onPress={handleGuardar}
              disabled={!canSave}
            >
              <Text style={styles.buttonPrimaryText}>Guardar cambios</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 50,
    elevation: 50,
  },
  topBarRight: { position: 'relative' },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 16, fontWeight: '600', color: Colors.brand },
  menuBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBubbleActive: { backgroundColor: Colors.brandDark },
  menuBubbleText: { fontSize: 12, color: '#ffffff', letterSpacing: 2, lineHeight: 14 },
  floatingMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 180,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
    zIndex: 100,
  },
  floatingMenuItem: { paddingVertical: 14, paddingHorizontal: 18 },
  floatingMenuText: { fontSize: 15, fontWeight: '600', color: Colors.brandDark },
  floatingMenuDestructive: { color: '#dc2626' },
  floatingMenuDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 8 },
  page: { padding: 24, paddingTop: 8, gap: 4, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.brandDark, marginBottom: 12 },
  infoCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600', flex: 1 },
  rowValue: { fontSize: 15, color: Colors.brandDark, fontWeight: '700', flex: 2, textAlign: 'right' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, color: '#6b7280' },
  fieldset: { marginTop: 16, gap: 10 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  required: { color: Colors.brand },
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
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.brandDark,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: { flex: 1 },
  timeSep: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
  },
  totalLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.brandDark },
  totalInvalid: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  select: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectOpen: { borderColor: Colors.brand, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  selectText: { fontSize: 16, color: Colors.brandDark, flex: 1 },
  selectPlaceholder: { fontSize: 16, color: '#9ca3af', flex: 1 },
  selectArrow: { fontSize: 11, color: '#6b7280', marginLeft: 8 },
  dropdownList: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.brand,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: `${Colors.brand}15` },
  dropdownItemText: { fontSize: 15, color: Colors.brandDark },
  dropdownItemTextActive: { color: Colors.brand, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.brandDark },
  chipTextSelected: { color: '#ffffff' },
  buttonPrimary: {
    marginTop: 24,
    backgroundColor: Colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
