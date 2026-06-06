import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { cancelFichajeReminder, scheduleFichajeReminder } from '@/utils/notifications';

export type Dieta = 'ninguna' | 'media' | 'completa';

export type QuickEntry = {
  fecha:          string;
  inicio:         string;
  fin?:           string;
  notas?:         string;
  notificationId?: string;
};

export type Registro = {
  id: string;
  titulo: string;
  cliente?: string;
  descripcion: string;
  /** Fecha de la jornada en formato YYYY-MM-DD. Puede diferir de createdAt si se registra al día siguiente. */
  fecha?: string;
  inicio: string;
  fin1?: string;
  inicio2?: string;
  fin: string;
  duracion: string;
  dieta?: Dieta;
  pernocta?: boolean;
  horasExtras?: number;
  createdAt: string;
  /** Solo para jornada Mixto: horas de la parte en casa / recuperación (formato "H:MM" o decimal) */
  homeRecoveryHours?: string;
  /** Solo para jornada Mixto: horas de la parte con cliente / exterior (formato "H:MM" o decimal) */
  externalHours?: string;
};

type RegistroContextValue = {
  registros: Registro[];
  loading: boolean;
  addRegistro: (registro: Omit<Registro, 'id' | 'createdAt'>) => Promise<void>;
  updateRegistro: (id: string, data: Partial<Omit<Registro, 'id' | 'createdAt'>>) => Promise<void>;
  deleteRegistro: (id: string) => Promise<void>;
  quickEntry: QuickEntry | null;
  saveQuickEntry: (entry: QuickEntry | null) => Promise<void>;
};

const STORAGE_KEY = '@salvagnini_registros';
const QUICK_KEY   = '@salvagnini_quick_entry';
const RegistroContext = createContext<RegistroContextValue | undefined>(undefined);

function isRegistro(value: unknown): value is Registro {
  if (!value || typeof value !== 'object') return false;

  const registro = value as Record<string, unknown>;
  return (
    typeof registro.id === 'string' &&
    typeof registro.titulo === 'string' &&
    typeof registro.descripcion === 'string' &&
    typeof registro.inicio === 'string' &&
    typeof registro.fin === 'string' &&
    typeof registro.duracion === 'string' &&
    typeof registro.createdAt === 'string'
  );
}

export function RegistroProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const registrosRef = useRef<Registro[]>([]);
  const [quickEntry, setQuickEntryState] = useState<QuickEntry | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [storedReg, storedQuick] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(QUICK_KEY),
        ]);
        if (storedReg) {
          const parsed = JSON.parse(storedReg);
          const list = Array.isArray(parsed) ? parsed.filter(isRegistro) : [];
          registrosRef.current = list;
          setRegistros(list);
        }
        if (storedQuick) {
          setQuickEntryState(JSON.parse(storedQuick));
        }
      } catch (error) {
        console.warn('Error cargando datos', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const saveQuickEntry = async (entry: QuickEntry | null) => {
    const prevNotifId = quickEntry?.notificationId;

    // Cancelar aviso cuando se borra la entrada, se registra salida o es una nueva entrada distinta
    const shouldCancel = !!prevNotifId && (
      !entry ||
      entry.fin !== undefined ||
      entry.inicio !== quickEntry?.inicio
    );
    if (shouldCancel && prevNotifId) cancelFichajeReminder(prevNotifId);

    // Programar aviso para una nueva entrada (sin fin ni notificación previa)
    let finalEntry = entry;
    if (entry && !entry.fin && !entry.notificationId) {
      const notifId = await scheduleFichajeReminder(entry.inicio);
      if (notifId) finalEntry = { ...entry, notificationId: notifId };
    }

    setQuickEntryState(finalEntry);
    try {
      if (finalEntry) {
        await AsyncStorage.setItem(QUICK_KEY, JSON.stringify(finalEntry));
      } else {
        await AsyncStorage.removeItem(QUICK_KEY);
      }
    } catch (error) {
      console.warn('Error guardando fichaje rápido', error);
    }
  };

  const addRegistro = async (registro: Omit<Registro, 'id' | 'createdAt'>) => {
    const newRegistro: Registro = {
      ...registro,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    const previous = registrosRef.current;
    const updated = [newRegistro, ...previous];
    registrosRef.current = updated;
    setRegistros(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      registrosRef.current = previous;
      setRegistros(previous);
      throw error;
    }
  };

  const updateRegistro = async (id: string, data: Partial<Omit<Registro, 'id' | 'createdAt'>>) => {
    const previous = registrosRef.current;
    const updated = previous.map((r) => (r.id === id ? { ...r, ...data } : r));
    registrosRef.current = updated;
    setRegistros(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      registrosRef.current = previous;
      setRegistros(previous);
      throw error;
    }
  };

  const deleteRegistro = async (id: string) => {
    const previous = registrosRef.current;
    const updated = previous.filter((r) => r.id !== id);
    registrosRef.current = updated;
    setRegistros(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      registrosRef.current = previous;
      setRegistros(previous);
      throw error;
    }
  };

  return (
    <RegistroContext.Provider value={{ registros, loading, addRegistro, updateRegistro, deleteRegistro, quickEntry, saveQuickEntry }}>
      {children}
    </RegistroContext.Provider>
  );
}

export function useRegistro() {
  const context = useContext(RegistroContext);
  if (!context) {
    throw new Error('useRegistro debe usarse dentro de RegistroProvider');
  }
  return context;
}
