# AGENTS.md

## Proyecto

App móvil personal de **registro de jornada laboral para Salvagnini Ibérica**. Creada con Expo, React Native y Expo Router. Desarrollada en Windows / VS Code, probada en iPhone mediante Expo Go.

## Stack

- **Expo** ~54.0 / **React Native** 0.81 / **React** 19
- **TypeScript** ~5.9
- **Expo Router** ~6.0 (file-based routing)
- **AsyncStorage** para persistencia local (sin backend)
- **xlsx + jszip** para exportación de informes Excel

## Comandos (Windows PowerShell)

```powershell
npm.cmd install                        # instalar dependencias
npx.cmd expo start                     # iniciar en Expo Go
npx.cmd expo start --tunnel            # con túnel (redes restrictivas)
npx.cmd expo install <paquete>         # añadir paquete compatible con Expo
npm.cmd run lint                       # ESLint
```

No hay scripts de build, test ni dev server web configurados.

## Estructura de la app

### Pantallas (`app/`)

| Archivo | Ruta | Descripción |
|---|---|---|
| `_layout.tsx` | raíz | AuthGuard + proveedores (Auth, Registro) |
| `login.tsx` | `/login` | Pantalla de login (nombre + email, sin backend) |
| `index.tsx` | `/` | Panel de control: fichaje rápido + últimas jornadas |
| `nuevo.tsx` | `/nuevo` | Formulario de registro de jornada |
| `registros.tsx` | `/registros` | Lista de jornadas con búsqueda y borrado |
| `registro-detalle.tsx` | `/registro-detalle` | Detalle y edición de una jornada |
| `registro-mensual.tsx` | `/registro-mensual` | Resumen mensual + exportación Excel |
| `ajustes.tsx` | `/ajustes` | Info de usuario, estadísticas, logout |
| `modal.tsx` | `/modal` | Modal auxiliar |

### Contextos (`contexts/`)

- **`auth-context.tsx`** — `AuthProvider` / `useAuth`: login y logout con AsyncStorage. Clave: `@salvagnini_usuario`. Tipo `Usuario { nombre, email }`.
- **`registro-context.tsx`** — `RegistroProvider` / `useRegistro`: CRUD de jornadas + gestión del fichaje rápido (QuickEntry). Claves: `@salvagnini_registros`, `@salvagnini_quick_entry`.

### Tipos principales (`registro-context.tsx`)

```typescript
type Dieta = 'ninguna' | 'media' | 'completa';

type Registro = {
  id: string;
  titulo: string;           // tipo de jornada
  cliente?: string;         // solo para tipos Cliente y Mixto
  descripcion: string;
  fecha?: string;           // YYYY-MM-DD (puede diferir de createdAt)
  inicio: string;           // HH:MM (vacío en tipo Mixto)
  fin1?: string;
  inicio2?: string;
  fin: string;              // HH:MM (vacío en tipo Mixto)
  duracion: string;         // "Xh YYm"
  dieta?: Dieta;
  pernocta?: boolean;
  horasExtras?: number;
  createdAt: string;        // ISO
  homeRecoveryHours?: string; // solo Mixto
  externalHours?: string;     // solo Mixto
};

type QuickEntry = { fecha: string; inicio: string; fin?: string };
```

### Tipos de jornada

`Oficina` | `Cliente` | `Teletrabajo` | `Mixto` | `Casa`

- **Cliente** y **Mixto**: requieren campo `cliente`
- **Mixto**: usa `homeRecoveryHours` + `externalHours` en lugar de tramos horarios

### Servicios (`src/services/excel/`)

- `generateMonthlyReport.ts` — generación Excel desde cero
- `generateMonthlyReportFromTemplate.ts` — rellena la plantilla `Reporte_Horas_2026.xlsx` y la comparte vía `expo-sharing`

### Componentes (`components/`)

- `brand-logo.tsx` — logo Salvagnini (imagen + texto)
- `toast.tsx` — notificaciones efímeras (`useToast` hook)
- `themed-text.tsx`, `themed-view.tsx` — texto/vista con soporte dark mode
- `ui/` — `collapsible.tsx`, `icon-symbol.ios.tsx`

### Constantes (`constants/theme.ts`)

- `Colors.brand` = `#E30613` (rojo Salvagnini)
- `Colors.brandDark` = `#1F1F21`
- Soporte light/dark mode

### Utilidades (`utils/`)

- `date.ts` — `todayDateStr()`, `offsetDateStr()`, `formatFecha()` (devuelve "Hoy"/"Ayer"/formato corto)
- `time.ts` — `parseTime()`, `fmtDuration()`, `roundToNearest30()`, `STANDARD_END_MIN`

## Reglas de trabajo

- No convertir el proyecto a Vite.
- No usar Capacitor.
- No añadir dependencias innecesarias.
- No modificar archivos de configuración salvo que sea necesario.
- Mantener Expo Router.
- Usar componentes de React Native: `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `SafeAreaView`. **No usar HTML**: nada de `div`, `button`, `input`.
- Mantener TypeScript. Tipos explícitos, no `any`.
- Priorizar diseño mobile-first para iPhone, estilo iOS nativo.
- La app debe funcionar en Expo Go (sin builds nativos).
- No usar comandos Linux/WSL/rutas `/home` — siempre PowerShell.

## Criterio de aceptación

La app arranca con `npx.cmd expo start` y abre en iPhone con Expo Go sin errores de TypeScript ni imports.
