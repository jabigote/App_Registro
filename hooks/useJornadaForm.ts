import { useMemo, useState } from 'react';

import { type Dieta } from '@/contexts/registro-context';
import { calculateScheduleMinutes, fmtDuration, parseHoursInput } from '@/utils/time';

export const TIPOS_JORNADA = [
  { value: 'Oficina',     label: 'Oficina' },
  { value: 'Cliente',     label: 'Cliente / Exterior' },
  { value: 'Teletrabajo', label: 'Teletrabajo' },
  { value: 'Mixto',       label: 'Mixto (casa + cliente)' },
  { value: 'Casa',        label: 'Casa (recuperación de horas)' },
  { value: 'Vacaciones',  label: 'Vacaciones' },
  { value: 'Permiso',     label: 'Permiso' },
  { value: 'Enfermedad',  label: 'Enfermedad' },
  { value: 'Festivo',     label: 'Festivo' },
];

export const DIETA_OPTS: { value: Dieta; label: string }[] = [
  { value: 'ninguna',  label: 'Sin dieta' },
  { value: 'media',    label: '½ Dieta' },
  { value: 'completa', label: 'Dieta completa' },
];

export const DIETA_LABEL: Record<Dieta, string> = {
  ninguna: 'Sin dieta',
  media: '½ Dieta',
  completa: 'Dieta completa',
};

export function needsCliente(tipo: string): boolean {
  return tipo === 'Cliente' || tipo === 'Mixto';
}

export type JornadaFormOptions = {
  initialTipo?: string;
  initialCliente?: string;
  initialInicio1?: string;
  initialFin1?: string;
  initialInicio2?: string;
  initialFin2?: string;
  initialHomeRecovery?: string;
  initialExternalHours?: string;
  initialDieta?: Dieta;
  initialPernocta?: boolean;
  initialHorasExtras?: string;
  initialDescripcion?: string;
  /** Permite que el primer tramo termine durante el día siguiente. */
  allowNextDay?: boolean;
};

export function useJornadaForm(options: JornadaFormOptions = {}) {
  const [tipoJornada, setTipoJornada]           = useState(options.initialTipo ?? '');
  const [tipoOpen, setTipoOpen]                 = useState(false);
  const [nombreCliente, setNombreCliente]       = useState(options.initialCliente ?? '');
  const [inicio1, setInicio1]                   = useState(options.initialInicio1 ?? '08:00');
  const [fin1, setFin1]                         = useState(options.initialFin1 ?? '13:00');
  const [inicio2, setInicio2]                   = useState(options.initialInicio2 ?? '');
  const [fin2, setFin2]                         = useState(options.initialFin2 ?? '');
  const [homeRecoveryInput, setHomeRecoveryInput] = useState(options.initialHomeRecovery ?? '');
  const [externalHoursInput, setExternalHoursInput] = useState(options.initialExternalHours ?? '');
  const [dieta, setDieta]                       = useState<Dieta>(options.initialDieta ?? 'ninguna');
  const [pernocta, setPernocta]                 = useState(options.initialPernocta ?? false);
  const [horasExtras, setHorasExtras]           = useState(options.initialHorasExtras ?? '0');
  const [descripcion, setDescripcion]           = useState(options.initialDescripcion ?? '');

  const isMixed = tipoJornada === 'Mixto';

  const { duracion, scheduleError } = useMemo(() => {
    if (isMixed) return { duracion: null, scheduleError: null };
    const result = calculateScheduleMinutes(inicio1, fin1, inicio2, fin2, options.allowNextDay ?? false);
    return {
      duracion: result.minutes === null ? null : fmtDuration(result.minutes),
      scheduleError: result.error,
    };
  }, [isMixed, inicio1, fin1, inicio2, fin2, options.allowNextDay]);

  const { mixedDuration, mixedError } = useMemo(() => {
    if (!isMixed) return { mixedDuration: null, mixedError: null };
    const homeMin = parseHoursInput(homeRecoveryInput);
    const extMin  = parseHoursInput(externalHoursInput);
    if (homeRecoveryInput.trim() && homeMin === null) {
      return { mixedDuration: null, mixedError: 'Las horas en casa no tienen un formato válido.' };
    }
    if (externalHoursInput.trim() && extMin === null) {
      return { mixedDuration: null, mixedError: 'Las horas de cliente no tienen un formato válido.' };
    }
    const total = (homeMin ?? 0) + (extMin ?? 0);
    return {
      mixedDuration: total > 0 ? fmtDuration(total) : null,
      mixedError: total > 0 ? null : 'Introduce al menos un tramo de horas.',
    };
  }, [isMixed, homeRecoveryInput, externalHoursInput]);

  const effectiveDuration = isMixed ? mixedDuration : duracion;
  const extrasError =
    horasExtras.trim() !== '' && horasExtras.trim() !== '0' && parseHoursInput(horasExtras) === null
      ? 'Las horas extras no tienen un formato válido.'
      : null;
  const validationError = isMixed ? mixedError : scheduleError;
  const canSave =
    tipoJornada.length > 0 &&
    (!needsCliente(tipoJornada) || nombreCliente.trim().length > 0) &&
    effectiveDuration !== null &&
    validationError === null &&
    extrasError === null;

  return {
    tipoJornada, setTipoJornada,
    tipoOpen, setTipoOpen,
    nombreCliente, setNombreCliente,
    inicio1, setInicio1,
    fin1, setFin1,
    inicio2, setInicio2,
    fin2, setFin2,
    homeRecoveryInput, setHomeRecoveryInput,
    externalHoursInput, setExternalHoursInput,
    dieta, setDieta,
    pernocta, setPernocta,
    horasExtras, setHorasExtras,
    descripcion, setDescripcion,
    isMixed,
    duracion,
    mixedDuration,
    effectiveDuration,
    validationError,
    extrasError,
    canSave,
  };
}
