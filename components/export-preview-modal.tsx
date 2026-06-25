/**
 * Modal de vista previa del reporte mensual y captura de firma.
 *
 * Gestiona internamente:
 * - Visualización de la tabla de datos (columnas Excel B–P)
 * - Pad de firma táctil con persistencia en AsyncStorage
 * - Vista previa SVG de la firma capturada
 * - Alerta cuando se intenta exportar sin firma
 * - Haptic feedback al confirmar la firma
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import {
  type MonthlyDayRecord,
  resolveDailyExcelValues,
} from '@/src/services/excel/generateMonthlyReportFromTemplate';
import { type SignaturePadRef, SignaturePad } from './signature-pad';

// ─── Utilidades locales ───────────────────────────────────────────────────────

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function fmtH(h: number | undefined): string {
  if (!h || h <= 0) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}:${String(mm).padStart(2, '0')}` : `${hh}h`;
}

const sigKey = (year: number, month: number) =>
  `@salvagnini_firma_${year}-${String(month + 1).padStart(2, '0')}`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ExportPreviewModalProps {
  visible: boolean;
  /** Se dispara cuando iOS termina la animación de cierre (momento seguro para el share sheet). */
  onDismiss: () => void;
  onClose: () => void;
  /** Callback de exportación: el modal entrega la firma capturada (o undefined si no hay). */
  onExport: (opts: { signatureSvg?: string }) => Promise<void>;
  month: number;        // 0-indexed
  year: number;
  employeeName: string;
  records: MonthlyDayRecord[];
  totalHoras: string;
  totalDietas: number;
  totalPernoctas: number;
  exporting: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ExportPreviewModal({
  visible,
  onDismiss,
  onClose,
  onExport,
  month,
  year,
  employeeName,
  records,
  totalHoras,
  totalDietas,
  totalPernoctas,
  exporting,
}: ExportPreviewModalProps) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { width: screenWidth } = useWindowDimensions();

  const sigPadRef = useRef<SignaturePadRef>(null);
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [showingPreview, setShowingPreview] = useState(false);

  // Cargar firma guardada de AsyncStorage cuando se abre el modal
  useEffect(() => {
    if (!visible) return;
    setShowingPreview(false);
    AsyncStorage.getItem(sigKey(year, month)).then((saved) => {
      if (saved) {
        setSignatureSvg(saved);
        setShowingPreview(true);
      } else {
        setSignatureSvg(null);
      }
    });
  }, [visible, year, month]);

  const handleCapturar = async () => {
    const xml = sigPadRef.current?.getSvgXml() ?? null;
    if (!xml) {
      Alert.alert('Sin firma', 'Dibuja tu firma antes de confirmar.');
      return;
    }
    setSignatureSvg(xml);
    setShowingPreview(true);
    await AsyncStorage.setItem(sigKey(year, month), xml);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCambiarFirma = async () => {
    if (!signatureSvg) return;
    Alert.alert(
      'Cambiar firma',
      'Se descartará la firma actual. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cambiar',
          onPress: async () => {
            sigPadRef.current?.clear();
            setSignatureSvg(null);
            setShowingPreview(false);
            await AsyncStorage.removeItem(sigKey(year, month));
          },
        },
      ],
    );
  };

  const handleExportPress = () => {
    if (!signatureSvg) {
      Alert.alert(
        'Sin firma',
        '¿Exportar el reporte sin firma del trabajador?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Exportar sin firma', onPress: () => onExport({}) },
        ],
      );
    } else {
      onExport({ signatureSvg });
    }
  };

  const svgForPreview = signatureSvg?.replace(/^<\?xml[^?]*\?>/, '') ?? '';

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.day - b.day),
    [records],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={styles.safe}>

        {/* ── Cabecera ── */}
        <View style={styles.head}>
          <Text style={styles.headTitle}>Vista previa · plantilla Excel</Text>
          <Text style={styles.headSub}>{MESES[month]} {year} · {employeeName}</Text>
        </View>

        {/* ── Tabla de datos ── */}
        <ScrollView style={styles.tableScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Cabecera columnas */}
              <View style={[styles.row, styles.headerRow]}>
                {[
                  { l: 'B', lb: 'Día',  w: styles.wB },
                  { l: 'C', lb: 'Vac.', w: styles.wC },
                  { l: 'D', lb: 'Rec.', w: styles.wD },
                  { l: 'E', lb: 'Of.',  w: styles.wE },
                  { l: 'F', lb: 'Ext.', w: styles.wF },
                  { l: 'G', lb: '+25%', w: styles.wG },
                  { l: 'J', lb: 'Tot.', w: styles.wJ },
                  { l: 'M', lb: '½D',   w: styles.wM },
                  { l: 'N', lb: 'D.',   w: styles.wN },
                  { l: 'O', lb: 'Pn.',  w: styles.wO },
                  { l: 'P', lb: 'Act.', w: styles.wP },
                ].map(({ l, lb, w }) => (
                  <View key={l} style={[styles.cell, w, styles.headCell]}>
                    <Text style={styles.colLetter}>{l}</Text>
                    <Text style={styles.colLabel}>{lb}</Text>
                  </View>
                ))}
              </View>

              {/* Filas de datos */}
              {sortedRecords.map((rec) => {
                const cols = resolveDailyExcelValues(rec);
                return (
                  <View key={rec.day} style={styles.row}>
                    <Text style={[styles.cell, styles.wB, styles.dayTxt]}>
                      {String(rec.day).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.cell, styles.wC, styles.hourTxt]}>{fmtH(cols.C)}</Text>
                    <Text style={[styles.cell, styles.wD, styles.hourTxt]}>{fmtH(cols.D)}</Text>
                    <Text style={[styles.cell, styles.wE, styles.hourTxt]}>{fmtH(cols.E)}</Text>
                    <Text style={[styles.cell, styles.wF, styles.hourTxt]}>{fmtH(cols.F)}</Text>
                    <Text style={[styles.cell, styles.wG, styles.hourTxt]}>{fmtH(cols.G)}</Text>
                    <Text style={[styles.cell, styles.wJ, styles.totalTxt]}>{fmtH(cols.J)}</Text>
                    <Text style={[styles.cell, styles.wM, styles.countTxt]}>{cols.M ? '½' : '—'}</Text>
                    <Text style={[styles.cell, styles.wN, styles.countTxt]}>{cols.N ? '1' : '—'}</Text>
                    <Text style={[styles.cell, styles.wO, styles.countTxt]}>{cols.O ? '✓' : '—'}</Text>
                    <Text style={[styles.cell, styles.wP, styles.actTxt]} numberOfLines={1}>
                      {cols.P ?? '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>

        {/* ── Resumen ── */}
        <View style={styles.summary}>
          <Text style={styles.summaryTxt}>
            {records.length} jornadas · {totalHoras}
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

          {/* Vista previa SVG cuando ya hay firma confirmada */}
          {showingPreview && svgForPreview ? (
            <View style={styles.sigPreviewWrap}>
              <SvgXml xml={svgForPreview} width="100%" height={100} />
            </View>
          ) : (
            <View style={styles.sigCanvasWrap}>
              <SignaturePad
                ref={sigPadRef}
                width={screenWidth - 48}
                height={130}
              />
            </View>
          )}

          {/* Botones de firma */}
          <View style={styles.sigActions}>
            {showingPreview ? (
              <Pressable style={styles.sigSecondaryBtn} onPress={handleCambiarFirma} hitSlop={8}>
                <Text style={styles.sigSecondaryTxt}>Cambiar firma</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={styles.sigSecondaryBtn}
                  onPress={() => {
                    sigPadRef.current?.clear();
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.sigSecondaryTxt}>Limpiar</Text>
                </Pressable>
                <Pressable style={styles.sigCapBtn} onPress={handleCapturar} hitSlop={8}>
                  <Text style={styles.sigCapTxt}>Confirmar firma</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* ── Pie ── */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExportPress}
            disabled={exporting}
          >
            <Text style={styles.exportBtnTxt}>{exporting ? 'Generando…' : 'Exportar'}</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },

    head: {
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    headSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },

    tableScroll: { flex: 1 },

    row: {
      flexDirection: 'row', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: C.separator,
      paddingVertical: 8, paddingHorizontal: 10,
    },
    headerRow: { backgroundColor: `${Colors.brand}10`, paddingVertical: 6 },
    headCell:  { alignItems: 'center' },
    cell:      { paddingHorizontal: 3 },
    colLetter: { fontSize: 9,  fontWeight: '800', color: Colors.brand, textAlign: 'center' },
    colLabel:  { fontSize: 8,  fontWeight: '600', color: C.textMuted, textAlign: 'center', textTransform: 'uppercase' },
    dayTxt:    { fontSize: 13, fontWeight: '700', color: C.text,          textAlign: 'center' },
    hourTxt:   { fontSize: 12, color: C.textSecondary,                    textAlign: 'right' },
    totalTxt:  { fontSize: 12, fontWeight: '700', color: C.text,          textAlign: 'right' },
    countTxt:  { fontSize: 12, color: C.textSecondary,                    textAlign: 'center' },
    actTxt:    { fontSize: 11, color: C.textMuted },

    // anchos de columna
    wB: { width: 30 }, wC: { width: 36 }, wD: { width: 36 },
    wE: { width: 36 }, wF: { width: 36 }, wG: { width: 42 },
    wJ: { width: 46 }, wM: { width: 30 }, wN: { width: 28 },
    wO: { width: 28 }, wP: { width: 72 },

    summary: {
      padding: 12, backgroundColor: C.subtleBg,
      borderTopWidth: 1, borderTopColor: C.border,
    },
    summaryTxt: { fontSize: 12, color: C.textMuted, textAlign: 'center', fontWeight: '600' },

    // ── Firma ──
    sigSection: {
      borderTopWidth: 1, borderTopColor: C.border,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10,
      backgroundColor: C.background,
    },
    sigHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sigTitle:     { fontSize: 13, fontWeight: '700', color: C.text },
    sigConfirmed: { fontSize: 12, fontWeight: '700', color: '#16a34a' },

    sigCanvasWrap: {
      borderWidth: 1.5, borderColor: C.border, borderRadius: 12, overflow: 'hidden',
    },
    sigPreviewWrap: {
      borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 12, overflow: 'hidden',
      backgroundColor: '#ffffff', height: 100,
    },

    sigActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    sigSecondaryBtn: {
      paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
      backgroundColor: C.separator, borderWidth: 1, borderColor: C.border,
    },
    sigSecondaryTxt: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    sigCapBtn: {
      paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
      backgroundColor: `${Colors.brand}15`, borderWidth: 1, borderColor: Colors.brand,
    },
    sigCapTxt: { fontSize: 13, fontWeight: '700', color: Colors.brand },

    // ── Pie ──
    footer:    { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: C.border },
    cancelBtn: {
      flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
      backgroundColor: C.separator, borderWidth: 1, borderColor: C.border,
    },
    cancelTxt:      { fontSize: 16, fontWeight: '600', color: C.text },
    exportBtn:      { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.brand },
    exportBtnDisabled: { backgroundColor: '#9ca3af' },
    exportBtnTxt:   { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  });
}
