/**
 * ════════════════════════════════════════════════════════════════════════════
 * CÓMO SE LLAMA UN ROL DEL EQUIPO DEL SOCIO
 *
 * El servidor manda `id`, `label` y `description` de cada rol. El `id` es la
 * autoridad y no se toca. El TEXTO, en cambio, se pone aquí.
 *
 * ── POR QUÉ NO SE USA EL DEL SERVIDOR ─────────────────────────────────────
 * Porque el servidor sólo habla UN idioma por campo, y además no el mismo en
 * los dos: `label` viene en inglés («Billing Manager») y `description` en
 * castellano («Ve las empresas y administra la facturación»). Pintarlos tal
 * cual daba una pantalla en inglés con descripciones en castellano, y una en
 * castellano con los nombres de los roles en inglés. Las dos mezcladas, y cada
 * una por un motivo distinto.
 *
 * Esto NO es definir autoridad desde el panel: el rol sigue siendo el `id`, los
 * permisos siguen saliendo de la respuesta del servidor y quien llama a la API
 * sin permiso sigue recibiendo un 403. Aquí sólo se decide cómo se escribe.
 *
 * ── Y UN ROL QUE NO CONOCEMOS SE ENSEÑA COMO LO MANDE EL SERVIDOR ─────────
 * Si mañana aparece un séptimo rol, el panel enseña su `label` y su
 * `description` tal cual. Mejor un rótulo en el idioma que no toca —que se ve
 * y se reporta— que un rol sin nombre o, peor, con el nombre de otro.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { t, type Clave } from "@/i18n/idioma";

const NOMBRE: Record<string, Clave> = {
  "reseller:owner": "rol.owner",
  "reseller:admin": "rol.admin",
  "reseller:billing": "rol.billing",
  "reseller:account_manager": "rol.accountManager",
  "reseller:support": "rol.support",
  "reseller:readonly": "rol.readonly",
};

const DESCRIPCION: Record<string, Clave> = {
  "reseller:owner": "rolDesc.owner",
  "reseller:admin": "rolDesc.admin",
  "reseller:billing": "rolDesc.billing",
  "reseller:account_manager": "rolDesc.accountManager",
  "reseller:support": "rolDesc.support",
  "reseller:readonly": "rolDesc.readonly",
};

/** El nombre del rol. `respaldo` es lo que mandó el servidor, por si no lo conocemos. */
export function nombreDeRol(id: string | null | undefined, respaldo?: string | null): string {
  const clave = NOMBRE[String(id || "")];
  return clave ? t(clave) : (respaldo || String(id || "—"));
}

/** Qué puede hacer ese rol. Mismo trato que el nombre. */
export function descripcionDeRol(id: string | null | undefined, respaldo?: string | null): string {
  const clave = DESCRIPCION[String(id || "")];
  return clave ? t(clave) : (respaldo || "");
}
