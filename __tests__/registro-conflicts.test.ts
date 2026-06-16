import type { Registro } from '@/src/domain/registro';
import { findDateConflicts, isDateLocked } from '@/src/services/registro/conflicts';

const base: Registro = {
  id: 'one',
  titulo: 'Oficina',
  descripcion: '',
  fecha: '2026-06-10',
  inicio: '08:00',
  fin: '17:00',
  duracion: '8h',
  createdAt: '2026-06-10T08:00:00.000Z',
};

describe('registro conflicts', () => {
  test('finds records sharing selected dates and supports excluding the edited record', () => {
    expect(findDateConflicts([base], ['2026-06-10'])).toEqual([base]);
    expect(findDateConflicts([base], ['2026-06-10'], 'one')).toEqual([]);
  });

  test('detects closed months from a date', () => {
    expect(isDateLocked('2026-06-10', ['2026-06'])).toBe(true);
    expect(isDateLocked('2026-07-01', ['2026-06'])).toBe(false);
  });
});
