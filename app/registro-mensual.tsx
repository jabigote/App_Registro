import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import {
  type MonthlyDayRecord,
  type WorkdayType,
  shareMonthlyReportFromTemplate,
} from '@/src/services/excel/generateMonthlyReportFromTemplate';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function durationToHours(duracion: string): number {
  const h = duracion.match(/(\d+)h/);
  const m = duracion.match(/(\d+)m/);
  const hours = h ? parseInt(h[1]) : 0;
  const mins = m ? parseInt(m[1]) : 0;
  return Math.round((hours + mins / 60) * 10) / 10;
}

function getRegistroDate(r: Registro): Date {
  if (r.fecha) return new Date(`${r.fecha}T12:00:00`);
  return new Date(r.createdAt);
}

function getDayFromRegistro(r: Registro): number {
  return getRegistroDate(r).getDate();
}

function totalHorasMes(registros: Registro[]): string {
  let total = 0;
  for (const r of registros) total += durationToHours(r.duracion);
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RegistroMensualScreen() {
  const { registros } = useRegistro();
  const { usuario } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const registrosDelMes = registros.filter((r) => {
    const d = getRegistroDate(r);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const totalHoras = totalHorasMes(registrosDelMes);
  const totalDietas = registrosDelMes.filter((r) => r.dieta && r.dieta !== 'ninguna').length;
  const totalPernoctas = registrosDelMes.filter((r) => r.pernocta).length;

  const TIPO_MAP: Record<string, WorkdayType> = {
    'Oficina':     'office',
    'Casa':        'home_recovery',
    'Cliente':     'external',
    'Mixto':       'mixed',
    'Teletrabajo': 'remote',
  };

  const handleExportar = async () => {
    try {
      const records: MonthlyDayRecord[] = registrosDelMes.map((reg) => ({
        day:          getDayFromRegistro(reg),
        workdayType:  TIPO_MAP[reg.titulo] as WorkdayType | undefined,
        // Para Mixto se usan los campos de desglose; para el resto, duracion como normalHours
        normalHours:       reg.titulo !== 'Mixto' ? reg.duracion : undefined,
        homeRecoveryHours: reg.homeRecoveryHours,
        externalHours:     reg.externalHours,
        // horasExtras se mapea a overtime50 (+50 %)
        overtime50: reg.horasExtras && reg.horasExtras > 0 ? reg.horasExtras : undefined,
        halfDiet:  reg.dieta === 'media'    ? 0.5 : undefined,
        fullDiet:  reg.dieta === 'completa' ? 1   : undefined,
        overnight: reg.pernocta ? 1 : undefined,
        clientName: reg.cliente || undefined,
        notes:      reg.descripcion || undefined,
      }));

      await shareMonthlyReportFromTemplate({
        year,
        month: month + 1, // el servicio usa 1–12; aquí month es 0-indexed
        employeeName: usuario?.nombre ?? 'Empleado',
        records,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el reporte. Inténtalo de nuevo.');
      console.warn('Error generando Excel:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Registro mensual</Text>

        {/* Selector de mes */}
        <View style={styles.monthNav}>
          <Pressable style={styles.monthBtn} onPress={prevMonth} hitSlop={8}>
            <Text style={styles.monthBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{MESES[month]} {year}</Text>
          <Pressable style={styles.monthBtn} onPress={nextMonth} hitSlop={8}>
            <Text style={styles.monthBtnText}>›</Text>
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

        {/* Tabla de jornadas */}
        {registrosDelMes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin jornadas este mes</Text>
            <Text style={styles.emptyText}>No hay registros para {MESES[month]} {year}.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            {/* Cabecera tabla */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellDay, styles.tableHeaderText]}>Día</Text>
              <Text style={[styles.tableCell, styles.tableCellTipo, styles.tableHeaderText]}>Tipo</Text>
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
        <Pressable style={styles.exportBtn} onPress={handleExportar}>
          <Text style={styles.exportBtnText}>Exportar / Compartir Excel</Text>
        </Pressable>

        <Text style={styles.exportHint}>
          Se abrirá el menú de compartir de iOS para enviar por correo, guardar en Archivos o cualquier otra opción.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4,
    zIndex: 10, elevation: 6, backgroundColor: Colors.light.background,
  },
  page: { padding: 24, paddingTop: 16, gap: 18, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.brandDark },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  monthBtn: { padding: 4 },
  monthBtnText: { fontSize: 28, color: Colors.brand, fontWeight: '700', lineHeight: 30 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: Colors.brandDark },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: Colors.brand },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280' },

  emptyState: {
    backgroundColor: Colors.light.card,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.brandDark, marginBottom: 6 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },

  table: {
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeader: {
    backgroundColor: `${Colors.brand}10`,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand,
    textTransform: 'uppercase',
  },
  tableCell: { paddingHorizontal: 4 },
  tableCellDay: { width: 32 },
  tableCellTipo: { flex: 1 },
  tableCellHoras: { width: 56, textAlign: 'right' },
  tableCellDieta: { width: 44, textAlign: 'center' },
  tableCellExtra: { width: 44, textAlign: 'right' },
  tableCellDayText: { fontSize: 13, fontWeight: '700', color: Colors.brandDark },
  tableTipoText: { fontSize: 13, fontWeight: '600', color: Colors.brandDark },
  tableClienteText: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  tableCellValueText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },

  exportBtn: {
    backgroundColor: Colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  exportBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  exportHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
});
