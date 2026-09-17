import { Pildora, type Tono } from "@/components/cristal";
import { t, type Clave } from "@/i18n/idioma";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * El estado comercial del socio, dicho para una persona.
 *
 * El VALOR sigue siendo el del servidor (`past_due`, `terminated_pending_resolution`).
 * Esto es sólo lo que se lee. La regla de siempre: la etiqueta no autoriza
 * nada — eso lo decide el backend con el identificador.
 */

const CLAVE: Record<string, Clave> = {
  pending: "estadoSocio.pending",
  onboarding: "estadoSocio.onboarding",
  active: "estadoSocio.active",
  past_due: "estadoSocio.past_due",
  restricted: "estadoSocio.restricted",
  suspended: "estadoSocio.suspended",
  terminated_pending_resolution: "estadoSocio.terminated_pending_resolution",
  terminated: "estadoSocio.terminated",
};

const TONO: Record<string, Tono> = {
  pending: "neutro",
  onboarding: "neutro",
  active: "ok",
  past_due: "aviso",
  restricted: "aviso",
  suspended: "peligro",
  terminated_pending_resolution: "peligro",
  terminated: "peligro",
};

export function etiquetaDeEstado(status: string | null | undefined): string {
  const clave = CLAVE[String(status || "")];
  return clave ? t(clave) : t("estadoSocio.desconocido");
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  /* Se suscribe al idioma aunque no use `t` directamente: sin esto, la píldora
     se quedaría con el texto del idioma anterior si su padre no se repinta. */
  useT();
  const clave = String(status || "");
  return <Pildora tono={TONO[clave] || "neutro"}>{etiquetaDeEstado(clave)}</Pildora>;
}

export default StatusPill;
