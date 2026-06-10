# Historial de versiones

Este archivo registra en español las mejoras incluidas en cada versión publicada de la aplicación.

La versión debe actualizarse conjuntamente en `app.json`, `package.json` y
`constants/release-history.ts`. La prueba `version-history.test.ts` comprueba que las tres fuentes
permanezcan sincronizadas.

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

