import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import {
  type MonthlyDayRecord,
  type WorkdayType,
  normalizeHours,
  shareMonthlyReportFromTemplate,
} from '@/src/services/excel/generateMonthlyReportFromTemplate';

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
};

function durationToMinutes(duracion: string): number {
  const h = duracion.match(/(\d+)h/);
  const m = duracion.match(/(\d+)m/);
  return (h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0);
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: string): string {
  const s = new Date(`${weekStart}T12:00:00`);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(s)}–${fmt(e)}`;
}

function getRegistroDate(r: Registro): Date {
  if (r.fecha) return new Date(`${r.fecha}T12:00:00`);
  return new Date(r.createdAt);
}

function getDayFromRegistro(r: Registro): number {
  return getRegistroDate(r).getDate();
}

function totalHorasMes(registros: Registro[]): string {
  const totalMin = registros.reduce((sum, r) => sum + durationToMinutes(r.duracion), 0);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtH(h: number | undefined): string {
  if (!h || h <= 0) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}:${String(mm).padStart(2, '0')}` : `${hh}h`;
}

function getExcelCols(rec: MonthlyDayRecord) {
  const type    = rec.workdayType;
  const normalH = normalizeHours(rec.normalHours);
  const homeH   = normalizeHours(rec.homeRecoveryHours);
  const extH    = normalizeHours(rec.externalHours);
  const extra25 = normalizeHours(rec.overtime25);

  let C: number | undefined;
  let D: number | undefined;
  let E: number | undefined;
  let F: number | undefined;

  switch (type) {
    case 'office':                   E = normalH; break;
    case 'external':
    case 'remote':                   F = normalH; break;
    case 'home_recovery':            D = normalH; break;
    case 'mixed':                    D = homeH; F = extH; break;
    case 'vacation_permission_sick': C = normalH; break;
  }

  const worked = (C ?? 0) + (D ?? 0) + (E ?? 0) + (F ?? 0);
  const J = worked + (extra25 ?? 0) || undefined;

  return {
    C, D, E, F, G: extra25, J,
    M: rec.halfDiet  ? 1 : undefined,
    N: rec.fullDiet  ? 1 : undefined,
    O: rec.overnight ? 1 : undefined,
    P: [rec.clientName, rec.notes].filter(Boolean).join(' · ') || undefined,
  };
}

export default function RegistroMensualScreen() {
  const { registros } = useRegistro();
  const { usuario } = useAuth();
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [exporting, setExporting] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const registrosDelMes = registros.filter((r) => {
    const d = getRegistroDate(r);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const [showPreview, setShowPreview] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showWeekly, setShowWeekly] = useState(false);

  const horasPorTipo = useMemo(() => {
    const acc: Record<string, number> = {};
    registrosDelMes.forEach((r) => {
      acc[r.titulo] = (acc[r.titulo] ?? 0) + durationToMinutes(r.duracion);
    });
    return Object.entries(acc).sort(([, a], [, b]) => b - a);
  }, [registrosDelMes]);

  const maxMinsTipo = useMemo(
    () => Math.max(...horasPorTipo.map(([, m]) => m), 1),
    [horasPorTipo],
  );

  const semanasData = useMemo(() => {
    const map: Record<string, { mins: number; count: number }> = {};
    registrosDelMes.forEach((r) => {
      const fecha = r.fecha ?? r.createdAt.slice(0, 10);
      const key = getWeekStart(fecha);
      if (!map[key]) map[key] = { mins: 0, count: 0 };
      map[key].mins += durationToMinutes(r.duracion);
      map[key].count++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [registrosDelMes]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const totalHoras    = totalHorasMes(registrosDelMes);
  const totalDietas   = registrosDelMes.filter((r) => r.dieta && r.dieta !== 'ninguna').length;
  const totalPernoctas = registrosDelMes.filter((r) => r.pernocta).length;

  const TIPO_MAP: Record<string, WorkdayType> = {
    'Oficina':     'office',
    'Casa':        'home_recovery',
    'Cliente':     'external',
    'Mixto':       'mixed',
    'Teletrabajo': 'remote',
  };

  const buildRecords = (): MonthlyDayRecord[] =>
    registrosDelMes.map((reg) => {
      const extras  = reg.horasExtras && reg.horasExtras > 0 ? reg.horasExtras : 0;
      const baseMins = Math.max(0, durationToMinutes(reg.duracion) - Math.round(extras * 60));
      const baseH   = baseMins > 0 ? baseMins / 60 : undefined;
      return {
        day:               getDayFromRegistro(reg),
        workdayType:       TIPO_MAP[reg.titulo] as WorkdayType | undefined,
        normalHours:       reg.titulo !== 'Mixto' ? baseH : undefined,
        homeRecoveryHours: reg.homeRecoveryHours,
        externalHours:     reg.externalHours,
        overtime25:        extras > 0 ? extras : undefined,
        halfDiet:          reg.dieta === 'media'    ? 1 : undefined,
        fullDiet:          reg.dieta === 'completa' ? 1 : undefined,
        overnight:         reg.pernocta ? 1 : undefined,
        clientName:        reg.cliente || undefined,
        notes:             reg.descripcion || undefined,
      };
    });

  const handleExportar = async () => {
    if (exporting) return;
    setExporting(true);
    setShowPreview(false);
    // Espera a que termine la animación de cierre del modal antes de presentar el share sheet
    await new Promise<void>((r) => setTimeout(r, 400));
    try {
      await shareMonthlyReportFromTemplate({
        year,
        month:        month + 1,
        employeeName: usuario?.nombre ?? 'Empleado',
        records:      buildRecords(),
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el reporte. Inténtalo de nuevo.');
      console.warn('Error generando Excel:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleVerPrevia = () => {
    if (registrosDelMes.length === 0) {
      Alert.alert('Sin datos', 'No hay jornadas registradas este mes.');
      return;
    }
    setShowPreview(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo onFichajeRapido={showToast} />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Registro mensual</Text>

        {/* Selector de mes */}
        <View style={styles.monthNav}>
          <Pressable style={styles.monthBtn} onPress={prevMonth} hitSlop={8}>
            <Text style={styles.monthBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{MESES[month]} {year}</Text>
          <Pressable
            style={[styles.monthBtn, isCurrentMonth && styles.monthBtnDisabled]}
            onPress={nextMonth}
            disabled={isCurrentMonth}
            hitSlop={8}
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
          <Text style={styles.exportBtnText}>
            {exporting ? 'Generando…' : 'Ver previa / Exportar Excel'}
          </Text>
        </Pressable>

        <Text style={styles.exportHint}>
          Se abrirá el menú de compartir de iOS para enviar por correo, guardar en Archivos o cualquier otra opción.
        </Text>
      </ScrollView>

      {/* ── Modal de vista previa (columnas de la plantilla Excel) ── */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
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
                    const cols = getExcelCols(rec);
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
    page: { padding: 24, paddingTop: 16, gap: 18, paddingBottom: 40 },
    title: { fontSize: 30, fontWeight: '800', color: C.text },

    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.card, borderRadius: 18,
      paddingVertical: 14, paddingHorizontal: 20,
      borderWidth: 1, borderColor: C.border,
    },
    monthBtn: { padding: 4 },
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

    exportBtn: {
      backgroundColor: Colors.brand, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center', marginTop: 4,
    },
    exportBtnDisabled: { backgroundColor: '#9ca3af' },
    exportBtnText:     { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    exportHint:        { fontSize: 12, color: C.textFaint, textAlign: 'center', lineHeight: 18 },

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
  });
}
