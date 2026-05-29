function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function offsetDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Devuelve "Hoy", "Ayer" o "Mié 4 jun" según la fecha YYYY-MM-DD. */
export function formatFecha(dateStr: string): string {
  const today = todayDateStr();
  const yesterday = offsetDateStr(today, -1);
  if (dateStr === today) return 'Hoy';
  if (dateStr === yesterday) return 'Ayer';
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
}
