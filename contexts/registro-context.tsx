import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { isRegistro, registroFingerprint, type QuickEntry, type Registro } from '@/src/domain/registro';
import { loadRegistroData, saveQuickEntryValue, saveRegistros } from '@/src/repositories/registro-repository';
import { cancelFichajeReminder, scheduleFichajeReminder } from '@/utils/notifications';

export type { Dieta, QuickEntry, Registro } from '@/src/domain/registro';

type NewRegistro = Omit<Registro, 'id' | 'createdAt'>;

type RegistroContextValue = {
  registros: Registro[];
  loading: boolean;
  storageWarning: string | null;
  addRegistro: (registro: NewRegistro) => Promise<void>;
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
        if (data.discardedRecords > 0) {
          setStorageWarning(`Se ignoraron ${data.discardedRecords} registros dañados.`);
        }
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
      !entry || entry.fin !== undefined || entry.inicio !== previous?.inicio || entry.fecha !== previous?.fecha
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

  const replaceRegistros = async (next: Registro[]) => {
    const valid = next.filter(isRegistro);
    await queueMutation(async () => {
      await saveRegistros(valid);
      registrosRef.current = valid;
      setRegistros(valid);
    });
  };

  const addRegistro = async (registro: NewRegistro) => {
    const newRegistro: Registro = {
      ...registro,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    await replaceRegistros([newRegistro, ...registrosRef.current]);
  };

  const updateRegistro = async (id: string, data: Partial<NewRegistro>) => {
    await replaceRegistros(registrosRef.current.map((r) => (r.id === id ? { ...r, ...data } : r)));
  };

  const deleteRegistro = async (id: string) => {
    await replaceRegistros(registrosRef.current.filter((r) => r.id !== id));
  };

  const mergeRegistros = async (incoming: Registro[]) => {
    const fingerprints = new Set(registrosRef.current.map(registroFingerprint));
    const additions = incoming.filter(isRegistro).filter((r) => {
      const fingerprint = registroFingerprint(r);
      if (fingerprints.has(fingerprint)) return false;
      fingerprints.add(fingerprint);
      return true;
    });
    if (additions.length > 0) await replaceRegistros([...additions, ...registrosRef.current]);
    return additions.length;
  };

  const clearRegistros = async () => replaceRegistros([]);

  return (
    <RegistroContext.Provider value={{
      registros, loading, storageWarning, addRegistro, updateRegistro, deleteRegistro,
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
