# AGENTS.md

## Proyecto

Aplicación móvil personal creada con Expo, React Native y Expo Router.

El proyecto se desarrolla en Windows con VS Code y se prueba en iPhone mediante Expo Go.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- iOS mediante Expo Go
- Windows como entorno principal

## Comandos

Usar estos comandos en Windows PowerShell:

- Instalar dependencias: `npm.cmd install`
- Iniciar Expo: `npx.cmd expo start`
- Iniciar Expo con túnel: `npx.cmd expo start --tunnel`
- Instalar paquetes Expo: `npx.cmd expo install <paquete>`

No usar comandos de Linux, WSL ni rutas `/home`.

## Reglas de trabajo

- No convertir el proyecto a Vite.
- No usar Capacitor.
- No añadir dependencias innecesarias.
- No modificar archivos de configuración salvo que sea necesario.
- Mantener Expo Router.
- Usar componentes de React Native: `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `SafeAreaView`.
- No usar HTML: nada de `div`, `button`, `input`.
- Mantener TypeScript.
- Priorizar diseño mobile-first para iPhone.
- Crear una interfaz limpia, moderna y funcional.
- Evitar código excesivamente complejo.
- Dejar la app funcionando en Expo Go.

## Objetivo inicial

Crear una primera versión de app personal con:

- Pantalla Inicio
- Pantalla Nuevo registro
- Pantalla Registros
- Pantalla Ajustes
- Navegación entre pantallas
- Diseño tipo iOS
- Estructura clara para añadir almacenamiento local después

## Criterio de aceptación

La app debe arrancar con:

`npx.cmd expo start`

Y debe poder abrirse en iPhone usando Expo Go.

No debe haber errores de TypeScript ni errores de imports.
