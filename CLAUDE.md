@AGENTS.md

# mi-app-ios — Contexto Claude

## Comandos reales del proyecto

```powershell
npx.cmd expo start          # arrancar (Expo Go en iPhone)
npx.cmd expo start --tunnel # con túnel
npm.cmd run lint            # ESLint
```

No existen scripts `build`, `test` ni `dev`. No hay Vite, Tailwind ni Vitest.

## Stack real

- Expo ~54 / React Native 0.81 / React 19 / TypeScript ~5.9
- Expo Router ~6 (sin bottom tabs, navegación Stack pura)
- Estilos con `StyleSheet.create` (React Native nativo)
- AsyncStorage para toda la persistencia (sin base de datos ni backend)

## Compactación de contexto

Preservar siempre: archivos modificados, claves de AsyncStorage usadas, decisiones de UX o estructura de tipos.

## Directorios que NO leer salvo indicación

- `node_modules/`
- `.expo/`
- `archivos/` (imágenes de referencia, logos)
- `assets/templates/` (binario Excel)
- `scripts/reset-project.js` (script de scaffold de Expo, no tocar)
