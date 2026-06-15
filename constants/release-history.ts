export type ReleaseEntry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: '1.2.0',
    date: '12 de junio de 2026',
    title: 'Planificación, cierre mensual e integridad reforzada',
    highlights: [
      'Se añadieron plantillas rápidas de jornada reutilizables y gestionables desde Ajustes.',
      'Se incorporaron vacaciones, permisos, enfermedad y festivos con exportación Excel compatible.',
      'El resumen mensual muestra objetivo, balance y permite cerrar meses para evitar cambios accidentales.',
      'Los recordatorios de cierre permiten configurar la duración y cancelan avisos pendientes al desactivarse.',
      'El fichaje rápido soporta jornadas que terminan al día siguiente.',
      'Las mutaciones locales ahora son atómicas y evitan pérdidas ante operaciones simultáneas.',
      'La carga local se recupera de bloques JSON dañados sin ocultar los registros válidos.',
      'Se corrigió el cómputo de horas extra en jornadas mixtas y se endureció la validación de backups.',
      'La importación de backups muestra periodo y tipos antes de fusionar o reemplazar.',
      'Se añadió cierre de sesión visible, más pruebas automatizadas y se retiró código residual.',
    ],
  },
  {
    version: '1.1.0',
    date: '10 de junio de 2026',
    title: 'Integridad, validación y experiencia de uso',
    highlights: [
      'Se añadió un repositorio local versionado con validación, migración y operaciones seguras sobre los registros.',
      'Los backups ahora permiten fusionar o reemplazar datos, detectan duplicados y rechazan registros dañados.',
      'La exportación Excel agrupa correctamente varias jornadas del mismo día y limpia los datos residuales de la plantilla.',
      'Se añadieron validaciones para tramos horarios solapados, jornadas mixtas y formatos de horas extras.',
      'El fichaje rápido gestiona errores, pulsaciones repetidas, jornadas de días anteriores y redondeos cercanos a medianoche.',
      'Se incorporaron las acciones de duplicar jornada y deshacer una eliminación.',
      'Las notificaciones de cierre ahora respetan la preferencia configurada en Ajustes.',
      'Se mejoraron navegación, accesibilidad, modo oscuro y adaptación a pantallas grandes.',
      'Se actualizaron los paquetes compatibles de Expo y se añadieron pruebas automatizadas.',
      'Se incorporó este historial de versiones accesible desde Ajustes.',
    ],
  },
  {
    version: '1.0.0',
    date: '10 de junio de 2026',
    title: 'Primera versión funcional',
    highlights: [
      'Creación inicial de la aplicación Expo con identidad visual de Salvagnini.',
      'Registro manual de jornadas con tipo, cliente, dieta, pernocta, horas extras y notas.',
      'Fichaje rápido de entrada y salida con recordatorio de cierre.',
      'Listado, búsqueda, filtros, edición y eliminación de jornadas.',
      'Resumen mensual con calendario, distribución por tipo y resumen semanal.',
      'Exportación del registro mensual manteniendo el formato de la plantilla Excel corporativa.',
      'Vista previa del Excel antes de compartirlo.',
      'Backup y restauración de los registros mediante archivos JSON.',
      'Soporte para tema claro, oscuro y apariencia automática.',
      'Mejoras visuales, animaciones, respuesta háptica y navegación mediante encabezado.',
    ],
  },
];

export const CURRENT_APP_VERSION = RELEASE_HISTORY[0].version;
