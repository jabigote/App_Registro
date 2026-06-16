import { buildAbsenceRegistros } from '@/src/services/registro/builders';

describe('registro builders', () => {
  test('builds every selected absence in one batch with normalized values', () => {
    expect(buildAbsenceRegistros(
      ['2026-06-15', '2026-06-16'],
      'Permiso',
      150,
      '  Médico  ',
    )).toEqual([
      {
        titulo: 'Permiso',
        fecha: '2026-06-15',
        inicio: '',
        fin: '',
        duracion: '2h 30m',
        descripcion: 'Médico',
      },
      {
        titulo: 'Permiso',
        fecha: '2026-06-16',
        inicio: '',
        fin: '',
        duracion: '2h 30m',
        descripcion: 'Médico',
      },
    ]);
  });
});
