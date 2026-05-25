/**
 * generateMonthlyReportFromTemplate.ts
 *
 * Modifica la plantilla Salvagnini (.xlsx) tratándola como ZIP con JSZip.
 * Solo edita el XML de la hoja "Description Report": valores de celda,
 * sin tocar estilos, logos, imágenes, dibujos ni relaciones.
 *
 * El archivo final sale de zip.generateAsync() — nunca de XLSX.write.
 * Compatible con Expo Go (SDK 54).
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

// ─────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────

export type WorkdayType =
  | 'office'                    // Oficina → columna E
  | 'external'                  // Cliente / exterior → columna F
  | 'remote'                    // Teletrabajo → columna F
  | 'home_recovery'             // Casa / recuperación → columna D
  | 'mixed'                     // Mixto → D + F
  | 'vacation_permission_sick'  // Vacaciones / permiso / enfermedad → columna C
  | 'holiday'                   // Festivo → K o L
  | 'off';                      // Sin actividad

export interface MonthlyDayRecord {
  day: number;
  workdayType?: WorkdayType;

  // Horas principales (aceptan decimal, "8:30", "8h 30m", "8", "9,5")
  normalHours?: number | string;
  officeHours?: number | string;
  externalHours?: number | string;
  remoteHours?: number | string;
  homeRecoveryHours?: number | string;
  vacationPermissionSickHours?: number | string;

  // Horas extra
  overtime25?: number | string;
  overtime30?: number | string;
  overtime50?: number | string;

  // Festivos / dietas / pernocta (valores directos, sin conversión)
  halfHoliday?: number;
  fullHoliday?: number;
  halfDiet?: number;
  fullDiet?: number;
  overnight?: number;

  // Texto actividad / cliente
  clientName?: string;
  notes?: string;
}

export interface MonthlyReportInput {
  year: number;
  /** 1–12 */
  month: number;
  employeeName: string;
  records: MonthlyDayRecord[];
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

/**
 * Si true, las horas en casa/recuperación se suman al total J.
 * Por defecto false: J solo refleja horas trabajadas (oficina/exterior/teletrabajo).
 */
const INCLUDE_HOME_RECOVERY_IN_TOTAL = false;

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Columnas de datos que se escriben en cada fila de día (C–P). B y fila 45 nunca se tocan. */
const TARGET_COLS = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'] as const;
type TargetCol = (typeof TARGET_COLS)[number];

/** Columnas cuyo valor se almacena como fracción de día (horas / 24) en Excel. */
const HOUR_COLS = new Set<TargetCol>(['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);

/** Columna de texto. */
const TEXT_COL: TargetCol = 'P';

// ─────────────────────────────────────────────
// Normalización de horas
// ─────────────────────────────────────────────

/**
 * Convierte cualquier representación de horas a número decimal.
 * Devuelve undefined si el valor es vacío, cero o inválido.
 *
 * Ejemplos:
 *   "9:30"   → 9.5
 *   "8h 30m" → 8.5
 *   "8h"     → 8
 *   "9,5"    → 9.5
 *   "9.5"    → 9.5
 *   8        → 8
 *   0        → undefined
 */
export function normalizeHours(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'number') {
    return value > 0 ? value : undefined;
  }

  const s = String(value).trim();
  if (s === '' || s === '0' || s === '0:00') return undefined;

  // "8h" o "8h 30m" o "8h 30min" (formato duracion de la app)
  const hm = s.match(/^(\d+)h(?:\s*(\d+)m(?:in)?)?$/i);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    const v = h + m / 60;
    return v > 0 ? v : undefined;
  }

  // "9:30" o "09:30" (HH:MM)
  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (m > 59) return undefined;
    const v = h + m / 60;
    return v > 0 ? v : undefined;
  }

  // "9,5" o "9.5" o "8"
  const num = parseFloat(s.replace(',', '.'));
  return !isNaN(num) && num > 0 ? num : undefined;
}

