import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { isRegistro, mergeUniqueRegistros, type QuickEntry, type Registro } from '@/src/domain/registro';
import { loadRegistroData, saveQuickEntryValue, saveRegistros } from '@/src/repositories/registro-repository';
import { cancelFichajeReminder, scheduleFichajeReminder } from '@/utils/notifications';
import { useAppSettings } from '@/contexts/app-settings-context';

export type { Dieta, QuickEntry, Registro } from '@/src/domain/registro';

type NewRegistro = Omit<Registro, 'id' | 'createdAt'>;

type RegistroContextValue = {
  registros: Registro[];
  loading: boolean;
  storageWarning: string | null;
  addRegistro: (registro: NewRegistro) => Promise<void>;
  addRegistros: (registros: NewRegistro[]) => Promise<void>;
  updateRegistro: (id: string, data: Partial<NewRegistro>) => Promise<void>;
  deleteRegistro: (id: string) => Promise<void>;
  replaceRegistros: (registros: Registro[]) => Promise<void>;
  mergeRegistros: (registros: Registro[]) => Promise<number>;
  clearRegistros: () => Promise<void>;
  quickEntry: QuickEntry | null;
  saveQuickEntry: (entry: QuickEntry | null) => Promise<void>;
};

const RegistroContext = createContext<RegistroContextValue | undefined>(undefined);

export function RegistroProvider({ children }: { children: ReactNode }) {
  const { lockedMonths } = useAppSettings();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [quickEntry, setQuickEntryState] = useState<QuickEntry | null>(null);
  const registrosRef = useRef<Registro[]>([]);
  const mutationRef = useRef(Promise.resolve());

  const queueMutation = async <T,>(mutation: () => Promise<T>): Promise<T> => {
    const result = mutationRef.current.then(mutation, mutation);
    mutationRef.current = result.then(() => undefined, () => undefined);
    return result;
  };

  useEffect(() => {
    loadRegistroData()
      .then((data) => {
        registrosRef.current = data.registros;
        setRegistros(data.registros);
        setQuickEntryState(data.quickEntry);
        const warnings = [];
        if (data.discardedRecords > 0) warnings.push(`Se ignoraron ${data.discardedRecords} registros dañados.`);
        if (data.damagedStorage.length > 0) warnings.push(`Se recuperó almacenamiento dañado: ${data.damagedStorage.join(', ')}.`);
        setStorageWarning(warnings.join(' ') || null);
      })
      .catch((error) => {
        console.warn('Error cargando datos', error);
        setStorageWarning('No se pudieron cargar todos los datos locales.');
      })
      .finally(() => setLoading(false));
  }, []);

  const saveQuickEntry = async (entry: QuickEntry | null) => {
    const previous = quickEntry;
    const previousNotificationId = previous?.notificationId;
    const shouldCancel = !!previousNotificationId && (
      !entry || entry.fin !== undefined || entry.inicio !== previous?.inicio || entry.fecha !== previous?.fecha ||
      entry.notificationId !== previousNotificationId
    );
    if (shouldCancel && previousNotificationId) await cancelFichajeReminder(previousNotificationId);

    let finalEntry = entry;
    if (entry && !entry.fin && !entry.notificationId) {
      const notificationId = await scheduleFichajeReminder(entry.inicio, entry.fecha);
      if (notificationId) finalEntry = { ...entry, notificationId };
    }
    await saveQuickEntryValue(finalEntry);
    setQuickEntryState(finalEntry);
  };

  const commitRegistros = async (buildNext: (current: Registro[]) => Registro[]) => {
    await queueMutation(async () => {
      const next = buildNext(registrosRef.current);
      if (!next.every(isRegistro)) {
        throw new Error('La operación generó uno o más registros no válidos.');
      }
      await saveRegistros(next);
      registrosRef.current = next;
      setRegistros(next);
    });
  };

  const assertUnlocked = (registro: Pick<Registro, 'fecha' | 'createdAt'>) => {
    const monthKey = (registro.fecha ?? registro.createdAt.slice(0, 10)).slice(0, 7);
    if (lockedMonths.includes(monthKey)) throw new Error(`El mes ${monthKey} está cerrado.`);
  };

  const replaceRegistros = async (next: Registro[]) => commitRegistros(() => next);

  const addRegistros = async (items: NewRegistro[]) => {
    if (items.length === 0) return;
    const createdAt = new Date().toISOString();
    const newRegistros: Registro[] = items.map((registro, index) => ({
      ...registro,
      id: `${Date.now().toString(36)}-${index.toString(36)}-${Math.random().toString(36).slice(2)}`,
      createdAt,
    }));
    newRegistros.forEach(assertUnlocked);
    await commitRegistros((current) => [...newRegistros, ...current]);
  };

  const addRegistro = async (registro: NewRegistro) => addRegistros([registro]);

  const updateRegistro = async (id: string, data: Partial<NewRegistro>) => {
    await commitRegistros((current) => current.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, ...data };
      assertUnlocked(r);
      assertUnlocked(updated);
      return updated;
    }));
  };

  const deleteRegistro = async (id: string) => {
    await commitRegistros((current) => current.filter((r) => {
      if (r.id !== id) return true;
      assertUnlocked(r);
      return false;
    }));
  };

  const mergeRegistros = async (incoming: Registro[]) => {
    let additions = 0;
    await commitRegistros((current) => {
      const merged = mergeUniqueRegistros(current, incoming);
      additions = merged.length - current.length;
      return merged;
    });
    return additions;
  };

  const clearRegistros = async () => replaceRegistros([]);

  return (
    <RegistroContext.Provider value={{
      registros, loading, storageWarning, addRegistro, addRegistros, updateRegistro, deleteRegistro,
      replaceRegistros, mergeRegistros, clearRegistros, quickEntry, saveQuickEntry,
    }}>
      {children}
    </RegistroContext.Provider>
  );
}

export function useRegistro() {
  const context = useContext(RegistroContext);
  if (!context) throw new Error('useRegistro debe usarse dentro de RegistroProvider');
  return context;
}
