import { useMemo } from 'react';

import { useRegistro } from '@/contexts/registro-context';
import { todayDateStr } from '@/utils/date';

export type FichajeAlert = {
  id: string;
  message: string;
};

export function useFichajeAlerts(): FichajeAlert[] {
  const { registros } = useRegistro();

  return useMemo(() => {
    const alerts: FichajeAlert[] = [];
    const now = new Date();
    const today = todayDateStr();
    const dow = now.getDay(); // 0=Dom, 1=Lun … 6=Sáb

    // Miércoles–viernes: avisa si no hay ninguna jornada laboral esta semana
    if (dow >= 3 && dow <= 5) {
      const offsetDays = dow - 1; // días desde el lunes
      const monday = new Date(now);
      monday.setDate(now.getDate() - offsetDays);
      const mondayStr = monday.toISOString().slice(0, 10);

      const weekHasEntries = registros.some((r) => {
        const d = r.fecha ?? r.createdAt.slice(0, 10);
        return d >= mondayStr && d <= today;
      });
      if (!weekHasEntries) {
        alerts.push({
          id: 'no-entries-week',
          message: 'No hay jornadas registradas esta semana.',
        });
      }
    }

    // Lunes: avisa si la semana anterior no tiene jornadas
    if (dow === 1) {
      const lastMon = new Date(now);
      lastMon.setDate(now.getDate() - 7);
      const lastFri = new Date(now);
      lastFri.setDate(now.getDate() - 3);
      const lastMonStr = lastMon.toISOString().slice(0, 10);
      const lastFriStr = lastFri.toISOString().slice(0, 10);

      const prevWeekHasEntries = registros.some((r) => {
        const d = r.fecha ?? r.createdAt.slice(0, 10);
        return d >= lastMonStr && d <= lastFriStr;
      });
      if (!prevWeekHasEntries) {
        alerts.push({
          id: 'empty-prev-week',
          message: 'La semana pasada no tiene jornadas registradas.',
        });
      }
    }

    return alerts;
  }, [registros]);
}
