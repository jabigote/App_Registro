/**
 * Admin features — stubs para funcionalidades de nivel maestro
 *
 * Estas características requieren un sistema de permisos multi-nivel
 * (usuario externo / usuario personal / maestro). Los stubs están aquí
 * para marcar la API pública; la implementación real vendrá con el
 * backend de autenticación.
 *
 * Niveles previstos:
 *   'external'  — usuario estándar sin features admin
 *   'personal'  — usuario personal (Javier); accede a Modo Viaje y Foto Justificante
 *   'master'    — acceso completo + gestión de usuarios
 */

export type UserLevel = 'external' | 'personal' | 'master';

// ── Feature flags ────────────────────────────────────────────────────────────

export type AdminFeatureFlags = {
  /** Modo Viaje: añade campos de desplazamiento, km y hotel a la jornada. */
  modoViaje: boolean;
  /** Foto Justificante: permite adjuntar imagen (ticket, hoja de firma) a un registro. */
  fotoJustificante: boolean;
  /** Exportación avanzada con firma digital y sello de empresa. */
  exportacionAvanzada: boolean;
  /** Panel de gestión de otros usuarios (solo master). */
  gestionUsuarios: boolean;
};

const FEATURE_MATRIX: Record<UserLevel, AdminFeatureFlags> = {
  external: {
    modoViaje:           false,
    fotoJustificante:    false,
    exportacionAvanzada: false,
    gestionUsuarios:     false,
  },
  personal: {
    modoViaje:           true,
    fotoJustificante:    true,
    exportacionAvanzada: false,
    gestionUsuarios:     false,
  },
  master: {
    modoViaje:           true,
    fotoJustificante:    true,
    exportacionAvanzada: true,
    gestionUsuarios:     true,
  },
};

export function getFeatureFlags(level: UserLevel): AdminFeatureFlags {
  return FEATURE_MATRIX[level];
}

// ── Stubs de funcionalidad ───────────────────────────────────────────────────

/**
 * Modo Viaje — stub
 * TODO: campos adicionales en nuevo.tsx (km ida/vuelta, hotel, dietas desplazamiento)
 */
export type ModoViajeData = {
  kmIdaVuelta?: number;
  hotelNoche?:  boolean;
  ciudadDestino?: string;
};

export function applyModoViaje(_registroId: string, _data: ModoViajeData): Promise<void> {
  return Promise.reject(new Error('Modo Viaje no implementado aún. Requiere build nativo y backend.'));
}

/**
 * Foto Justificante — stub
 * TODO: usar expo-image-picker, subir a Cloudinary/S3 o almacenar en FileSystem,
 *       guardar URI en Registro.justificanteUri
 */
export function attachFotoJustificante(_registroId: string): Promise<string> {
  return Promise.reject(new Error('Foto Justificante no implementado aún. Requiere expo-image-picker.'));
}
