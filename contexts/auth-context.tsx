import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export type Usuario = {
  nombre: string;
  email: string;
};

type AuthContextValue = {
  usuario: Usuario | null;
  loading: boolean;
  login: (nombre: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = '@salvagnini_usuario';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUsuario(JSON.parse(raw) as Usuario);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (nombre: string, email: string) => {
    const u: Usuario = { nombre: nombre.trim(), email: email.trim() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUsuario(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
