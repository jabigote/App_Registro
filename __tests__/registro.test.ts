import { isRegistro, mergeUniqueRegistros, registroFingerprint, type Registro } from '@/src/domain/registro';

const registro: Registro = {
  id: 'one',
  titulo: 'Oficina',
  descripcion: '',
  fecha: '2026-06-10',
  inicio: '08:00',
  fin: '17:00',
  duracion: '8h',
  createdAt: '2026-06-10T08:00:00.000Z',
};

describe('registro domain', () => {
  test('validates complete records', () => {
    expect(isRegistro(registro)).toBe(true);
    expect(isRegistro({ id: 'broken' })).toBe(false);
  });

  test('fingerprint ignores generated ids', () => {
    const { id: _id, ...withoutId } = registro;
    expect(registroFingerprint(registro)).toBe(registroFingerprint(withoutId));
  });

  test('backup merge ignores logical duplicates', () => {
    expect(mergeUniqueRegistros([registro], [{ ...registro, id: 'two' }])).toHaveLength(1);
    expect(mergeUniqueRegistros([registro], [{ ...registro, id: 'two', fecha: '2026-06-11' }])).toHaveLength(2);
  });
});
