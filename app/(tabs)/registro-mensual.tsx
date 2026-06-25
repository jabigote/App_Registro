import { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { type SignaturePadRef, SignaturePad } from '@/components/signature-pad';
import { Colors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/app-settings-context';
import { useAuth } from '@/contexts/auth-context';
import { useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import {
  type MonthlyDayRecord,
  generateMonthlyReportFromTemplate,
  resolveDailyExcelValues,
  shareReportFile,
} from '@/src/services/excel/generateMonthlyReportFromTemplate';
import { buildMonthlyDayRecords } from '@/src/services/excel/build-monthly-records';
import {
  buildTypeSummary,
  buildWeeklySummary,
  formatWeekRange,
  getDayFromRegistro,
  getRegistroDate,
  totalHoursLabel,
  totalMinutesFor,
} from '@/src/services/monthly/analytics';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const TIPO_COLORS: Record<string, string> = {
  Oficina:     '#3b82f6',
  Cliente:     '#f59e0b',
  Teletrabajo: '#8b5cf6',
  Mixto:       '#14b8a6',
  Casa:        '#22c55e',
  Vacaciones:  '#06b6d4',
  Permiso:     '#64748b',
  Enfermedad:  '#ef4444',
  Festivo:     '#ec4899',
};

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtH(h: number | undefined): string {
  if (!h || h <= 0) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}:${String(mm).padStart(2, '0')}` : `${hh}h`;
}

/** Rechaza si la generación tarda más de `ms`: evita un "Generando…" infinito sin feedback. */
export default function RegistroMensualScreen() {
  const { registros } = useRegistro();
  const { usuario } = useAuth();
  const { monthlyTargetHours, lockedMonths, toggleMonthLock } = useAppSettings();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { width: screenWidth } = useWindowDimensions();
  const [exporting, setExporting] = useState(false);
  const [pendingShareUri, setPendingShareUri] = useState<string | null>(null);

  const sigPadRef = useRef<SignaturePadRef>(null);
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const registrosDelMes = registros.filter((r) => {
    const d = getRegistroDate(r);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const [showPreview, setShowPreview] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showWeekly, setShowWeekly] = useState(false);

  // Mapa día → tipo para el calendario
  const dayTipoMap = useMemo(() => {
    const map: Record<number, string> = {};
    registrosDelMes.forEach((r) => { map[getDayFromRegistro(r)] = r.titulo; });
    return map;
  }, [registrosDelMes]);

  // Celdas del calendario: primer día de semana del mes + días
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Lunes = 0 offset
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Completar hasta múltiplo de 7
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const horasPorTipo = useMemo(() => buildTypeSummary(registrosDelMes), [registrosDelMes]);

  const maxMinsTipo = useMemo(
    () => Math.max(...horasPorTipo.map(([, m]) => m), 1),
    [horasPorTipo],
  );

  const semanasData = useMemo(() => buildWeeklySummary(registrosDelMes), [registrosDelMes]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const totalHoras    = totalHoursLabel(registrosDelMes);
  const totalMinutes = totalMinutesFor(registrosDelMes);
  const balanceMinutes = totalMinutes - monthlyTargetHours * 60;
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const prevMonthIdx = month === 0 ? 11 : month - 1;
  const prevYear     = month === 0 ? year - 1 : year;
  const prevMonthRegistros = registros.filter((r) => {
    const d = getRegistroDate(r);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx;
  });
  const prevMonthMinutes = totalMinutesFor(prevMonthRegistros);
  const compareMinutes   = totalMinutes - prevMonthMinutes;
  const isLocked = lockedMonths.includes(monthKey);
  const totalDietas   = registrosDelMes.filter((r) => r.dieta && r.dieta !== 'ninguna').length;
  const totalPernoctas = registrosDelMes.filter((r) => r.pernocta).length;

  const buildRecords = (): MonthlyDayRecord[] => buildMonthlyDayRecords(registrosDelMes);

  // Genera el archivo con el modal aún abierto (botón en "Generando…") y lo cierra al
  // terminar. El share sheet NO se presenta aquí: si se lanza mientras el pageSheet
  // todavía se está cerrando, iOS no puede presentarlo y la promesa queda colgada.
  const handleCapturarFirma = () => {
    const xml = sigPadRef.current?.getSvgXml() ?? null;
    setSignatureSvg(xml);
  };

  const handleExportar = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const uri = await generateMonthlyReportFromTemplate({
        year,
        month:        month + 1,
        employeeName: usuario?.nombre ?? 'Empleado',
        records:      buildRecords(),
        signatureSvg: signatureSvg ?? undefined,
      });
      setPendingShareUri(uri);
      setShowPreview(false); // el share sheet se lanza en onDismiss del modal
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el reporte. Inténtalo de nuevo.');
      console.warn('Error generando Excel:', e);
    } finally {
      setExporting(false);
    }
  };

  // onDismiss se dispara cuando iOS ha terminado de verdad la animación de cierre:
  // es el momento seguro para presentar el share sheet.
  const handlePreviewDismiss = () => {
    if (!pendingShareUri) return;
    const uri = pendingShareUri;
    setPendingShareUri(null);
    shareReportFile(uri, month + 1, year).catch((e) => {
      Alert.alert('Error', 'No se pudo abrir el menú de compartir.');
      console.warn('Error compartiendo Excel:', e);
    });
  };

  const handleVerPrevia = () => {
    if (registrosDelMes.length === 0) {
      Alert.alert('Sin datos', 'No hay jornadas registradas este mes.');
      return;
    }
    setSignatureSvg(null);
    setShowPreview(true);
  };

  const handleMonthLock = () => {
    if (isLocked) {
      Alert.alert(
        'Abrir mes',
        `Se volverán a permitir cambios en ${MESES[month]} ${year}.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir mes', onPress: () => toggleMonthLock(monthKey) },
        ],
      );
      return;
    }
    Alert.alert(
      'Cerrar mes',
      `No se podrán crear, editar ni borrar jornadas de ${MESES[month]} ${year} hasta volver a abrirlo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar mes', onPress: () => toggleMonthLock(monthKey) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo screenTitle="Registro mensual" />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">

        {/* Selector de mes */}
        <View style={styles.monthNav}>
          <Pressable
            style={styles.monthBtn}
            onPress={prevMonth}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
          >
            <Text style={styles.monthBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{MESES[month]} {year}</Text>
          <Pressable
            style={[styles.monthBtn, isCurrentMonth && styles.monthBtnDisabled]}
            onPress={nextMonth}
            disabled={isCurrentMonth}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
          >
            <Text style={[styles.monthBtnText, isCurrentMonth && styles.monthBtnTextDisabled]}>›</Text>
          </Pressable>
        </View>

        {/* Resumen del mes */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{registrosDelMes.length}</Text>
            <Text style={styles.summaryLabel}>Jornadas</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalHoras}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalDietas}</Text>
            <Text style={styles.summaryLabel}>Dietas</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalPernoctas}</Text>
            <Text style={styles.summaryLabel}>Pernoctas</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Balance frente al objetivo de {monthlyTargetHours} h</Text>
            <Text style={[styles.balanceValue, balanceMinutes < 0 && styles.balanceNegative]}>
              {balanceMinutes >= 0 ? '+' : '−'}{fmtMins(Math.abs(balanceMinutes))}
            </Text>
          </View>
          <Pressable
            style={[styles.lockButton, isLocked && styles.lockButtonActive]}
            onPress={handleMonthLock}
            accessibilityRole="button"
            accessibilityLabel={isLocked ? 'Abrir mes cerrado' : 'Cerrar mes para impedir cambios'}
            accessibilityState={{ selected: isLocked }}
          >
            <Text style={[styles.lockButtonText, isLocked && styles.lockButtonTextActive]}>
              {isLocked ? 'Mes cerrado' : 'Cerrar mes'}
            </Text>
          </Pressable>
        </View>

        {/* Comparativa con mes anterior */}
        {prevMonthMinutes > 0 && (
          <View style={styles.compareCard}>
            <Text style={styles.compareLabel}>
              vs. {MESES[prevMonthIdx]} {prevYear}
            </Text>
            <Text style={[styles.compareValue, compareMinutes < 0 && styles.compareNeg]}>
              {compareMinutes >= 0 ? '+' : '−'}{fmtMins(Math.abs(compareMinutes))}
            </Text>
          </View>
        )}

        {/* Calendario del mes */}
        <View style={styles.analyticCard}>
          <Pressable style={styles.analyticHeader} onPress={() => setShowCalendar((v) => !v)}>
            <Text style={styles.analyticTitle}>Calendario</Text>
            <Text style={styles.analyticToggle}>{showCalendar ? '▲' : '▼'}</Text>
          </Pressable>
          {showCalendar && (
            <View style={styles.calBody}>
              {/* Cabecera días de semana */}
              <View style={styles.calRow}>
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <View key={d} style={styles.calCell}>
                    <Text style={styles.calWeekDay}>{d}</Text>
                  </View>
                ))}
              </View>
              {/* Filas de días */}
              {Array.from({ length: calendarCells.length / 7 }, (_, row) => (
                <View key={row} style={styles.calRow}>
                  {calendarCells.slice(row * 7, row * 7 + 7).map((day, col) => {
                    const tipo = day ? dayTipoMap[day] : undefined;
                    const isToday =
                      day === now.getDate() &&
                      month === now.getMonth() &&
                      year === now.getFullYear();
                    return (
                      <View
                        key={col}
                        style={[styles.calCell, isToday && styles.calCellToday]}
                      >
                        {day ? (
                          <>
                            <Text style={[styles.calDayNum, isToday && styles.calDayNumToday]}>
                              {day}
                            </Text>
                            {tipo ? (
                              <View
                                style={[
                                  styles.calDot,
                                  { backgroundColor: TIPO_COLORS[tipo] ?? Colors.brand },
                                ]}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Gráfica distribución por tipo */}
        {registrosDelMes.length > 0 && (
          <View style={styles.analyticCard}>
            <Pressable style={styles.analyticHeader} onPress={() => setShowChart((v) => !v)}>
              <Text style={styles.analyticTitle}>Distribución por tipo</Text>
              <Text style={styles.analyticToggle}>{showChart ? '▲' : '▼'}</Text>
            </Pressable>
            {showChart && (
              <View style={styles.chartBody}>
                {horasPorTipo.map(([tipo, mins]) => (
                  <View key={tipo} style={styles.barRow}>
                    <Text style={styles.barLabel}>{tipo}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width:           `${(mins / maxMinsTipo) * 100}%`,
                            backgroundColor: TIPO_COLORS[tipo] ?? Colors.brand,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>{fmtMins(mins)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Resumen semanal */}
        {registrosDelMes.length > 0 && (
          <View style={styles.analyticCard}>
            <Pressable style={styles.analyticHeader} onPress={() => setShowWeekly((v) => !v)}>
              <Text style={styles.analyticTitle}>Por semanas</Text>
              <Text style={styles.analyticToggle}>{showWeekly ? '▲' : '▼'}</Text>
            </Pressable>
            {showWeekly && (
              <View style={styles.weekBody}>
                {semanasData.map(([weekStart, { mins, count }]) => (
                  <View key={weekStart} style={styles.weekRow}>
                    <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
                    <Text style={styles.weekCount}>{count} jorn.</Text>
                    <Text style={styles.weekTotal}>{fmtMins(mins)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tabla de jornadas */}
        {registrosDelMes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin jornadas este mes</Text>
            <Text style={styles.emptyText}>No hay registros para {MESES[month]} {year}.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellDay,   styles.tableHeaderText]}>Día</Text>
              <Text style={[styles.tableCell, styles.tableCellTipo,  styles.tableHeaderText]}>Tipo</Text>
              <Text style={[styles.tableCell, styles.tableCellHoras, styles.tableHeaderText]}>Horas</Text>
              <Text style={[styles.tableCell, styles.tableCellDieta, styles.tableHeaderText]}>Dieta</Text>
              <Text style={[styles.tableCell, styles.tableCellExtra, styles.tableHeaderText]}>Extra</Text>
            </View>

            {registrosDelMes
              .slice()
              .sort((a, b) => getRegistroDate(a).getTime() - getRegistroDate(b).getTime())
              .map((r) => {
                const day = getDayFromRegistro(r);
                const dietaShort =
                  r.dieta === 'media' ? '½' :
                  r.dieta === 'completa' ? '1' : '—';
                return (
                  <View key={r.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableCellDay, styles.tableCellDayText]}>
                      {String(day).padStart(2, '0')}
                    </Text>
                    <View style={[styles.tableCell, styles.tableCellTipo]}>
                      <Text style={styles.tableTipoText} numberOfLines={1}>{r.titulo}</Text>
                      {r.cliente ? <Text style={styles.tableClienteText} numberOfLines={1}>{r.cliente}</Text> : null}
                    </View>
                    <Text style={[styles.tableCell, styles.tableCellHoras, styles.tableCellValueText]}>
                      {r.duracion}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellDieta, styles.tableCellValueText]}>
                      {dietaShort}{r.pernocta ? ' 🌙' : ''}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellExtra, styles.tableCellValueText]}>
                      {r.horasExtras && r.horasExtras > 0 ? `${r.horasExtras}h` : '—'}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Botón exportar */}
        <Pressable
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleVerPrevia}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>Exportar Excel</Text>
        </Pressable>
      </ScrollView>

      {/* ── Modal de vista previa (columnas de la plantilla Excel) ── */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
        onDismiss={handlePreviewDismiss}
      >
        <SafeAreaView style={styles.pvSafe}>
          {/* Cabecera */}
          <View style={styles.pvHead}>
            <Text style={styles.pvHeadTitle}>Vista previa · plantilla Excel</Text>
            <Text style={styles.pvHeadSub}>{MESES[month]} {year} · {usuario?.nombre ?? 'Empleado'}</Text>
          </View>

          {/* Tabla con las columnas reales de la plantilla (B–P) */}
          <ScrollView style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Cabecera: letra de columna + etiqueta */}
                <View style={[styles.pvRow, styles.pvHeaderRow]}>
                  {[
                    { l: 'B',  lb: 'Día',  s: styles.pvWB },
                    { l: 'C',  lb: 'Vac.', s: styles.pvWC },
                    { l: 'D',  lb: 'Rec.', s: styles.pvWD },
                    { l: 'E',  lb: 'Of.',  s: styles.pvWE },
                    { l: 'F',  lb: 'Ext.', s: styles.pvWF },
                    { l: 'G',  lb: '+25%', s: styles.pvWG },
                    { l: 'J',  lb: 'Tot.', s: styles.pvWJ },
                    { l: 'M',  lb: '½D',   s: styles.pvWM },
                    { l: 'N',  lb: 'D.',   s: styles.pvWN },
                    { l: 'O',  lb: 'Pn.',  s: styles.pvWO },
                    { l: 'P',  lb: 'Act.', s: styles.pvWP },
                  ].map(({ l, lb, s }) => (
                    <View key={l} style={[styles.pvCell, s, styles.pvHeadCell]}>
                      <Text style={styles.pvColLetter}>{l}</Text>
                      <Text style={styles.pvColLabel}>{lb}</Text>
                    </View>
                  ))}
                </View>

                {/* Filas de datos */}
                {buildRecords()
                  .slice()
                  .sort((a, b) => a.day - b.day)
                  .map((rec) => {
                    const cols = resolveDailyExcelValues(rec);
                    return (
                      <View key={rec.day} style={styles.pvRow}>
                        <Text style={[styles.pvCell, styles.pvWB, styles.pvDayTxt]}>
                          {String(rec.day).padStart(2, '0')}
                        </Text>
                        <Text style={[styles.pvCell, styles.pvWC, styles.pvHourTxt]}>{fmtH(cols.C)}</Text>
                        <Text style={[styles.pvCell, styles.pvWD, styles.pvHourTxt]}>{fmtH(cols.D)}</Text>
                        <Text style={[styles.pvCell, styles.pvWE, styles.pvHourTxt]}>{fmtH(cols.E)}</Text>
                        <Text style={[styles.pvCell, styles.pvWF, styles.pvHourTxt]}>{fmtH(cols.F)}</Text>
                        <Text style={[styles.pvCell, styles.pvWG, styles.pvHourTxt]}>{fmtH(cols.G)}</Text>
                        <Text style={[styles.pvCell, styles.pvWJ, styles.pvTotalTxt]}>{fmtH(cols.J)}</Text>
                        <Text style={[styles.pvCell, styles.pvWM, styles.pvCountTxt]}>{cols.M ? '½' : '—'}</Text>
                        <Text style={[styles.pvCell, styles.pvWN, styles.pvCountTxt]}>{cols.N ? '1' : '—'}</Text>
                        <Text style={[styles.pvCell, styles.pvWO, styles.pvCountTxt]}>{cols.O ? '✓' : '—'}</Text>
                        <Text style={[styles.pvCell, styles.pvWP, styles.pvActTxt]} numberOfLines={1}>
                          {cols.P ?? '—'}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </ScrollView>
          </ScrollView>

          {/* Totales */}
          <View style={styles.pvSummary}>
            <Text style={styles.pvSummaryTxt}>
              {registrosDelMes.length} jornadas · {totalHoras}
              {totalDietas > 0    ? ` · ${totalDietas} dietas`      : ''}
              {totalPernoctas > 0 ? ` · ${totalPernoctas} pernoctas` : ''}
            </Text>
          </View>

          {/* ── Sección de firma ── */}
          <View style={styles.sigSection}>
            <View style={styles.sigHeader}>
              <Text style={styles.sigTitle}>Firma del trabajador</Text>
              {signatureSvg && (
                <Text style={styles.sigConfirmed}>✓ Capturada</Text>
              )}
            </View>

            {/* Canvas de firma */}
            <View style={styles.sigCanvasWrap}>
              <SignaturePad
                ref={sigPadRef}
                width={screenWidth - 48}
                height={140}
              />
            </View>

            {/* Botones de firma */}
            <View style={styles.sigActions}>
              <Pressable
                style={styles.sigClearBtn}
                onPress={() => {
                  sigPadRef.current?.clear();
                  setSignatureSvg(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.sigClearTxt}>Limpiar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sigCapBtn,
                  signatureSvg && styles.sigCapBtnConfirmed,
                ]}
                onPress={handleCapturarFirma}
                hitSlop={8}
              >
                <Text style={[styles.sigCapTxt, signatureSvg && styles.sigCapTxtConfirmed]}>
                  {signatureSvg ? 'Actualizar firma' : 'Confirmar firma'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Acciones */}
          <View style={styles.pvFooter}>
            <Pressable style={styles.pvCancelBtn} onPress={() => setShowPreview(false)}>
              <Text style={styles.pvCancelTxt}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.pvExportBtn, exporting && styles.exportBtnDisabled]}
              onPress={handleExportar}
              disabled={exporting}
            >
              <Text style={styles.exportBtnText}>{exporting ? 'Generando…' : 'Exportar'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
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
      padding: 24, paddingTop: 16, gap: 18, paddingBottom: 40,
      width: '100%', maxWidth: 900, alignSelf: 'center',
    },
    title: { fontSize: 30, fontWeight: '800', color: C.text },

    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.card, borderRadius: 18,
      paddingVertical: 14, paddingHorizontal: 20,
      borderWidth: 1, borderColor: C.border,
    },
    monthBtn: { minWidth: 44, minHeight: 44, padding: 4, justifyContent: 'center', alignItems: 'center' },
    monthBtnDisabled: { opacity: 0.25 },
    monthBtnText: { fontSize: 28, color: Colors.brand, fontWeight: '700', lineHeight: 30 },
    monthBtnTextDisabled: { color: C.textFaint },
    monthLabel: { fontSize: 18, fontWeight: '700', color: C.text },

    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryCard: {
      flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14,
      alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 4,
    },
    summaryValue: { fontSize: 20, fontWeight: '800', color: Colors.brand },
    summaryLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
    balanceCard: {
      backgroundColor: C.card, borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    },
    balanceLabel: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
    balanceValue: { color: '#16a34a', fontSize: 22, fontWeight: '800', marginTop: 4 },
    balanceNegative: { color: '#dc2626' },
    lockButton: {
      borderRadius: 12, borderWidth: 1, borderColor: Colors.brand,
      paddingVertical: 10, paddingHorizontal: 14,
    },
    lockButtonActive: { backgroundColor: Colors.brand },
    lockButtonText: { color: Colors.brand, fontSize: 12, fontWeight: '800' },
    lockButtonTextActive: { color: '#ffffff' },

    compareCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    compareLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    compareValue: { fontSize: 18, fontWeight: '800', color: '#16a34a' },
    compareNeg:   { color: '#dc2626' },

    emptyState: {
      backgroundColor: C.card, borderRadius: 22, padding: 28,
      alignItems: 'center', borderWidth: 1, borderColor: C.border,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6 },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },

    table: {
      backgroundColor: C.card, borderRadius: 18,
      overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    },
    tableRow: {
      flexDirection: 'row', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: C.separator,
      paddingVertical: 10, paddingHorizontal: 12,
    },
    tableHeader: { backgroundColor: `${Colors.brand}10`, paddingVertical: 10 },
    tableHeaderText: { fontSize: 11, fontWeight: '700', color: Colors.brand, textTransform: 'uppercase' },
    tableCell: { paddingHorizontal: 4 },
    tableCellDay:   { width: 32 },
    tableCellTipo:  { flex: 1 },
    tableCellHoras: { width: 56, textAlign: 'right' },
    tableCellDieta: { width: 44, textAlign: 'center' },
    tableCellExtra: { width: 44, textAlign: 'right' },
    tableCellDayText:   { fontSize: 13, fontWeight: '700', color: C.text },
    tableTipoText:      { fontSize: 13, fontWeight: '600', color: C.text },
    tableClienteText:   { fontSize: 11, color: C.textMuted, marginTop: 1 },
    tableCellValueText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },

    // Análisis: gráfica y semanas
    analyticCard: {
      backgroundColor: C.card, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    analyticHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    analyticTitle: { fontSize: 14, fontWeight: '700', color: C.text },
    analyticToggle: { fontSize: 11, color: C.textFaint },
    chartBody: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, width: 86 },
    barTrack: {
      flex: 1, height: 10, backgroundColor: C.separator,
      borderRadius: 5, overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 5 },
    barValue: { fontSize: 12, fontWeight: '700', color: C.text, width: 52, textAlign: 'right' },
    weekBody: { paddingHorizontal: 16, paddingBottom: 10 },
    weekRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.separator,
    },
    weekRange: { fontSize: 13, color: C.text, fontWeight: '600', flex: 1 },
    weekCount: { fontSize: 12, color: C.textMuted, width: 52, textAlign: 'center' },
    weekTotal: { fontSize: 13, fontWeight: '700', color: Colors.brand, width: 60, textAlign: 'right' },

    calBody: { paddingHorizontal: 12, paddingBottom: 14 },
    calRow: { flexDirection: 'row' },
    calCell: {
      flex: 1, alignItems: 'center', paddingVertical: 6, gap: 3,
      borderRadius: 8,
    },
    calCellToday: { backgroundColor: `${Colors.brand}12` },
    calWeekDay: { fontSize: 11, fontWeight: '700', color: C.textMuted },
    calDayNum: { fontSize: 13, fontWeight: '600', color: C.text },
    calDayNumToday: { color: Colors.brand, fontWeight: '800' },
    calDot: { width: 6, height: 6, borderRadius: 3 },

    exportBtn: {
      backgroundColor: Colors.brand, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center', marginTop: 4,
    },
    exportBtnDisabled: { backgroundColor: '#9ca3af' },
    exportBtnText:     { color: '#ffffff', fontSize: 16, fontWeight: '700' },

    // ── Vista previa modal ──
    pvSafe: { flex: 1, backgroundColor: C.background },
    pvHead: {
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    pvHeadTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    pvHeadSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },

    pvRow: {
      flexDirection: 'row', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: C.separator,
      paddingVertical: 8, paddingHorizontal: 10,
    },
    pvHeaderRow: { backgroundColor: `${Colors.brand}10`, paddingVertical: 6 },
    pvHeadCell:  { alignItems: 'center' },
    pvCell:      { paddingHorizontal: 3 },
    pvColLetter: { fontSize: 9, fontWeight: '800', color: Colors.brand, textAlign: 'center' },
    pvColLabel:  { fontSize: 8, fontWeight: '600', color: C.textMuted, textAlign: 'center', textTransform: 'uppercase' },

    // anchos de columna
    pvWB: { width: 30 },
    pvWC: { width: 36 },
    pvWD: { width: 36 },
    pvWE: { width: 36 },
    pvWF: { width: 36 },
    pvWG: { width: 42 },
    pvWJ: { width: 46 },
    pvWM: { width: 30 },
    pvWN: { width: 28 },
    pvWO: { width: 28 },
    pvWP: { width: 72 },

    // estilos de texto por tipo de celda
    pvDayTxt:   { fontSize: 13, fontWeight: '700', color: C.text,          textAlign: 'center' },
    pvHourTxt:  { fontSize: 12, color: C.textSecondary,                    textAlign: 'right'  },
    pvTotalTxt: { fontSize: 12, fontWeight: '700', color: C.text,          textAlign: 'right'  },
    pvCountTxt: { fontSize: 12, color: C.textSecondary,                    textAlign: 'center' },
    pvActTxt:   { fontSize: 11, color: C.textMuted },

    pvSummary:    { padding: 12, backgroundColor: C.subtleBg, borderTopWidth: 1, borderTopColor: C.border },
    pvSummaryTxt: { fontSize: 12, color: C.textMuted, textAlign: 'center', fontWeight: '600' },
    pvFooter:     { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: C.border },
    pvCancelBtn:  {
      flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
      backgroundColor: C.separator, borderWidth: 1, borderColor: C.border,
    },
    pvCancelTxt:  { fontSize: 16, fontWeight: '600', color: C.text },
    pvExportBtn:  { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.brand },

    // ── Firma ──
    sigSection: {
      borderTopWidth: 1, borderTopColor: C.border,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
      gap: 10, backgroundColor: C.background,
    },
    sigHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sigTitle: { fontSize: 13, fontWeight: '700', color: C.text },
    sigConfirmed: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
    sigCanvasWrap: {
      borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
      overflow: 'hidden',
    },
    sigActions: {
      flexDirection: 'row', gap: 10, justifyContent: 'flex-end',
    },
    sigClearBtn: {
      paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
      backgroundColor: C.separator, borderWidth: 1, borderColor: C.border,
    },
    sigClearTxt: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    sigCapBtn: {
      paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
      backgroundColor: `${Colors.brand}15`, borderWidth: 1, borderColor: Colors.brand,
    },
    sigCapBtnConfirmed: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    sigCapTxt: { fontSize: 13, fontWeight: '700', color: Colors.brand },
    sigCapTxtConfirmed: { color: '#ffffff' },
  });
}