/**
 * Convierte horas decimales al valor de tiempo interno de Excel (horas / 24).
 * Con formato [h]:mm en la celda, Excel muestra "9:30".
 */
function hoursToExcelTime(hours: number | undefined): number | undefined {
  if (hours === undefined || hours <= 0) return undefined;
  return hours / 24;
}

// ─────────────────────────────────────────────
// Lógica de negocio
// ─────────────────────────────────────────────

/**
 * Construye el texto de la columna P (actividad / cliente).
 */
function buildActivityNote(record: MonthlyDayRecord): string | undefined {
  const { clientName, notes, workdayType } = record;
  if (clientName && notes) return `${clientName} - ${notes}`;
  if (clientName) return clientName;
  if (notes) return notes;
  if (workdayType === 'remote') return 'Teletrabajo';
  if (workdayType === 'home_recovery') return 'Horas en casa';
  return undefined;
}

/**
 * Resuelve los valores de columna para un día dado.
 * Los valores de C–J son horas decimales (la conversión /24 ocurre al escribir XML).
 * Los valores de K–O son numéricos directos.
 * El valor de P es texto o undefined.
 */
function resolveDailyExcelValues(record: MonthlyDayRecord): Record<TargetCol, number | string | undefined> {
  const { workdayType } = record;

  const normalH   = normalizeHours(record.normalHours);
  const officeH   = normalizeHours(record.officeHours);
  const externalH = normalizeHours(record.externalHours);
  const remoteH   = normalizeHours(record.remoteHours);
  const homeH     = normalizeHours(record.homeRecoveryHours);
  const vacH      = normalizeHours(record.vacationPermissionSickHours);

  let C: number | undefined;
  let D: number | undefined;
  let E: number | undefined;
  let F: number | undefined;
  let J: number | undefined;

  switch (workdayType) {
    case 'office': {
      E = officeH ?? normalH;
      J = E;
      break;
    }
    case 'external': {
      F = externalH ?? normalH;
      J = F;
      break;
    }
    case 'remote': {
      // Teletrabajo computa en F (exterior), no en E
      F = remoteH ?? normalH;
      J = F;
      break;
    }
    case 'home_recovery': {
      // D no suma a J por defecto
      D = homeH ?? normalH;
      if (D !== undefined && !homeH && !record.homeRecoveryHours) {
        // normalHours se usó como fallback para home_recovery → va a D
      }
      break;
    }
    case 'mixed': {
      if (!homeH && !externalH && !officeH && !remoteH) {
        console.warn('[Excel] Jornada mixta sin desglose de horas. Proporciona homeRecoveryHours y/o externalHours.', record);
      }
      D = homeH;
      F = externalH ?? remoteH;
      E = officeH;
      const worked = (officeH ?? 0) + (externalH ?? 0) + (remoteH ?? 0);
      const total  = INCLUDE_HOME_RECOVERY_IN_TOTAL ? worked + (homeH ?? 0) : worked;
      J = total > 0 ? total : undefined;
      break;
    }
    case 'vacation_permission_sick': {
      C = vacH ?? normalH;
      break;
    }
    default: {
      // Sin tipo de jornada: asignar normalHours a F (exterior) como fallback
      if (normalH) {
        console.warn('[Excel] Registro sin tipo de jornada. Se asigna por defecto a horas exterior (F).', record);
        F = normalH;
        J = F;
      }
      break;
    }
  }

  const result = {
    C,
    D,
    E,
    F,
    G: normalizeHours(record.overtime25),
    H: normalizeHours(record.overtime30),
    I: normalizeHours(record.overtime50),
    J,
    K: record.halfHoliday,
    L: record.fullHoliday,
    M: record.halfDiet,
    N: record.fullDiet,
    O: record.overnight,
    P: buildActivityNote(record),
  } as Record<TargetCol, number | string | undefined>;

  console.log('[Excel row write]', {
    day: record.day,
    row: 13 + record.day,
    workdayType,
    values: result,
  });

  return result;
}

