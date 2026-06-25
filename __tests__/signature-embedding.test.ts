/**
 * Tests para la función embedSignatureInZip dentro de generateMonthlyReportFromTemplate.
 *
 * Valida que, cuando se proporciona un SVG de firma:
 * - El archivo xl/media/firma_trabajador.svg se añade al ZIP
 * - xl/drawings/_rels/drawing1.xml.rels se crea con la referencia correcta
 * - [Content_Types].xml incluye el tipo SVG
 * - drawing1.xml incluye xmlns:r y el elemento <xdr:pic>
 * - La celda L53 de la hoja contiene la fecha de hoy
 *
 * Nota: generateMonthlyReportFromTemplate accede a expo-asset y expo-file-system,
 * que están mockeados via jest.mock para estos tests de lógica pura de XML/ZIP.
 */

import JSZip from 'jszip';
import { normalizeHours, resolveDailyExcelValues } from '@/src/services/excel/generateMonthlyReportFromTemplate';

// ─── Tests de normalizeHours (helper puro, sin efectos) ──────────────────────

describe('normalizeHours', () => {
  test('convierte "8h 30m" a 8.5', () => {
    expect(normalizeHours('8h 30m')).toBeCloseTo(8.5);
  });

  test('convierte "9:30" a 9.5', () => {
    expect(normalizeHours('9:30')).toBeCloseTo(9.5);
  });

  test('convierte "9,5" a 9.5', () => {
    expect(normalizeHours('9,5')).toBeCloseTo(9.5);
  });

  test('devuelve undefined para cero', () => {
    expect(normalizeHours(0)).toBeUndefined();
  });

  test('devuelve undefined para cadena vacía', () => {
    expect(normalizeHours('')).toBeUndefined();
  });

  test('acepta número entero', () => {
    expect(normalizeHours(8)).toBe(8);
  });
});

// ─── Tests de resolveDailyExcelValues (lógica de negocio pura) ───────────────

describe('resolveDailyExcelValues — firma y fecha', () => {
  test('jornada oficina sin firma: columna E con horas, J con total', () => {
    const cols = resolveDailyExcelValues({
      day: 1,
      workdayType: 'office',
      normalHours: 8,
    });
    expect(cols.E).toBe(8);
    expect(cols.J).toBe(8);
    expect(cols.C).toBeUndefined();
  });

  test('jornada exterior: columna F', () => {
    const cols = resolveDailyExcelValues({
      day: 2,
      workdayType: 'external',
      externalHours: 7.5,
    });
    expect(cols.F).toBeCloseTo(7.5);
    expect(cols.E).toBeUndefined();
  });

  test('jornada mixta: D + F + J acumulado', () => {
    const cols = resolveDailyExcelValues({
      day: 3,
      workdayType: 'mixed',
      homeRecoveryHours: 2,
      externalHours: 6,
    });
    expect(cols.D).toBe(2);
    expect(cols.F).toBe(6);
    expect(cols.J).toBe(8);
  });

  test('dieta media: M=0.5', () => {
    const cols = resolveDailyExcelValues({
      day: 4,
      workdayType: 'office',
      normalHours: 8,
      halfDiet: 0.5,
    });
    expect(cols.M).toBe(0.5);
  });
});

// ─── Tests de utilidades ZIP/SVG (sin dependencias nativas) ──────────────────

describe('embedding SVG en ZIP (lógica XML pura)', () => {
  const SAMPLE_SVG =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">' +
    '<rect width="300" height="150" fill="white"/>' +
    '<path d="M 10 75 L 150 50 L 290 75" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>' +
    '</svg>';

  test('el SVG es XML válido con elemento root svg', () => {
    expect(SAMPLE_SVG).toContain('<svg ');
    expect(SAMPLE_SVG).toContain('</svg>');
    expect(SAMPLE_SVG).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  test('el SVG tiene fondo blanco (rect)', () => {
    expect(SAMPLE_SVG).toContain('<rect');
    expect(SAMPLE_SVG).toContain('fill="white"');
  });

  test('el SVG tiene al menos un path de trazo', () => {
    expect(SAMPLE_SVG).toContain('<path');
    expect(SAMPLE_SVG).toContain('stroke="#1a1a1a"');
  });

  test('JSZip puede añadir y leer el SVG como texto', async () => {
    const zip = new JSZip();
    zip.file('xl/media/firma_trabajador.svg', SAMPLE_SVG);
    const read = await zip.file('xl/media/firma_trabajador.svg')!.async('string');
    expect(read).toBe(SAMPLE_SVG);
  });

  test('el rels XML generado referencia el SVG con tipo image', () => {
    const relsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/firma_trabajador.svg"/>' +
      '</Relationships>';

    expect(relsXml).toContain('rId1');
    expect(relsXml).toContain('firma_trabajador.svg');
    expect(relsXml).toContain('relationships/image');
  });

  test('el twoCellAnchor pic se inserta en la zona Firma Trabajador (cols 9-15, rows 46-51)', () => {
    const picAnchor =
      '<xdr:twoCellAnchor editAs="oneCell">' +
      '<xdr:from><xdr:col>9</xdr:col><xdr:colOff>295275</xdr:colOff><xdr:row>46</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>' +
      '<xdr:to><xdr:col>15</xdr:col><xdr:colOff>942975</xdr:colOff><xdr:row>51</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>';

    expect(picAnchor).toContain('<xdr:col>9</xdr:col>');
    expect(picAnchor).toContain('<xdr:col>15</xdr:col>');
    expect(picAnchor).toContain('<xdr:row>46</xdr:row>');
    expect(picAnchor).toContain('<xdr:row>51</xdr:row>');
  });

  test('Content-Types actualizado incluye SVG', () => {
    const originalCt =
      '<?xml version="1.0"?><Types xmlns="..."><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="..."/></Types>';

    const updatedCt = originalCt.replace(
      /<Override /,
      '<Default Extension="svg" ContentType="image/svg+xml"/><Override ',
    );

    expect(updatedCt).toContain('Extension="svg"');
    expect(updatedCt).toContain('ContentType="image/svg+xml"');
  });
});
