import type { Registro } from '@/src/domain/registro';

export function getRegistroDateStr(registro: Pick<Registro, 'fecha' | 'createdAt'>): string {
  return registro.fecha ?? registro.createdAt.slice(0, 10);
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function findDateConflicts(
  registros: Registro[],
  dates: Iterable<string>,
  excludeId?: string,
): Registro[] {
  const dateSet = new Set(dates);
  return registros.filter((registro) =>
    registro.id !== excludeId && dateSet.has(getRegistroDateStr(registro)),
  );
}

export function isDateLocked(dateStr: string, lockedMonths: string[]): boolean {
  return lockedMonths.includes(getMonthKey(dateStr));
}