// ─────────────────────────────────────────────
// Helpers XML
// ─────────────────────────────────────────────

function colToIndex(col: string): number {
  let n = 0;
  for (const c of col) n = n * 26 + c.charCodeAt(0) - 64;
  return n;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractStyleAttr(cellXml: string): string {
  const m = cellXml.match(/\bs="([^"]+)"/);
  return m ? ` s="${m[1]}"` : '';
}

function buildNumCell(ref: string, style: string, value: number): string {
  return `<c r="${ref}"${style}><v>${value}</v></c>`;
}

function buildStrCell(ref: string, style: string, value: string): string {
  return `<c r="${ref}"${style} t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function buildEmptyCell(ref: string, style: string): string {
  return `<c r="${ref}"${style}/>`;
}

function insertCellInOrder(rowContent: string, newRef: string, newCellXml: string): string {
  const newColIdx = colToIndex(newRef.replace(/\d+$/, ''));
  const pattern = /<c\b[^>]*r="([A-Z]+)\d+"[^>]*(?:>[\s\S]*?<\/c>|\/>)/g;
  let insertAt = rowContent.length;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(rowContent)) !== null) {
    if (colToIndex(m[1]) > newColIdx) { insertAt = m.index; break; }
  }
  return rowContent.slice(0, insertAt) + newCellXml + rowContent.slice(insertAt);
}

function insertRowInOrder(xml: string, rowNum: number, newRowXml: string): string {
  if (/<sheetData\s*\/>/.test(xml)) {
    return xml.replace(/<sheetData\s*\/>/, `<sheetData>${newRowXml}</sheetData>`);
  }
  const pattern = /<row\b[^>]*\sr="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
  let insertAt = -1;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(xml)) !== null) {
    if (parseInt(m[1], 10) > rowNum) { insertAt = m.index; break; }
  }
  if (insertAt === -1) {
    const sd = xml.indexOf('</sheetData>');
    insertAt = sd !== -1 ? sd : xml.length;
  }
  return xml.slice(0, insertAt) + newRowXml + xml.slice(insertAt);
}

// ─────────────────────────────────────────────
// Procesado de fila de datos (C–P)
// ─────────────────────────────────────────────

/**
 * Escribe o limpia TODAS las columnas objetivo (C–P) para una fila de día.
 * - Preserva el atributo s="…" (estilo) de cada celda existente.
 * - Para celdas sin valor: escribe celda vacía (elimina <v>, <f>, <is>).
 * - Para columnas de horas: convierte a fracción de día antes de escribir.
 * - Para columna P: usa inlineStr.
 * - No toca columna B ni fila 45.
 */
function processDataRow(
  xml: string,
  rowNum: number,
  colValues: Record<TargetCol, number | string | undefined>,
  colStyles: Record<string, string>,
): string {
  const rowRegex = new RegExp(
    `(<row\\b[^>]*\\sr="${rowNum}"[^>]*>)([\\s\\S]*?)(<\\/row>)`,
  );
  const rowMatch = rowRegex.exec(xml);

  let openTag: string;
  let rowContent: string;
  let closeTag: string;

  if (rowMatch) {
    openTag    = rowMatch[1];
    rowContent = rowMatch[2];
    closeTag   = rowMatch[3];
  } else {
    openTag    = `<row r="${rowNum}">`;
    rowContent = '';
    closeTag   = '</row>';
  }

  for (const col of TARGET_COLS) {
    const ref   = `${col}${rowNum}`;
    const value = colValues[col];
    const isHour = HOUR_COLS.has(col);
    const isText = col === TEXT_COL;

    // Busca celda existente (con o sin cierre propio)
    const cellRegex = new RegExp(
      `<c\\b[^>]*r="${ref}"[^>]*(?:>[\\s\\S]*?<\\/c>|\\/>)`,
    );
    const cellMatch = cellRegex.exec(rowContent);
    const style = cellMatch
      ? extractStyleAttr(cellMatch[0])
      : (colStyles[col] ?? '');

    let newCell: string;

    if (value !== undefined && value !== null) {
      if (isText && typeof value === 'string') {
        newCell = buildStrCell(ref, style, value);
      } else if (isHour && typeof value === 'number') {
        const excelTime = hoursToExcelTime(value);
        newCell = excelTime !== undefined
          ? buildNumCell(ref, style, excelTime)
          : buildEmptyCell(ref, style);
      } else if (typeof value === 'number') {
        newCell = buildNumCell(ref, style, value);
      } else {
        newCell = buildEmptyCell(ref, style);
      }
    } else {
      // Sin valor → celda vacía (limpia fórmulas o valores anteriores)
      newCell = buildEmptyCell(ref, style);
    }

    if (cellMatch) {
      rowContent = rowContent.replace(cellRegex, () => newCell);
    } else {
      rowContent = insertCellInOrder(rowContent, ref, newCell);
    }
  }

  const newRowXml = openTag + rowContent + closeTag;
  if (rowMatch) {
    return xml.replace(rowMatch[0], () => newRowXml);
  }
  return insertRowInOrder(xml, rowNum, newRowXml);
}

/**
 * Escribe o actualiza una celda de cabecera (O4, O6) con texto inline.
 * No pertenece al ciclo TARGET_COLS de datos.
 */
function writeHeaderCell(xml: string, ref: string, value: string, colStyles: Record<string, string>): string {
  const col    = ref.replace(/\d+$/, '');
  const rowNum = parseInt(ref.replace(/\D/g, ''), 10);

  const cellRegex = new RegExp(
    `<c\\b[^>]*r="${ref}"[^>]*(?:>[\\s\\S]*?<\\/c>|\\/>)`,
  );
  const cellMatch = cellRegex.exec(xml);
  const style = cellMatch
    ? extractStyleAttr(cellMatch[0])
    : (colStyles[col] ?? '');

  const newCell = buildStrCell(ref, style, value);

  if (cellMatch) {
    return xml.replace(cellRegex, () => newCell);
  }

  // La celda no existe: insertar en la fila correcta
  const rowRegex = new RegExp(
    `(<row\\b[^>]*\\sr="${rowNum}"[^>]*>)([\\s\\S]*?)(<\\/row>)`,
  );
  const rowMatch = rowRegex.exec(xml);
  if (rowMatch) {
    const newContent = insertCellInOrder(rowMatch[2], ref, newCell);
    return xml.replace(rowMatch[0], () => rowMatch[1] + newContent + rowMatch[3]);
  }
  return insertRowInOrder(xml, rowNum, `<row r="${rowNum}">${newCell}</row>`);
}

// ─────────────────────────────────────────────
// Localización de la hoja dentro del ZIP
// ─────────────────────────────────────────────

async function findSheetPath(zip: JSZip): Promise<string> {
  const workbookFile = zip.file('xl/workbook.xml');
  if (!workbookFile) throw new Error('xl/workbook.xml no encontrado.');
  const workbookXml = await workbookFile.async('string');

  const sheetTagMatch = workbookXml.match(/<sheet\b[^>]*\sname="Description Report"[^>]*/);
  if (!sheetTagMatch) throw new Error('"Description Report" no encontrada en workbook.xml.');

  const rIdMatch = sheetTagMatch[0].match(/\sr:id="([^"]+)"/);
  if (!rIdMatch) throw new Error('Atributo r:id no encontrado en el tag de la hoja.');
  const rId = rIdMatch[1];

  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!relsFile) throw new Error('xl/_rels/workbook.xml.rels no encontrado.');
  const relsXml = await relsFile.async('string');

  const relTagMatch = relsXml.match(
    new RegExp(`<Relationship\\b[^>]*\\sId="${rId}"[^>]*`),
  );
  if (!relTagMatch) throw new Error(`Relación "${rId}" no encontrada en workbook.xml.rels.`);

  const targetMatch = relTagMatch[0].match(/\sTarget="([^"]+)"/);
  if (!targetMatch) throw new Error('Atributo Target no encontrado en la relación.');

  const target = targetMatch[1];
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
}

// ─────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────

export async function generateMonthlyReportFromTemplate(
  input: MonthlyReportInput,
): Promise<string> {
  const { year, month, employeeName, records } = input;

  // 1. Cargar plantilla original como base64
  const asset = Asset.fromModule(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../../assets/templates/Reporte_Horas_2026.xlsx') as number,
  );
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('No se pudo cargar la plantilla Excel.');

  const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
    encoding: 'base64',
  });

  // 2. Abrir como ZIP (nunca XLSX.write)
  const zip = new JSZip();
  await zip.loadAsync(base64, { base64: true });

  // Verificación de estructura interna
  const internalFiles = Object.keys(zip.files);
  console.log('[Template ZIP] Archivos internos del .xlsx:');
  internalFiles.forEach((f) => console.log(' ', f));
  const hasMedia    = internalFiles.some((f) => f.startsWith('xl/media'));
  const hasDrawings = internalFiles.some((f) => f.startsWith('xl/drawings'));
  const hasSheets   = internalFiles.some((f) => f.startsWith('xl/worksheets'));
  console.log(`[Template ZIP] xl/media: ${hasMedia} | xl/drawings: ${hasDrawings} | xl/worksheets: ${hasSheets}`);

  // 3. Localizar el XML de la hoja
  const sheetPath = await findSheetPath(zip);
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) throw new Error(`Archivo de hoja no encontrado en ZIP: ${sheetPath}`);
  let sheetXml = await sheetFile.async('string');

  // 4. Pre-escanear estilos de cada columna en el rango de datos (filas 14–44)
  //    para usarlos como fallback en celdas que no existan aún.
  const colStyles: Record<string, string> = {};
  for (const col of TARGET_COLS) {
    for (let row = 14; row <= 44; row++) {
      const ref = `${col}${row}`;
      const m   = new RegExp(`<c\\b[^>]*r="${ref}"[^>]*\\bs="([^"]+)"`).exec(sheetXml);
      if (m) { colStyles[col] = ` s="${m[1]}"`; break; }
    }
  }

  // 5. Cabecera: mes/año y nombre de empleado
  sheetXml = writeHeaderCell(sheetXml, 'O4', `${MESES_ES[month - 1]} ${year}`, colStyles);
  sheetXml = writeHeaderCell(sheetXml, 'O6', employeeName, colStyles);

  // 6. Escribir cada registro diario
  for (const record of records) {
    const { day } = record;
    if (day < 1 || day > 31) continue;
    const rowNum    = 13 + day;
    const colValues = resolveDailyExcelValues(record);
    sheetXml = processDataRow(sheetXml, rowNum, colValues, colStyles);
  }

  // 7. El ZIP final sale de JSZip, conservando todos los archivos originales
  zip.file(sheetPath, sheetXml);

  const outputBase64 = await zip.generateAsync({
    type:               'base64',
    compression:        'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // 8. Guardar en documentDirectory
  if (!FileSystem.documentDirectory) throw new Error('documentDirectory no disponible.');
  const safeName  = employeeName.replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
  const fileName  = `Reporte_${year}_${String(month).padStart(2, '0')}_${safeName}.xlsx`;
  const outputUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(outputUri, outputBase64, { encoding: 'base64' });
  return outputUri;
}

// ─────────────────────────────────────────────
// Helper de compartir
// ─────────────────────────────────────────────

export async function shareMonthlyReportFromTemplate(
  input: MonthlyReportInput,
): Promise<void> {
  const uri = await generateMonthlyReportFromTemplate(input);

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('La opción de compartir no está disponible.');

  await Sharing.shareAsync(uri, {
    mimeType:    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI:         'com.microsoft.excel.xlsx',
    dialogTitle: `Reporte ${MESES_ES[input.month - 1]} ${input.year}`,
  });
}
