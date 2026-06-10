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
    expect(mockStorage.get('@salvagnini_schema_version')).toBe('2');
    expect(mockStorage.get('@salvagnini_registros')).toBe('[]');
  });
});
