export const STANDARD_END_MIN = 17 * 60;

/** Redondea al cuarto de hora más cercano en bloques de 30 min:
 *  0–14 min → :00 · 15–44 min → :30 · 45–59 min → siguiente hora :00 */
export function roundToNearest30(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  let rH = h;
  let rM: number;
  if (m < 15)      { rM = 0; }
  else if (m < 45) { rM = 30; }
  else             { rM = 0; rH = (h + 1) % 24; }
  return `${String(rH).padStart(2, '0')}:${String(rM).padStart(2, '0')}`;
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
  const num = parseFloat(trimmed.replace(',', '.'));
  if (!isNaN(num) && num > 0) return Math.round(num * 60);
  return null;
}
