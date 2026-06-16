import type { NewRegistro, TipoRegistro } from '@/src/domain/registro';
import { fmtDuration } from '@/utils/time';

export type AbsenceType = Extract<TipoRegistro, 'Vacaciones' | 'Permiso' | 'Enfermedad' | 'Festivo'>;

export function buildAbsenceRegistros(
  dates: string[],
  tipo: AbsenceType,
  minutes: number,
  descripcion: string,
): NewRegistro[] {
  return dates.map((fecha) => ({
    titulo: tipo,
    fecha,
    inicio: '',
    fin: '',
    duracion: fmtDuration(minutes),
    descripcion: descripcion.trim(),
  }));
}
