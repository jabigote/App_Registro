import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

export type Dieta = 'ninguna' | 'media' | 'completa';

export type Registro = {
  id: string;
  titulo: string;
  cliente?: string;
  descripcion: string;
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
};

const STORAGE_KEY = '@salvagnini_registros';
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

  useEffect(() => {
    async function loadRegistros() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const storedRegistros = Array.isArray(parsed) ? parsed.filter(isRegistro) : [];
          registrosRef.current = storedRegistros;
          setRegistros(storedRegistros);
        }
      } catch (error) {
        console.warn('Error cargando registros', error);
      } finally {
        setLoading(false);
      }
    }

    loadRegistros();
  }, []);

  const addRegistro = async (registro: Omit<Registro, 'id' | 'createdAt'>) => {
    const newRegistro: Registro = {
      ...registro,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRegistro, ...registrosRef.current];
    registrosRef.current = updated;
    setRegistros(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Error guardando registro', error);
    }
  };

  const updateRegistro = async (id: string, data: Partial<Omit<Registro, 'id' | 'createdAt'>>) => {
    const updated = registrosRef.current.map((r) => (r.id === id ? { ...r, ...data } : r));
    registrosRef.current = updated;
    setRegistros(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Error actualizando registro', error);
    }
  };

  const deleteRegistro = async (id: string) => {
    const updated = registrosRef.current.filter((r) => r.id !== id);
    registrosRef.current = updated;
    setRegistros(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Error eliminando registro', error);
    }
  };

  return (
    <RegistroContext.Provider value={{ registros, loading, addRegistro, updateRegistro, deleteRegistro }}>
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
