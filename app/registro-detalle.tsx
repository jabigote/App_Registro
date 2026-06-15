import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ClienteSearchInput } from '@/components/cliente-search-input';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import {
  DIETA_LABEL,
  DIETA_OPTS,
  TIPOS_AUSENCIA_OPTS,
  TIPOS_TRABAJO,
  isAbsence,
  needsAusenciaDesc,
  needsCliente,
  useJornadaForm,
} from '@/hooks/useJornadaForm';
import { formatFecha, offsetDateStr, todayDateStr } from '@/utils/date';
import { durationToMinutes, fmtDuration, parseHoursInput, parseTime } from '@/utils/time';

export default function RegistroDetalleScreen() {
  const { id, editMode: editParam } = useLocalSearchParams<{ id: string; editMode?: string }>();
  const router = useRouter();
  const { registros, addRegistro, updateRegistro, deleteRegistro } = useRegistro();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [editMode, setEditMode] = useState(editParam === '1');
  const [menuVisible, setMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const registro = registros.find((r) => r.id === id);
  const initialAbsenceMinutes = registro ? durationToMinutes(registro.duracion) : 480;
  const [absenceHours, setAbsenceHours] = useState(
    initialAbsenceMinutes % 60 === 0
      ? String(initialAbsenceMinutes / 60)
      : `${Math.floor(initialAbsenceMinutes / 60)}:${String(initialAbsenceMinutes % 60).padStart(2, '0')}`,
  );

  const today = todayDateStr();
  const [fecha, setFecha] = useState(
    registro?.fecha ?? registro?.createdAt?.slice(0, 10) ?? today
  );

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
    initialTipo:          registro?.titulo ?? '',
    initialCliente:       registro?.cliente ?? '',
    initialInicio1:       registro?.inicio ?? '08:00',
    initialFin1:          registro?.fin1 ?? registro?.fin ?? '13:00',
    initialInicio2:       registro?.inicio2 ?? '',
    initialFin2:          registro?.inicio2 ? (registro?.fin ?? '17:00') : '',
    initialHomeRecovery:  registro?.homeRecoveryHours ?? '',
    initialExternalHours: registro?.externalHours ?? '',
    initialDieta:         registro?.dieta ?? 'ninguna',
    initialPernocta:      registro?.pernocta ?? false,
    initialHorasExtras:   String(registro?.horasExtras ?? 0),
    initialDescripcion:   registro?.descripcion ?? '',
    allowNextDay:         true,
  });

  // Definida aquí como closure para acceder a los styles dinámicos
  function Row({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    );
  }

  if (!registro) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BrandLogo />
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
          onPress: async () => {
            try {
              await deleteRegistro(id!);
              router.back();
            } catch {
              showToast('No se pudo eliminar la jornada.', 'error');
            }
          },
        },
      ]
    );
  };

  const duplicateRegistro = async () => {
    if (!registro) return;
    const { id: _id, createdAt: _createdAt, ...copy } = registro;
    try {
      await addRegistro(copy);
      setMenuVisible(false);
      showToast('Jornada duplicada.');
    } catch {
      showToast('No se pudo duplicar la jornada.', 'error');
    }
  };

  const handleGuardar = async () => {
    if (!effectiveCanSave || saving) return;
    setSaving(true);
    try {
      if (isAbsence(tipoJornada)) {
        const absenceMinutes = needsAusenciaDesc(tipoJornada) ? parseHoursInput(absenceHours) : 480;
        if (absenceMinutes === null) return;
        await updateRegistro(id!, {
          titulo:      tipoJornada,
          cliente:     undefined,
          fecha,
          inicio:      '',
          fin1:        undefined,
          inicio2:     undefined,
          fin:         '',
          finFecha:    undefined,
          duracion:    fmtDuration(absenceMinutes),
          homeRecoveryHours: undefined,
          externalHours:     undefined,
          dieta:       undefined,
          pernocta:    undefined,
          horasExtras: undefined,
          descripcion: descripcion.trim(),
        });
      } else if (isMixed) {
        if (!effectiveDuration) return;
        await updateRegistro(id!, {
          titulo:   tipoJornada,
          cliente:  nombreCliente.trim() || undefined,
          fecha,
          inicio:   '',
          fin1:     undefined,
          inicio2:  undefined,
          fin:      '',
          finFecha: undefined,
          duracion: effectiveDuration,
          homeRecoveryHours: homeRecoveryInput.trim() || undefined,
          externalHours:     externalHoursInput.trim() || undefined,
          dieta,
          pernocta,
          horasExtras: (parseHoursInput(horasExtras) ?? 0) / 60,
          descripcion: descripcion.trim(),
        });
      } else {
        if (!effectiveDuration) return;
        const has2 = inicio2.trim().length > 0 && fin2.trim().length > 0;
        const startMinutes = parseTime(inicio1);
        const endMinutes = parseTime(fin1);
        const finFecha = !has2 && startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes
          ? offsetDateStr(fecha, 1)
          : undefined;
        await updateRegistro(id!, {
          titulo:   tipoJornada,
          cliente:  needsCliente(tipoJornada) ? nombreCliente.trim() : undefined,
          fecha,
          inicio:   inicio1,
          fin1:     fin1,
          inicio2:  has2 ? inicio2 : undefined,
          fin:      has2 ? fin2 : fin1,
          finFecha,
          duracion: effectiveDuration,
          homeRecoveryHours: undefined,
          externalHours:     undefined,
          dieta,
          pernocta,
          horasExtras: (parseHoursInput(horasExtras) ?? 0) / 60,
          descripcion: descripcion.trim(),
        });
      }
      setEditMode(false);
      showToast('Cambios guardados');
    } catch {
      showToast('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const isAbsenceRegistro = isAbsence(registro.titulo);
  const tipoOptions = isAbsenceRegistro ? TIPOS_AUSENCIA_OPTS : TIPOS_TRABAJO;
  const absenceHoursError = needsAusenciaDesc(tipoJornada) && parseHoursInput(absenceHours) === null;
  const effectiveCanSave = isAbsence(tipoJornada)
    ? tipoJornada.length > 0 && !absenceHoursError
    : (canSave && Boolean(effectiveDuration));
  const dietaLabel = DIETA_LABEL[registro.dieta ?? 'ninguna'];
  const extras = registro.horasExtras && registro.horasExtras > 0
    ? `${registro.horasExtras}h extra` : null;
  const registroFecha = registro.fecha ?? registro.createdAt.slice(0, 10);
  const registroIsMixed = registro.titulo === 'Mixto';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Encabezado estático ── */}
      <View style={styles.header}>
        <BrandLogo screenTitle={editMode ? 'Editar jornada' : registro.titulo} />
        {/* Botón de acción derecha: ··· (ver) o Cancelar (editar) */}
        {editMode ? (
          <Pressable
            style={styles.headerActionBtn}
            onPress={() => setEditMode(false)}
          >
            <Text style={styles.headerCancelText}>Cancelar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.headerActionBtn}
            onPress={() => setMenuVisible((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
          >
            <Text style={styles.headerDotsText}>···</Text>
          </Pressable>
        )}
      </View>

      {/* Menú flotante editar/eliminar — fuera del header para evitar clipping */}
      {menuVisible && (
        <View style={styles.floatingMenu}>
          <Pressable
            style={styles.floatingMenuItem}
            onPress={() => { setMenuVisible(false); setEditMode(true); }}
          >
            <Text style={styles.floatingMenuText}>Editar</Text>
          </Pressable>
          <View style={styles.floatingMenuDivider} />
          <Pressable style={styles.floatingMenuItem} onPress={duplicateRegistro}>
            <Text style={styles.floatingMenuText}>Duplicar jornada</Text>
          </Pressable>
          <View style={styles.floatingMenuDivider} />
          <Pressable style={styles.floatingMenuItem} onPress={confirmDelete}>
            <Text style={[styles.floatingMenuText, styles.floatingMenuDestructive]}>Eliminar</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setMenuVisible(false)}
      >
        {/* ── VIEW MODE ── */}
        {!editMode && (
          <>
            <View style={styles.infoCard}>
              <Row label="Fecha" value={formatFecha(registroFecha)} />
              {registro.cliente ? <Row label="Cliente" value={registro.cliente} /> : null}
              {registroIsMixed ? (
                <>
                  {registro.homeRecoveryHours
                    ? <Row label="Casa / Recuperación" value={registro.homeRecoveryHours} />
                    : null}
                  {registro.externalHours
                    ? <Row label="Cliente / Exterior" value={registro.externalHours} />
                    : null}
                </>
              ) : registro.inicio2 ? (
                <>
                  <Row label="Tramo 1" value={`${registro.inicio} — ${registro.fin1 ?? registro.fin}`} />
                  <Row label="Tramo 2" value={`${registro.inicio2} — ${registro.fin}`} />
                </>
              ) : registro.inicio ? (
                <Row label="Horario" value={`${registro.inicio} — ${registro.fin}`} />
              ) : null}
              {registro.finFecha && registro.finFecha !== registroFecha
                ? <Row label="Finaliza" value={formatFecha(registro.finFecha)} />
                : null}
              <Row label="Duración" value={registro.duracion} />
              {!isAbsenceRegistro && <Row label="Dieta" value={dietaLabel} />}
              {!isAbsenceRegistro && <Row label="Pernocta" value={registro.pernocta ? 'Sí' : 'No'} />}
              {!isAbsenceRegistro && extras ? <Row label="Horas extras" value={extras} /> : null}
              {registro.descripcion ? <Row label="Descripción" value={registro.descripcion} /> : null}
            </View>
          </>
        )}

        {/* ── EDIT MODE ── */}
        {editMode && (
          <>
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
                    ? tipoOptions.find((t) => t.value === tipoJornada)?.label
                    : 'Selecciona el tipo de jornada'}
                </Text>
                <Text style={styles.selectArrow}>{tipoOpen ? '▲' : '▼'}</Text>
              </Pressable>
              {tipoOpen && (
                <View style={styles.dropdownList}>
                  {tipoOptions.map((tipo) => (
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

            {/* Cliente */}
            {needsCliente(tipoJornada) && (
              <View style={styles.fieldset}>
                <Text style={styles.fieldLabel}>
                  Cliente <Text style={styles.required}>*</Text>
                </Text>
                <ClienteSearchInput value={nombreCliente} onChangeText={setNombreCliente} />
              </View>
            )}

            {/* Horario normal (no Mixto, no ausencia) */}
            {!isMixed && !isAbsence(tipoJornada) && (
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
                    placeholderTextColor={C.textFaint}
                  />
                  <Text style={styles.timeSep}>→</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={fin1}
                    onChangeText={setFin1}
                    keyboardType="numbers-and-punctuation"
                    placeholder="13:00"
                    placeholderTextColor={C.textFaint}
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
                    placeholderTextColor={C.textFaint}
                  />
                  <Text style={styles.timeSep}>→</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={fin2}
                    onChangeText={setFin2}
                    keyboardType="numbers-and-punctuation"
                    placeholder="17:00"
                    placeholderTextColor={C.textFaint}
                  />
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total trabajado</Text>
                  <Text style={[styles.totalValue, !duracion && styles.totalInvalid]}>
                    {duracion ?? 'Revisa los horarios'}
                  </Text>
                </View>
                {validationError ? <Text style={styles.fieldError}>{validationError}</Text> : null}
              </View>
            )}

            {/* Desglose para Mixto */}
            {isMixed && !isAbsence(tipoJornada) && (
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
                {validationError ? <Text style={styles.fieldError}>{validationError}</Text> : null}
              </View>
            )}

            {/* Dieta (solo jornadas de trabajo) */}
            {!isAbsence(tipoJornada) && (
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

            {/* Pernocta (solo jornadas de trabajo) */}
            {!isAbsence(tipoJornada) && (
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

            {/* Horas extras (solo jornadas de trabajo) */}
            {!isAbsence(tipoJornada) && (
              <View style={styles.fieldset}>
                <Text style={styles.fieldLabel}>Horas extras (+25 %)</Text>
                <TextInput
                  style={[styles.input, extrasError && styles.inputError]}
                  value={horasExtras}
                  onChangeText={(v) => setHorasExtras(v.replace(/[^0-9.:,]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textFaint}
                />
                {extrasError ? <Text style={styles.fieldError}>{extrasError}</Text> : null}
              </View>
            )}

            {needsAusenciaDesc(tipoJornada) && (
              <View style={styles.fieldset}>
                <Text style={styles.fieldLabel}>Horas de ausencia</Text>
                <TextInput
                  style={[styles.input, absenceHoursError && styles.inputError]}
                  value={absenceHours}
                  onChangeText={(value) => setAbsenceHours(value.replace(/[^0-9.:,]/g, ''))}
                  keyboardType="numbers-and-punctuation"
                  placeholder="p.ej. 2 o 2:30"
                  placeholderTextColor={C.textFaint}
                />
                {absenceHoursError ? <Text style={styles.fieldError}>Introduce unas horas válidas.</Text> : null}
              </View>
            )}

            {/* Descripción */}
            <View style={styles.fieldset}>
              <Text style={styles.fieldLabel}>
                {isAbsence(tipoJornada) ? 'Motivo / descripción (opcional)' : 'Notas (opcional)'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                placeholder="Tareas, incidencias o notas"
                placeholderTextColor={C.textFaint}
              />
            </View>

            <Pressable
              style={[styles.buttonPrimary, (!effectiveCanSave || saving) && styles.buttonDisabled]}
              onPress={handleGuardar}
              disabled={!effectiveCanSave || saving}
            >
              <Text style={styles.buttonPrimaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
            </Pressable>
          </>
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
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
      zIndex: 10, elevation: 6, backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    // ··· / Cancelar absolutamente posicionado en esquina superior derecha del header
    headerActionBtn: {
      position: 'absolute', right: 24, top: 18, zIndex: 20, padding: 8,
    },
    headerDotsText: { fontSize: 20, color: Colors.brand, fontWeight: '700', letterSpacing: 2 },
    headerCancelText: { fontSize: 15, fontWeight: '600', color: C.textMuted },
    // Menú flotante — absoluto respecto a SafeAreaView, debajo del header
    floatingMenu: {
      position: 'absolute', top: 116, right: 24, width: 180,
      backgroundColor: C.card, borderRadius: 16, paddingVertical: 6,
      shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 }, elevation: 20, zIndex: 100,
    },
    floatingMenuItem: { paddingVertical: 14, paddingHorizontal: 18 },
    floatingMenuText: { fontSize: 15, fontWeight: '600', color: C.text },
    floatingMenuDestructive: { color: '#dc2626' },
    floatingMenuDivider: { height: 1, backgroundColor: C.separator, marginHorizontal: 8 },
    page: {
      padding: 24, paddingTop: 16, gap: 4, paddingBottom: 40,
      width: '100%', maxWidth: 720, alignSelf: 'center',
    },
    infoCard: {
      backgroundColor: C.card, borderRadius: 22, overflow: 'hidden',
      borderWidth: 1, borderColor: C.border,
    },
    row: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 14, paddingHorizontal: 18,
      borderBottomWidth: 1, borderBottomColor: C.separator,
    },
    rowLabel: { fontSize: 14, color: C.textMuted, fontWeight: '600', flex: 1 },
    rowValue: { fontSize: 15, color: C.text, fontWeight: '700', flex: 2, textAlign: 'right' },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: C.textMuted },
    fieldset: { marginTop: 16, gap: 10 },
    fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
    required: { color: Colors.brand },
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
    inputError: { borderColor: '#f59e0b', borderWidth: 1.5 },
    fieldError: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
    select: {
      backgroundColor: C.card, borderRadius: 16, padding: 16,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    selectOpen: { borderColor: Colors.brand, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    selectText: { fontSize: 16, color: C.text, flex: 1 },
    selectPlaceholder: { fontSize: 16, color: C.textFaint, flex: 1 },
    selectArrow: { fontSize: 11, color: C.textMuted, marginLeft: 8 },
    dropdownList: {
      backgroundColor: C.card, borderWidth: 1, borderTopWidth: 0,
      borderColor: Colors.brand, borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
      overflow: 'hidden',
    },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.separator },
    dropdownItemActive: { backgroundColor: `${Colors.brand}15` },
    dropdownItemText: { fontSize: 15, color: C.text },
    dropdownItemTextActive: { color: Colors.brand, fontWeight: '700' },
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: {
      paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    chipSelected: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    chipText: { fontSize: 14, fontWeight: '600', color: C.text },
    chipTextSelected: { color: '#ffffff' },
    buttonPrimary: {
      marginTop: 24, backgroundColor: Colors.brand,
      borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    },
    buttonDisabled: { backgroundColor: '#d1d5db' },
    buttonPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  });
}
