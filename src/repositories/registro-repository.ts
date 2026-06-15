import AsyncStorage from '@react-native-async-storage/async-storage';

import { isQuickEntry, isRegistro, type QuickEntry, type Registro } from '@/src/domain/registro';

const STORAGE_KEY = '@salvagnini_registros';
const QUICK_KEY = '@salvagnini_quick_entry';
const SCHEMA_KEY = '@salvagnini_schema_version';
const CURRENT_SCHEMA_VERSION = 3;

function parseJson(raw: string | null): { value: unknown; damaged: boolean } {
  if (!raw) return { value: null, damaged: false };
  try {
    return { value: JSON.parse(raw) as unknown, damaged: false };
  } catch {
    return { value: null, damaged: true };
  }
}

export async function loadRegistroData() {
  const [storedRegistros, storedQuick, storedVersion] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(QUICK_KEY),
    AsyncStorage.getItem(SCHEMA_KEY),
  ]);
  const parsedRegistrosResult = parseJson(storedRegistros);
  const parsedRegistros = parsedRegistrosResult.value ?? [];
  const rawList = Array.isArray(parsedRegistros) ? parsedRegistros : [];
  const registros = rawList.filter(isRegistro);
  const parsedQuickResult = parseJson(storedQuick);
  const parsedQuick = parsedQuickResult.value;
  const version = Number(storedVersion ?? 1);
  if (version < CURRENT_SCHEMA_VERSION || registros.length !== rawList.length || parsedRegistrosResult.damaged) {
    await saveRegistros(registros);
  }
  if (parsedQuickResult.damaged || (parsedQuick !== null && !isQuickEntry(parsedQuick))) {
    await saveQuickEntryValue(null);
  }
  await AsyncStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA_VERSION));
  return {
    registros,
    quickEntry: isQuickEntry(parsedQuick) ? parsedQuick : null,
    discardedRecords: rawList.length - registros.length,
    damagedStorage: [
      parsedRegistrosResult.damaged ? 'registros' : null,
      parsedQuickResult.damaged ? 'fichaje rápido' : null,
    ].filter((value): value is string => value !== null),
  };
}

export async function saveRegistros(registros: Registro[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export async function saveQuickEntryValue(entry: QuickEntry | null): Promise<void> {
  if (entry) await AsyncStorage.setItem(QUICK_KEY, JSON.stringify(entry));
  else await AsyncStorage.removeItem(QUICK_KEY);
}
