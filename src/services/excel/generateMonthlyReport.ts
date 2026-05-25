/**
 * generateMonthlyReport.ts
 *
 * Carga la plantilla Salvagnini (assets/templates/Reporte_Horas_2026.xlsx),
 * rellena la hoja "Description Report" con los datos del mes y devuelve la
 * URI del archivo generado en el directorio de documentos del dispositivo.
 * La plantilla original nunca se modifica.
 *
 * Requisitos: expo-asset, expo-file-system, expo-sharing, xlsx (SheetJS).
 * Compatible con Expo Go (SDK 54).
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────

/** Datos para un único día del mes. Todos los campos son opcionales. */
export interface DayData {
  /** C: horas de vacaciones / permisos / enfermedad */
  vacaciones?: number;
  /** D: horas de recuperación (jornada tipo "Casa") */
  recuperacion?: number;
  /** E: horas normales en oficina / teletrabajo */
  horasOficina?: number;
  /** F: horas normales en exterior / cliente */
  horasExterior?: number;
  /** G: horas extra +25 % */
  extrasP25?: number;
  /** H: horas extra +30 % */
  extrasP30?: number;
  /** I: horas extra +50 % */
  extrasP50?: number;
  /** J: total de horas trabajadas ese día */
  totalHoras?: number;
  /** K: festivo medio (1 = sí, 0 = no) */
  festivoMedio?: number;
  /** L: festivo completo (1 = sí, 0 = no) */
  festivoCompleto?: number;
  /** M: media dieta (0.5 si procede) */
  mediaDieta?: number;
  /** N: dieta completa (1 si procede) */
  dietaCompleta?: number;
  /** O: pernocta (1 = sí) */
  pernocta?: number;
  /** P: actividad / notas del día */
  notas?: string;
}

/** Datos completos del mes que se quieren volcar en la plantilla. */
export interface MonthlyReportInput {
  /** Año (p. ej. 2026) */
  year: number;
  /** Mes en formato 1-12 */
  month: number;
  /** Nombre del técnico / empleado */
  employeeName: string;
  /** Mapa día-del-mes (1-31) → datos del día */
  days: Record<number, DayData>;
}

// ─────────────────────────────────────────────
// Constantes internas
// ─────────────────────────────────────────────

const SHEET_NAME = 'Description Report';

/** Fila de cabecera donde empieza el día 1 (13 + 1 = 14). */
const FIRST_DATA_ROW = 14;

/**
 * Formato numérico de Excel para duraciones (horas:minutos).
 * [h] permite valores superiores a 24 h si fuera necesario.
 */
const TIME_FORMAT = '[h]:mm';

/** Columnas de horas (se almacenan como fracción de día: h / 24). */
const HOUR_COLUMNS: (keyof DayData)[] = [
  'vacaciones',
  'recuperacion',
  'horasOficina',
  'horasExterior',
  'extrasP25',
  'extrasP30',
  'extrasP50',
  'totalHoras',
];

/** Mapeo campo → columna Excel (letra). */
const COLUMN_MAP: Record<keyof DayData, string> = {
  vacaciones:    'C',
  recuperacion:  'D',
  horasOficina:  'E',
  horasExterior: 'F',
  extrasP25:     'G',
  extrasP30:     'H',
  extrasP50:     'I',
  totalHoras:    'J',
  festivoMedio:  'K',
  festivoCompleto: 'L',
  mediaDieta:    'M',
  dietaCompleta: 'N',
  pernocta:      'O',
  notas:         'P',
};

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────

/**
 * Escribe un valor en una celda del sheet.
 * Las celdas de horas se almacenan como fracción de día y llevan formato [h]:mm.
 * Las celdas de texto llevan tipo 's'.
 * Las celdas numéricas no-hora llevan tipo 'n' sin formato especial.
 */
