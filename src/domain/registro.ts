export const TIPOS_REGISTRO = ['Oficina', 'Cliente', 'Teletrabajo', 'Mixto', 'Casa'] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];

export type Dieta = 'ninguna' | 'media' | 'completa';

export type QuickEntry = {
  fecha: string;
  inicio: string;
  fin?: string;
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
  duracion: string;
  dieta?: Dieta;
  pernocta?: boolean;
  horasExtras?: number;
  createdAt: string;
  homeRecoveryHours?: string;
  externalHours?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DURATION_RE = /^\d+h(?: \d{1,2}m)?$/;

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
    DURATION_RE.test(r.duracion) &&
    typeof r.createdAt === 'string' &&
    !Number.isNaN(Date.parse(r.createdAt)) &&
    (r.fecha === undefined || (typeof r.fecha === 'string' && DATE_RE.test(r.fecha))) &&
    (r.inicio === '' || TIME_RE.test(r.inicio)) &&
    (r.fin === '' || TIME_RE.test(r.fin)) &&
    (r.horasExtras === undefined || (typeof r.horasExtras === 'number' && r.horasExtras >= 0))
  );
}

export function isQuickEntry(value: unknown): value is QuickEntry {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.fecha === 'string' &&
    DATE_RE.test(q.fecha) &&
    typeof q.inicio === 'string' &&
    TIME_RE.test(q.inicio) &&
    (q.fin === undefined || (typeof q.fin === 'string' && TIME_RE.test(q.fin)))
  );
}

export function registroFingerprint(
  registro: Pick<Registro, 'fecha' | 'createdAt' | 'titulo' | 'cliente' | 'inicio' | 'fin' | 'duracion' | 'descripcion'>,
): string {
  return [
    registro.fecha ?? registro.createdAt.slice(0, 10),
    registro.titulo,
    registro.cliente?.trim().toLocaleLowerCase() ?? '',
    registro.inicio,
    registro.fin,
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
