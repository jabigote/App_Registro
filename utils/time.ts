export const STANDARD_END_MIN = 17 * 60;

/** Redondea al cuarto de hora más cercano en bloques de 30 min:
 *  0–14 min → :00 · 15–44 min → :30 · 45–59 min → siguiente hora :00 */
export function roundToNearest30(date: Date): string {
  return roundDateToNearest30(date).time;
}

export function roundDateToNearest30(date: Date): { date: Date; time: string } {
  const rounded = new Date(date);
  const h = date.getHours();
  const m = date.getMinutes();
  let rH = h;
  let rM: number;
  if (m < 15)      { rM = 0; }
  else if (m < 45) { rM = 30; }
  else             { rM = 0; rH = h + 1; }
  rounded.setHours(rH, rM, 0, 0);
  return {
    date: rounded,
    time: `${String(rounded.getHours()).padStart(2, '0')}:${String(rM).padStart(2, '0')}`,
  };
}

export function parseTime(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Acepta "H:MM", "H,5", "H.5" o "H". Devuelve minutos o null si inválido. */
export function parseHoursInput(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed || trimmed === '0') return null;
  const colon = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const mn = parseInt(colon[2], 10);
    if (mn > 59) return null;
    return h * 60 + mn;
  }
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const num = Number(normalized);
  if (Number.isFinite(num) && num > 0) return Math.round(num * 60);
  return null;
}

export function durationToMinutes(duracion: string): number {
  const h = duracion.match(/(\d+)h/);
  const m = duracion.match(/(\d+)m/);
  return (h ? parseInt(h[1], 10) : 0) * 60 + (m ? parseInt(m[1], 10) : 0);
}

export function calculateScheduleMinutes(
  inicio1: string,
  fin1: string,
  inicio2 = '',
  fin2 = '',
  allowNextDay = false,
): { minutes: number | null; error: string | null } {
  const s1 = parseTime(inicio1);
  const rawE1 = parseTime(fin1);
  const e1 = rawE1 !== null && allowNextDay && rawE1 <= (s1 ?? 0) ? rawE1 + 24 * 60 : rawE1;
  if (s1 === null || e1 === null || e1 <= s1) {
    return { minutes: null, error: 'El primer tramo no es válido.' };
  }
  let minutes = e1 - s1;
  const hasSecond = inicio2.trim().length > 0 || fin2.trim().length > 0;
  if (hasSecond) {
    const s2 = parseTime(inicio2);
    const e2 = parseTime(fin2);
    if (s2 === null || e2 === null || e2 <= s2) {
      return { minutes: null, error: 'Completa correctamente el segundo tramo.' };
    }
    if (s2 < e1) {
      return { minutes: null, error: 'Los tramos horarios no pueden solaparse.' };
    }
    minutes += e2 - s2;
  }
  return { minutes, error: null };
}
