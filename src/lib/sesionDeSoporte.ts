/**
 * La sesión del SOPORTE DE LA PLATAFORMA dentro de este panel (ver en el
 * backend `services/reseller/soportePlataformaAlPanel.ts`).
 *
 * La sesión en sí es un token de socio normal, guardado donde el panel guarda
 * el suyo. Esta marca sólo le dice a la interfaz que quien está delante es el
 * soporte: para pintar el marco y la barra con la salida, mandar el latido y
 * no contar sus pantallas como si las abriera el socio.
 */
export const CLAVE_SESION_DE_SOPORTE = "cguard_reseller_soporte";

export interface SesionDeSoporte {
  resellerName: string;
  userName: string;
  ticketAsunto: string | null;
  expiresAt: string;
}

export function leerSesionDeSoporte(): SesionDeSoporte | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION_DE_SOPORTE);
    if (!crudo) return null;
    const s = JSON.parse(crudo);
    if (!s || typeof s !== "object" || !s.expiresAt) return null;
    return s as SesionDeSoporte;
  } catch {
    return null;
  }
}

export function guardarSesionDeSoporte(s: SesionDeSoporte): void {
  try {
    localStorage.setItem(CLAVE_SESION_DE_SOPORTE, JSON.stringify(s));
  } catch {
    /* sin almacenamiento la sesión funciona igual; sólo falta la barra al recargar */
  }
}

export function borrarSesionDeSoporte(): void {
  try {
    localStorage.removeItem(CLAVE_SESION_DE_SOPORTE);
  } catch {
    /* nada que borrar */
  }
}
