@AGENTS.md

# [Nombre del proyecto]

## Comandos esenciales
- Build: `npm run build`
- Tests: `npm run test` (preferir tests individuales: `npm run test -- -t "nombre"`)
- Lint: `npm run lint`
- Dev: `npm run dev`

## Stack
- Node 20, TypeScript 5, React 18, Vite
- Tests: Vitest + Testing Library
- Estilos: Tailwind CSS

## Estilo de código
- ES modules (import/export), no CommonJS
- Destructuring en imports cuando sea posible
- Funciones async/await, no .then()
- Tipos explícitos en TypeScript (no `any`)

## Convenciones del proyecto
- Ramas: `feature/`, `fix/`, `chore/`
- Commits en inglés, formato conventional commits
- Tests obligatorios para nueva funcionalidad

## Compactación de contexto
Cuando compactes, preserva siempre: lista de archivos modificados,
comandos de test ejecutados y decisiones arquitectónicas tomadas.

## Directorios prohibidos
No leer `legacy/` ni `archive/` salvo que se indique explícitamente.
