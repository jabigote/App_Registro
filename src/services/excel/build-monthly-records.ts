import type { Registro } from '@/src/domain/registro';
import type { MonthlyDayRecord } from '@/src/services/excel/generateMonthlyReportFromTemplate';
import { durationToMinutes, parseHoursInput } from '@/utils/time';

type DailyAccumulator = MonthlyDayRecord & {
  office: number;
  external: number;
  home: number;
  overtime: number;
  clients: Set<string>;
  notesList: Set<string>;
};

export function buildMonthlyDayRecords(registros: Registro[]): MonthlyDayRecord[] {
  const days = new Map<number, DailyAccumulator>();

  for (const registro of registros) {
    const date = registro.fecha ? new Date(`${registro.fecha}T12:00:00`) : new Date(registro.createdAt);
    const day = date.getDate();
    const current = days.get(day) ?? {
      day,
      workdayType: 'mixed',
      office: 0,
      external: 0,
      home: 0,
      overtime: 0,
      clients: new Set<string>(),
      notesList: new Set<string>(),
    };
    const overtime = Math.max(0, registro.horasExtras ?? 0);
    const baseHours = Math.max(0, durationToMinutes(registro.duracion) / 60 - overtime);

    if (registro.titulo === 'Oficina') current.office += baseHours;
    else if (registro.titulo === 'Casa') current.home += baseHours;
    else if (registro.titulo === 'Mixto') {
      const home = (parseHoursInput(registro.homeRecoveryHours ?? '') ?? 0) / 60;
      const external = (parseHoursInput(registro.externalHours ?? '') ?? 0) / 60;
      const externalBase = Math.max(0, external - overtime);
      const remainingOvertime = Math.max(0, overtime - external);
      current.home += Math.max(0, home - remainingOvertime);
      current.external += externalBase;
    } else if (['Vacaciones', 'Permiso', 'Enfermedad'].includes(registro.titulo)) {
      current.vacationPermissionSickHours =
        Number(current.vacationPermissionSickHours ?? 0) + baseHours;
    } else if (registro.titulo === 'Festivo') {
      current.fullHoliday = 1;
    } else current.external += baseHours;

    current.overtime += overtime;
    current.halfDiet = Math.max(current.halfDiet ?? 0, registro.dieta === 'media' ? 1 : 0) || undefined;
    current.fullDiet = Math.max(current.fullDiet ?? 0, registro.dieta === 'completa' ? 1 : 0) || undefined;
    current.overnight = Math.max(current.overnight ?? 0, registro.pernocta ? 1 : 0) || undefined;
    if (registro.cliente?.trim()) current.clients.add(registro.cliente.trim());
    if (registro.descripcion.trim()) current.notesList.add(registro.descripcion.trim());
    days.set(day, current);
  }

  return [...days.values()].sort((a, b) => a.day - b.day).map((day) => ({
    day: day.day,
    workdayType: 'mixed',
    officeHours: day.office || undefined,
    externalHours: day.external || undefined,
    homeRecoveryHours: day.home || undefined,
    vacationPermissionSickHours: day.vacationPermissionSickHours,
    overtime25: day.overtime || undefined,
    halfHoliday: day.halfHoliday,
    fullHoliday: day.fullHoliday,
    halfDiet: day.halfDiet,
    fullDiet: day.fullDiet,
    overnight: day.overnight,
    clientName: [...day.clients].join(', ') || undefined,
    notes: [...day.notesList].join(' | ') || undefined,
  }));
}
