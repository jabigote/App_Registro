const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
}));

import { loadRegistroData } from '@/src/repositories/registro-repository';

describe('registro repository', () => {
  beforeEach(() => mockStorage.clear());

  test('discards invalid records and migrates storage version', async () => {
    mockStorage.set('@salvagnini_registros', JSON.stringify([{ id: 'invalid' }]));
    const result = await loadRegistroData();
    expect(result.registros).toEqual([]);
    expect(result.discardedRecords).toBe(1);
    expect(mockStorage.get('@salvagnini_schema_version')).toBe('3');
    expect(mockStorage.get('@salvagnini_registros')).toBe('[]');
  });

  test('keeps valid records when quick entry JSON is corrupted', async () => {
    const valid = {
      id: 'one',
      titulo: 'Oficina',
      descripcion: '',
      fecha: '2026-06-10',
      inicio: '08:00',
      fin: '17:00',
      duracion: '8h',
      createdAt: '2026-06-10T08:00:00.000Z',
    };
    mockStorage.set('@salvagnini_registros', JSON.stringify([valid]));
    mockStorage.set('@salvagnini_quick_entry', '{broken');
    const result = await loadRegistroData();
    expect(result.registros).toEqual([valid]);
    expect(result.quickEntry).toBeNull();
    expect(result.damagedStorage).toContain('fichaje rápido');
  });
});
