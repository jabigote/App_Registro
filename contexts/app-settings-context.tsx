import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  isJornadaTemplate,
  type JornadaTemplate,
} from '@/src/domain/app-settings';
import { NOTIFICATION_REMINDER_HOURS_KEY } from '@/utils/notifications';

const STORAGE_KEY = '@salvagnini_app_settings';

type AppSettingsContextValue = AppSettings & {
  setReminderHours: (hours: number) => Promise<void>;
  setMonthlyTargetHours: (hours: number) => Promise<void>;
  toggleMonthLock: (monthKey: string) => Promise<void>;
  addTemplate: (template: JornadaTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
};

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') return DEFAULT_APP_SETTINGS;
  const raw = value as Partial<AppSettings>;
  return {
    reminderHours: typeof raw.reminderHours === 'number' && raw.reminderHours > 0
      ? raw.reminderHours
      : DEFAULT_APP_SETTINGS.reminderHours,
    monthlyTargetHours: typeof raw.monthlyTargetHours === 'number' && raw.monthlyTargetHours > 0
      ? raw.monthlyTargetHours
      : DEFAULT_APP_SETTINGS.monthlyTargetHours,
    lockedMonths: Array.isArray(raw.lockedMonths)
      ? raw.lockedMonths.filter((item): item is string => typeof item === 'string')
      : [],
    templates: Array.isArray(raw.templates) && raw.templates.every(isJornadaTemplate)
      ? raw.templates
      : DEFAULT_APP_SETTINGS.templates,
  };
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const settingsRef = useRef<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const loaded = normalizeSettings(JSON.parse(raw) as unknown);
          settingsRef.current = loaded;
          setSettings(loaded);
        } catch {
          setSettings(DEFAULT_APP_SETTINGS);
        }
      })
      .catch(() => {});
  }, []);

  const commit = async (build: (current: AppSettings) => AppSettings) => {
    const next = build(settingsRef.current);
    settingsRef.current = next;
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setReminderHours = async (hours: number) => {
    await commit((current) => ({ ...current, reminderHours: hours }));
    await AsyncStorage.setItem(NOTIFICATION_REMINDER_HOURS_KEY, String(hours));
  };

  const setMonthlyTargetHours = async (hours: number) => {
    await commit((current) => ({ ...current, monthlyTargetHours: hours }));
  };

  const toggleMonthLock = async (monthKey: string) => {
    await commit((current) => ({
      ...current,
      lockedMonths: current.lockedMonths.includes(monthKey)
        ? current.lockedMonths.filter((key) => key !== monthKey)
        : [...current.lockedMonths, monthKey],
    }));
  };

  const addTemplate = async (template: JornadaTemplate) => {
    await commit((current) => ({ ...current, templates: [template, ...current.templates] }));
  };

  const deleteTemplate = async (id: string) => {
    await commit((current) => ({ ...current, templates: current.templates.filter((item) => item.id !== id) }));
  };

  return (
    <AppSettingsContext.Provider value={{
      ...settings,
      setReminderHours,
      setMonthlyTargetHours,
      toggleMonthLock,
      addTemplate,
      deleteTemplate,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) throw new Error('useAppSettings debe usarse dentro de AppSettingsProvider');
  return context;
}
