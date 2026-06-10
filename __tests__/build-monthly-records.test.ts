import { buildMonthlyDayRecords } from '@/src/services/excel/build-monthly-records';
import type { Registro } from '@/src/domain/registro';
import { resolveDailyExcelValues } from '@/src/services/excel/generateMonthlyReportFromTemplate';

const base: Registro = {
  id: 'a',
  titulo: 'Oficina',
  descripcion: 'Mantenimiento',
  fecha: '2026-06-10',
  inicio: '08:00',
  fin: '12:00',
  duracion: '4h',
  createdAt: '2026-06-10T08:00:00.000Z',
};

describe('monthly records', () => {
  test('aggregates multiple records from the same day into one Excel row', () => {
    const records = buildMonthlyDayRecords([
      base,
      {
        ...base,
        id: 'b',
        titulo: 'Cliente',
        cliente: 'ACME',
        inicio: '13:00',
        fin: '17:00',
        descripcion: 'Puesta en marcha',
      },
    ]);
    expect(records).toHaveLength(1);
    const columns = resolveDailyExcelValues(records[0]);
    expect(columns.E).toBe(4);
    expect(columns.F).toBe(4);
    expect(columns.J).toBe(8);
    expect(columns.P).toContain('ACME');
  });
});

