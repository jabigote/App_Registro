# Historial de versiones

Este archivo registra en español las mejoras incluidas en cada versión publicada de la aplicación.

La versión debe actualizarse conjuntamente en `app.json`, `package.json` y
`constants/release-history.ts`. La prueba `version-history.test.ts` comprueba que las tres fuentes
permanezcan sincronizadas.

## 1.8.0 — 19 de junio de 2026

- El encabezado de cada sección mensual en Registros muestra el número de jornadas del mes.
- Estado vacío con filtro activo incluye un botón "Limpiar filtro" para restablecer búsqueda y tipo de un solo toque.
- Feedback háptico al confirmar swipe de edición (suave) y de borrado (medio).
- La edición rápida de horario valida solapamientos con otras jornadas del mismo día antes de guardar.

## 1.7.1 — 19 de junio de 2026

- Corregida la posición del botón "+" flotante en la pantalla de Registros: ya no se solapa con la barra de pestañas inferior en iOS.

## 1.5.0 — 15 de junio de 2026

- Navegación principal mediante pestañas nativas para Inicio, Registros, Mensual y Ajustes.
- Selector de fecha nativo en creación y edición de jornadas.
- Avisos antes de guardar registros duplicados en una misma fecha.
- Panel principal con desglose de horas trabajadas, ausencias y horas extras.
- Estados visibles y confirmaciones para meses cerrados.
- Mejoras de accesibilidad y pruebas automatizadas para conflictos y ausencias múltiples.

## 1.4.0 — 15 de junio de 2026

- Nueva pantalla "Ausencias" accesible desde el menú desplegable (botón S), con calendario mensual para seleccionar días sueltos, incluyendo fechas futuras.
- Permiso y enfermedad admiten horas parciales y descripción opcional; vacaciones y festivos registran 8h/día automáticamente.
- El tipo de jornada en "Nueva jornada" pasa a ser un desplegable compacto, eliminando los chips horizontales.
- Rediseño general con tarjetas contenidas, separadores de línea fina, etiquetas de sección en mayúsculas y menú de navegación con separadores visuales.

## 1.3.0 — 15 de junio de 2026

- Ausencias (vacaciones, permiso, enfermedad, festivo) movidas a una sección desplegable propia dentro del formulario de nueva jornada.
- Soporte de rango de fechas para ausencias de varios días; permiso y enfermedad admiten horas parciales y descripción opcional.
- Rediseño del panel principal: fichaje rápido en tarjeta contenida, etiquetas de sección, separadores de línea fina y lista de jornadas recientes con fecha visible.
- Vista y edición de ausencias sin campos de horario, dieta ni pernocta innecesarios.

## 1.2.0 — 12 de junio de 2026

- Añadidas plantillas rápidas, ausencias, festivos, objetivo y cierre mensual.
- Corregidas las mutaciones concurrentes, la recuperación de almacenamiento y las horas extra mixtas.
- Añadidos recordatorios configurables, soporte de fichajes nocturnos y previsualización de backups.
- Ampliada la cobertura automatizada y retirado código residual del template Expo.

## 1.1.0 — 10 de junio de 2026

### Integridad y almacenamiento

- Se añadió un repositorio local versionado sobre AsyncStorage.
- Se incorporaron validación, migración y recuperación visible ante registros dañados.
- Las escrituras de registros se serializan para evitar pérdidas por operaciones simultáneas.
- Los backups permiten fusionar o reemplazar datos y eliminan duplicados lógicos.
- Se implementó el borrado real de todos los registros.
- El perfil local puede editarse desde Ajustes.

### Jornadas y fichaje

- Se bloquean horarios inválidos, tramos incompletos y tramos solapados.
- Se validan correctamente las jornadas mixtas y las horas extras.
- Las horas extras ya no se sobrescriben automáticamente al modificar el horario.
- El fichaje rápido gestiona errores, pulsaciones repetidas y cambios de día próximos a medianoche.
- Se avisa cuando queda abierto un fichaje perteneciente a un día anterior.
- El recordatorio de cierre respeta la preferencia configurada en Ajustes.

### Excel

- Varias jornadas del mismo día se agregan en una única fila del reporte.
- Se suman correctamente horas de oficina, exterior, casa y horas extras.
- Se combinan clientes y notas sin sobrescribir información.
- Se limpian todas las filas diarias antes de generar el archivo para evitar datos residuales.
- La vista previa utiliza la misma transformación que el Excel final.

### Interfaz y calidad

- Se añadió la acción de duplicar jornada.
- Se añadió la opción de deshacer después de eliminar.
- Se mejoraron accesibilidad, navegación, modo oscuro y adaptación a tablet.
- Se actualizaron los parches compatibles de Expo.
- Se eliminaron dependencias sin uso.
- Se incorporaron pruebas automatizadas para tiempos, registros, migraciones y Excel.
- Se añadió el historial de versiones accesible desde Ajustes.

## 1.0.0 — 10 de junio de 2026

### Primera versión funcional

- Creación inicial de la aplicación Expo y de la identidad visual.
- Registro manual de jornadas con sus datos laborales principales.
- Fichaje rápido de entrada y salida.
- Gestión, búsqueda, filtrado, edición y eliminación de jornadas.
- Resumen mensual, calendario y analíticas.
- Exportación y vista previa de la plantilla Excel corporativa.
- Backup y restauración JSON.
- Notificaciones, modo oscuro, animaciones y respuesta háptica.
