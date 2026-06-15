import { TIPOS_REGISTRO, type Dieta, type TipoRegistro } from '@/src/domain/registro';

export type JornadaTemplate = {
  id: string;
  name: string;
  tipo: TipoRegistro;
  cliente?: string;
  inicio1?: string;
  fin1?: string;
  inicio2?: string;
  fin2?: string;
  homeRecoveryHours?: string;
  externalHours?: string;
  dieta?: Dieta;
  pernocta?: boolean;
};

export type AppSettings = {
  reminderHours: number;
  monthlyTargetHours: number;
  lockedMonths: string[];
  templates: JornadaTemplate[];
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  reminderHours: 9,
  monthlyTargetHours: 160,
  lockedMonths: [],
  templates: [
    {
      id: 'office-standard',
      name: 'Oficina habitual',
      tipo: 'Oficina',
      inicio1: '08:00',
      fin1: '13:00',
      inicio2: '14:00',
      fin2: '17:00',
      dieta: 'ninguna',
      pernocta: false,
    },
  ],
};

export function isJornadaTemplate(value: unknown): value is JornadaTemplate {
  if (!value || typeof value !== 'object') return false;
  const template = value as Record<string, unknown>;
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.tipo === 'string' &&
    TIPOS_REGISTRO.includes(template.tipo as TipoRegistro)
  );
}
