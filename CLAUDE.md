# mi-app-ios — Contexto Claude

## Stack
Expo ~54 / React Native 0.81 / React 19 / TypeScript ~5.9 · Expo Router ~6 (Native Tabs + Stack) · AsyncStorage (sin backend) · xlsx+jszip para exportación Excel · Probada en iPhone con Expo Go.

## Comandos (PowerShell)
```powershell
npx.cmd expo start           # arrancar
npx.cmd expo start --tunnel  # con túnel
npm.cmd run lint             # ESLint
```
No existen scripts `build` ni `dev`. Hay scripts `lint`, `typecheck` y `test`. No hay Vite, Tailwind ni Vitest.

## Restricciones — leer primero
- No HTML (`div`, `button`, `input`). Solo componentes RN: `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `SafeAreaView`.
- No Vite, no Capacitor ni builds nativos. La navegación principal usa Native Tabs de Expo Router.
- No añadir dependencias innecesarias.
- No tocar `scripts/reset-project.js`.
- TypeScript explícito, sin `any`.
- Siempre PowerShell — nunca rutas `/home` ni comandos Linux.

## Directorios a ignorar
`node_modules/` · `.expo/` · `archivos/` · `assets/templates/`

## Pantallas (`app/`)
| Archivo | Ruta | Función |
|---|---|---|
| `_layout.tsx` | raíz | AuthGuard + proveedores (GestureHandlerRootView incluido) |
| `login.tsx` | `/login` | Login (nombre + email, local) |
| `(tabs)/index.tsx` | `/` | Home: fichaje rápido 3 estados (idle/active/complete) + stats mes + CTAs |
| `nuevo.tsx` | `/nuevo` | Formulario nueva jornada; detecta tramo tarde si inicioPreset ≥ 13:00 |
| `(tabs)/registros.tsx` | `/registros` | Lista agrupada por mes; swipe derecha=editar, izquierda=borrar |
| `registro-detalle.tsx` | `/registro-detalle` | Detalle + edición |
| `(tabs)/registro-mensual.tsx` | `/registro-mensual` | Resumen mensual + exportar Excel |
| `(tabs)/ajustes.tsx` | `/ajustes` | Usuario, estadísticas, logout |
| `ausencias.tsx` | `/ausencias` | Registro de ausencias (modal) |

## Diseño de la home (`(tabs)/index.tsx`)
- **Sin ScrollView** — layout fijo flex: header + fichajeZone(flex:1) + statsBar + ctaRow
- **Estado idle**: anillo decorativo + "Sin fichar" + botón verde Entrada
- **Estado active**: badge verde "En curso" + tiempo transcurrido (~60px) + botón rojo Salida
- **Estado complete**: badge ámbar + rango horario + botón "Completar jornada →"
- Stats: 3 columnas (este mes / extras / Mensual→) en card horizontal
- CTAs: "Nueva jornada" (brand, flex 2) + "Ausencias" (outline, flex 1)
- Importa `expo-image Image` para el `brandMark` en el header

## Swipe en Registros (`(tabs)/registros.tsx`)
- `friction={1.5}`, `leftThreshold={30}`, `rightThreshold={30}`
- Acciones con `borderRadius: 18` y `minWidth: 88` para zona táctil suficiente
- `GestureHandlerRootView` ya está en `_layout.tsx` raíz

## Tabs (`(tabs)/_layout.tsx`)
- Inicio: `home-outline` / `home`
- Registros: `document-text-outline` / `document-text`
- Mensual: `stats-chart-outline` / `stats-chart`
- Ajustes: `settings-outline` / `settings`

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
