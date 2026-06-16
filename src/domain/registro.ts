export const TIPOS_REGISTRO = [
  'Oficina', 'Cliente', 'Teletrabajo', 'Mixto', 'Casa',
  'Vacaciones', 'Permiso', 'Enfermedad', 'Festivo',
] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];

export type Dieta = 'ninguna' | 'media' | 'completa';

export type QuickEntry = {
  fecha: string;
  inicio: string;
  fin?: string;
  finFecha?: string;
  notas?: string;
  notificationId?: string;
};

export type Registro = {
  id: string;
  titulo: string;
  cliente?: string;
  descripcion: string;
  fecha?: string;
  inicio: string;
  fin1?: string;
  inicio2?: string;
  fin: string;
  finFecha?: string;
  duracion: string;
  dieta?: Dieta;
  pernocta?: boolean;
  horasExtras?: number;
  createdAt: string;
  homeRecoveryHours?: string;
  externalHours?: string;
};

export type NewRegistro = Omit<Registro, 'id' | 'createdAt'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DURATION_RE = /^\d+h(?: \d{1,2}m)?$/;
const DIETAS = ['ninguna', 'media', 'completa'] as const;

function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidDuration(value: string): boolean {
  const match = value.match(DURATION_RE);
  if (!match) return false;
  const minutes = value.match(/(\d{1,2})m/)?.[1];
  return minutes === undefined || Number(minutes) < 60;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalTime(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && TIME_RE.test(value));
}

function isOptionalHours(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().replace(',', '.');
  const colon = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) return Number(colon[2]) < 60 && Number(colon[1]) * 60 + Number(colon[2]) > 0;
  return /^\d+(?:\.\d+)?$/.test(normalized) && Number(normalized) > 0;
}

export function isRegistro(value: unknown): value is Registro {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.titulo === 'string' &&
    TIPOS_REGISTRO.includes(r.titulo as TipoRegistro) &&
    typeof r.descripcion === 'string' &&
    typeof r.inicio === 'string' &&
    typeof r.fin === 'string' &&
    typeof r.duracion === 'string' &&
    isValidDuration(r.duracion) &&
    typeof r.createdAt === 'string' &&
    !Number.isNaN(Date.parse(r.createdAt)) &&
    (r.fecha === undefined || (typeof r.fecha === 'string' && isValidDateString(r.fecha))) &&
    (r.inicio === '' || TIME_RE.test(r.inicio)) &&
    (r.fin === '' || TIME_RE.test(r.fin)) &&
    (r.finFecha === undefined || (typeof r.finFecha === 'string' && isValidDateString(r.finFecha))) &&
    isOptionalString(r.cliente) &&
    isOptionalTime(r.fin1) &&
    isOptionalTime(r.inicio2) &&
    isOptionalHours(r.homeRecoveryHours) &&
    isOptionalHours(r.externalHours) &&
    (r.dieta === undefined || DIETAS.includes(r.dieta as Dieta)) &&
    (r.pernocta === undefined || typeof r.pernocta === 'boolean') &&
    (r.horasExtras === undefined || (
      typeof r.horasExtras === 'number' && Number.isFinite(r.horasExtras) && r.horasExtras >= 0
    )) &&
    (!['Cliente', 'Mixto'].includes(String(r.titulo)) || (typeof r.cliente === 'string' && r.cliente.trim().length > 0)) &&
    (r.titulo !== 'Mixto' || r.homeRecoveryHours !== undefined || r.externalHours !== undefined)
  );
}

export function isQuickEntry(value: unknown): value is QuickEntry {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.fecha === 'string' &&
    isValidDateString(q.fecha) &&
    typeof q.inicio === 'string' &&
    TIME_RE.test(q.inicio) &&
    (q.fin === undefined || (typeof q.fin === 'string' && TIME_RE.test(q.fin))) &&
    (q.finFecha === undefined || (typeof q.finFecha === 'string' && isValidDateString(q.finFecha))) &&
    (q.notas === undefined || typeof q.notas === 'string') &&
    (q.notificationId === undefined || typeof q.notificationId === 'string')
  );
}

export function registroFingerprint(
  registro: Pick<
    Registro,
    'fecha' | 'createdAt' | 'titulo' | 'cliente' | 'inicio' | 'fin' | 'finFecha' | 'duracion' | 'descripcion'
  >,
): string {
  return [
    registro.fecha ?? registro.createdAt.slice(0, 10),
    registro.titulo,
    registro.cliente?.trim().toLocaleLowerCase() ?? '',
    registro.inicio,
    registro.fin,
    registro.finFecha ?? '',
    registro.duracion,
    registro.descripcion.trim().toLocaleLowerCase(),
  ].join('|');
}

export function mergeUniqueRegistros(existing: Registro[], incoming: Registro[]): Registro[] {
  const fingerprints = new Set(existing.map(registroFingerprint));
  const additions = incoming.filter(isRegistro).filter((registro) => {
    const fingerprint = registroFingerprint(registro);
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    return true;
  });
  return [...additions, ...existing];
}
