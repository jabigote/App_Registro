import type { Registro } from '@/src/domain/registro';
import { durationToMinutes, fmtDuration } from '@/utils/time';

export function getRegistroDate(registro: Registro): Date {
  if (registro.fecha) return new Date(`${registro.fecha}T12:00:00`);
  return new Date(registro.createdAt);
}

export function getDayFromRegistro(registro: Registro): number {
  return getRegistroDate(registro).getDate();
}

export function filterRegistrosByMonth(registros: Registro[], year: number, month: number): Registro[] {
  return registros.filter((registro) => {
    const date = getRegistroDate(registro);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function totalMinutesFor(registros: Registro[]): number {
  return registros.reduce((sum, registro) => sum + durationToMinutes(registro.duracion), 0);
}

export function totalHoursLabel(registros: Registro[]): string {
  return fmtDuration(totalMinutesFor(registros));
}

export function getWeekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const format = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;
  return `${format(start)}–${format(end)}`;
}

export function buildWeeklySummary(registros: Registro[]) {
  const weeks: Record<string, { mins: number; count: number }> = {};
  registros.forEach((registro) => {
    const date = registro.fecha ?? registro.createdAt.slice(0, 10);
    const key = getWeekStart(date);
    if (!weeks[key]) weeks[key] = { mins: 0, count: 0 };
    weeks[key].mins += durationToMinutes(registro.duracion);
    weeks[key].count += 1;
  });
  return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
}

export function buildTypeSummary(registros: Registro[]) {
  const totals: Record<string, number> = {};
  registros.forEach((registro) => {
    totals[registro.titulo] = (totals[registro.titulo] ?? 0) + durationToMinutes(registro.duracion);
  });
  return Object.entries(totals).sort(([, a], [, b]) => b - a);
}
