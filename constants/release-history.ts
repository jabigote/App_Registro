export type ReleaseEntry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: '1.5.0',
    date: '15 de junio de 2026',
    title: 'Navegación nativa y prevención de errores',
    highlights: [
      'Inicio, Registros, Mensual y Ajustes usan una barra de pestañas nativa más rápida y accesible.',
      'Nueva jornada y edición incorporan selector de fecha nativo y muestran claramente los meses cerrados.',
      'La app avisa antes de guardar jornadas o ausencias en fechas que ya contienen registros.',
      'El panel principal separa horas trabajadas, ausencias y horas extras del mes actual.',
      'Los meses cerrados se identifican antes de editar y requieren confirmación para volver a abrirse.',
      'Se ampliaron etiquetas de accesibilidad, áreas táctiles y pruebas automatizadas de los nuevos flujos.',
    ],
  },
  {
    version: '1.4.0',
    date: '15 de junio de 2026',
    title: 'Pantalla de ausencias independiente y rediseño de interfaz',
    highlights: [
      'Las ausencias tienen pantalla propia accesible desde el menú principal (botón S), con calendario mensual multi-selección para días sueltos o consecutivos, incluyendo fechas futuras.',
      'Permiso y enfermedad permiten indicar horas parciales y añadir descripción opcional.',
      'El tipo de jornada en "Nueva jornada" es ahora un desplegable compacto en lugar de chips horizontales.',
      'Rediseño general: tarjetas contenidas, separadores de línea fina, etiquetas de sección en mayúsculas y tipografía más clara en todas las pantallas.',
      'El menú de navegación incluye separadores visuales entre grupos de opciones.',
    ],
  },
  {
    version: '1.3.0',
    date: '15 de junio de 2026',
    title: 'Ausencias integradas y rediseño del panel principal',
    highlights: [
      'Las ausencias (vacaciones, permiso, enfermedad y festivo) se registran desde una sección desplegable dedicada, separada de los tipos de jornada.',
      'Soporte para ausencias de varios días: selección de fecha inicio y fin con contador de días.',
      'Permiso y enfermedad admiten horas parciales (para ausencias de solo unas horas) y campo de descripción.',
      'El panel principal estrena diseño con fichaje rápido en tarjeta, separadores de sección y lista de jornadas compacta con fecha visible.',
      'La vista y edición del detalle de una ausencia ya no muestra campos de horario, dieta ni pernocta irrelevantes.',
    ],
  },
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