function writeCell(
  sheet: XLSX.WorkSheet,
  col: string,
  row: number,
  value: number | string,
  isHour = false,
): void {
  const ref = `${col}${row}`;

  if (typeof value === 'string') {
    sheet[ref] = { t: 's', v: value } satisfies XLSX.CellObject;
    return;
  }

  const stored = isHour ? value / 24 : value;
  const cell: XLSX.CellObject = { t: 'n', v: stored };
  if (isHour) cell.z = TIME_FORMAT;
  sheet[ref] = cell;
}

/** Actualiza el rango de celdas declarado en el sheet (!ref) para cubrir las nuevas filas. */
function expandSheetRange(sheet: XLSX.WorkSheet, lastRow: number): void {
  const ref = sheet['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  if (lastRow > range.e.r + 1) {
    range.e.r = lastRow - 1;
    sheet['!ref'] = XLSX.utils.encode_range(range);
  }
}

// ─────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────

/**
 * Genera el reporte mensual en formato .xlsx a partir de la plantilla
 * y lo guarda en FileSystem.documentDirectory.
 *
 * @returns URI local del archivo generado (apto para expo-sharing).
 */
export async function generateMonthlyReport(input: MonthlyReportInput): Promise<string> {
  const { year, month, employeeName, days } = input;

  // 1. Cargar la plantilla como asset
  const asset = Asset.fromModule(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../../assets/templates/Reporte_Horas_2026.xlsx') as number,
  );
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error('No se pudo descargar la plantilla Excel.');
  }

  // 2. Leer en base64 (nunca se modifica el archivo original)
  const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
    encoding: 'base64',
  });

  // 3. Parsear con SheetJS
  const workbook = XLSX.read(base64, { type: 'base64', cellStyles: true });

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`La hoja "${SHEET_NAME}" no existe en la plantilla.`);
  }

  // 4. Cabecera: mes/año y nombre de empleado
  const mesAnio = `${MESES_ES[month - 1]} ${year}`;
  writeCell(sheet, 'O', 4, mesAnio);
  writeCell(sheet, 'O', 6, employeeName);

  // 5. Rellenar filas de días
  const lastDay = Object.keys(days).reduce((max, d) => Math.max(max, Number(d)), 0);
  const lastRow = FIRST_DATA_ROW + lastDay - 1;

  for (const [dayStr, data] of Object.entries(days)) {
    const day = Number(dayStr);
    if (day < 1 || day > 31) continue;

    const row = 13 + day; // día 1 → fila 14, día 31 → fila 44

    for (const [field, col] of Object.entries(COLUMN_MAP) as [keyof DayData, string][]) {
      const value = data[field];
      if (value === undefined || value === null) continue;

      const isHour = HOUR_COLUMNS.includes(field);

      if (typeof value === 'string') {
        writeCell(sheet, col, row, value);
      } else {
        writeCell(sheet, col, row, value as number, isHour);
      }
    }
  }

  // Actualizar el rango declarado del sheet
  expandSheetRange(sheet, lastRow);

  // 6. Serializar a base64
  const outputBase64 = XLSX.write(workbook, {
    type: 'base64',
    bookType: 'xlsx',
    cellStyles: true,
  });

  // 7. Guardar en el directorio de documentos del dispositivo
  const safeName = employeeName.replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
  const fileName = `Reporte_${year}_${String(month).padStart(2, '0')}_${safeName}.xlsx`;
  const outputUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(outputUri, outputBase64, {
    encoding: 'base64',
  });

  return outputUri;
}

// ─────────────────────────────────────────────
// Helper de compartir
// ─────────────────────────────────────────────

/**
 * Genera el reporte mensual y abre directamente el menú de compartir de iOS
 * (correo, Archivos, AirDrop, etc.).
 *
 * @throws Error si el dispositivo no soporta la opción de compartir.
 */
export async function shareMonthlyReportExcel(input: MonthlyReportInput): Promise<void> {
  const uri = await generateMonthlyReport(input);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('La opción de compartir no está disponible en este dispositivo.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI: 'com.microsoft.excel.xlsx',
    dialogTitle: `Reporte ${MESES_ES[(input.month - 1)]} ${input.year}`,
  });
}
