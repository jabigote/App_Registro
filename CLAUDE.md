# mi-app-ios — Contexto Claude

## Stack
Expo ~54 / React Native 0.81 / React 19 / TypeScript ~5.9 · Expo Router ~6 (Stack pura, sin tabs) · AsyncStorage (sin backend) · xlsx+jszip para exportación Excel · Probada en iPhone con Expo Go.

## Comandos (PowerShell)
```powershell
npx.cmd expo start           # arrancar
npx.cmd expo start --tunnel  # con túnel
npm.cmd run lint             # ESLint
```
No existen scripts `build`, `test` ni `dev`. No hay Vite, Tailwind ni Vitest.

## Restricciones — leer primero
- No HTML (`div`, `button`, `input`). Solo componentes RN: `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `SafeAreaView`.
- No Vite, no Capacitor, no bottom tabs, no builds nativos.
- No añadir dependencias innecesarias.
- No tocar `scripts/reset-project.js`.
- TypeScript explícito, sin `any`.
- Siempre PowerShell — nunca rutas `/home` ni comandos Linux.

## Directorios a ignorar
`node_modules/` · `.expo/` · `archivos/` · `assets/templates/`

## Pantallas (`app/`)
| Archivo | Ruta | Función |
|---|---|---|
| `_layout.tsx` | raíz | AuthGuard + proveedores |
| `login.tsx` | `/login` | Login (nombre + email, local) |
| `index.tsx` | `/` | Panel: fichaje rápido + últimas jornadas |
| `nuevo.tsx` | `/nuevo` | Formulario nueva jornada |
| `registros.tsx` | `/registros` | Lista con búsqueda y borrado |
| `registro-detalle.tsx` | `/registro-detalle` | Detalle + edición |
| `registro-mensual.tsx` | `/registro-mensual` | Resumen mensual + exportar Excel |
| `ajustes.tsx` | `/ajustes` | Usuario, estadísticas, logout |

## Contextos y claves AsyncStorage
- **`auth-context.tsx`** — `useAuth`. Clave `@salvagnini_usuario`. Tipo `{ nombre, email }`.
- **`registro-context.tsx`** — `useRegistro`. Claves `@salvagnini_registros`, `@salvagnini_quick_entry`. CRUD + QuickEntry.

## Tipos clave (ver `registro-context.tsx` para definición completa)
- `Dieta`: `'ninguna' | 'media' | 'completa'`
- `Registro`: id, titulo, cliente?, descripcion, fecha (YYYY-MM-DD), inicio/fin (HH:MM), duracion ("Xh YYm"), dieta?, pernocta?, horasExtras?, homeRecoveryHours?, externalHours?
- `QuickEntry`: `{ fecha, inicio, fin?, notas?, notificationId? }`
- Tipos de jornada: `Oficina | Cliente | Teletrabajo | Mixto | Casa`
  - **Cliente/Mixto**: requieren `cliente`
  - **Mixto**: usa `homeRecoveryHours` + `externalHours`, sin tramos horarios

## Servicios y utils
- `src/services/excel/generateMonthlyReportFromTemplate.ts` — rellena `Reporte_Horas_2026.xlsx` y comparte vía `expo-sharing`
- `utils/notifications.ts` — `scheduleFichajeReminder(inicio)` / `cancelFichajeReminder(id)` con `expo-notifications`
- `utils/date.ts` — `todayDateStr()`, `offsetDateStr()`, `formatFecha()` (devuelve "Hoy"/"Ayer"/corto)
- `utils/time.ts` — `parseTime()`, `fmtDuration()`, `roundToNearest30()`, `STANDARD_END_MIN`

## Tema
`Colors.brand = #E30613` (rojo Salvagnini) · `Colors.brandDark = #1F1F21` · soporte light/dark.
