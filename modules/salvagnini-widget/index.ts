/**
 * salvagnini-widget — Scaffolding para widget nativo iOS (WidgetKit / SwiftUI)
 *
 * Este módulo no tiene funcionalidad en Expo Go. Cuando la app se compile como
 * build nativo (EAS Build o bare workflow) deberá acompañarse del código Swift
 * descrito más abajo.
 *
 * ── Archivos Swift necesarios (crear en ios/SalvagniniWidget/) ──
 *
 *   SalvagniniWidget.swift      — Punto de entrada @main del widget extension
 *   SalvagniniEntry.swift       — Struct TimelineEntry con QuickEntryData
 *   SalvagniniProvider.swift    — TimelineProvider: lee App Group y construye la timeline
 *   SalvagniniWidgetView.swift  — View SwiftUI del widget (small / medium)
 *   SalvagniniWidget.entitlements — com.apple.security.application-groups habilitado
 *
 * ── App Group (compartir datos RN ↔ widget) ──
 *
 *   ID sugerido: group.com.salvagnini.jornada
 *   Activar en: Xcode → Signing & Capabilities → App Groups (tanto en app target como en widget target)
 *
 * ── Escritura desde React Native (lado JS) ──
 *
 *   import SharedGroupPreferences from 'react-native-shared-group-preferences';
 *   const GROUP = 'group.com.salvagnini.jornada';
 *
 *   export async function writeWidgetData(entry: QuickEntryData | null): Promise<void> {
 *     await SharedGroupPreferences.setItem('quickEntry', JSON.stringify(entry), GROUP);
 *   }
 *
 *   Llamar a writeWidgetData() cada vez que saveQuickEntry() cambie el estado.
 *
 * ── Datos que expone el widget ──
 */

export type QuickEntryWidgetData = {
  fecha:  string;        // YYYY-MM-DD
  inicio: string;        // HH:MM
  fin?:   string;        // HH:MM — undefined si está en curso
  estado: 'active' | 'complete' | 'idle';
};

/**
 * Serializa el QuickEntry actual al formato que consume el widget Swift.
 * Importar y llamar desde registro-context.tsx cuando la app tenga build nativo.
 */
export function toWidgetData(
  entry: { fecha: string; inicio: string; fin?: string } | null,
): QuickEntryWidgetData {
  if (!entry) return { fecha: '', inicio: '', estado: 'idle' };
  return {
    fecha:  entry.fecha,
    inicio: entry.inicio,
    fin:    entry.fin,
    estado: entry.fin ? 'complete' : 'active',
  };
}

// En Expo Go esta función es un no-op. Con build nativo sustituir por la llamada real.
export async function syncWidgetData(_entry: QuickEntryWidgetData): Promise<void> {
  // TODO (build nativo): await SharedGroupPreferences.setItem('quickEntry', JSON.stringify(_entry), GROUP);
}
