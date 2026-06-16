import type { Registro } from '@/src/domain/registro';
import {
  buildTypeSummary,
  buildWeeklySummary,
  buildMonthlyBreakdown,
  filterRegistrosByMonth,
  totalHoursLabel,
  totalMinutesFor,
} from '@/src/services/monthly/analytics';

const records: Registro[] = [
  {
    id: 'one',
    titulo: 'Oficina',
    descripcion: '',
    fecha: '2026-06-08',
    inicio: '08:00',
    fin: '12:00',
    duracion: '4h',
    createdAt: '2026-06-08T08:00:00.000Z',
  },
  {
    id: 'two',
    titulo: 'Cliente',
    descripcion: '',
    fecha: '2026-06-09',
    inicio: '13:00',
    fin: '17:30',
    duracion: '4h 30m',
    createdAt: '2026-06-09T13:00:00.000Z',
  },
];

describe('monthly analytics', () => {
  test('calculates totals and groups records', () => {
    expect(totalMinutesFor(records)).toBe(510);
    expect(totalHoursLabel(records)).toBe('8h 30m');
    expect(buildTypeSummary(records)).toEqual([['Cliente', 270], ['Oficina', 240]]);
    expect(buildWeeklySummary(records)).toEqual([['2026-06-08', { mins: 510, count: 2 }]]);
  });

  test('filters records by calendar month', () => {
    expect(filterRegistrosByMonth(records, 2026, 5)).toEqual(records);
    expect(filterRegistrosByMonth(records, 2026, 4)).toEqual([]);
  });

  test('separates worked, absence and overtime minutes', () => {
    expect(buildMonthlyBreakdown([
      { ...records[0], horasExtras: 1 },
      { ...records[1], titulo: 'Vacaciones' },
    ])).toEqual({
      workedMinutes: 240,
      absenceMinutes: 270,
      overtimeMinutes: 60,
    });
  });
});
