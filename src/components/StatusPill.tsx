import { Pildora, type Tono } from "@/components/ui/kit";

/**
 * El estado comercial del socio, traducido.
 *
 * El VALOR sigue siendo el del servidor (`past_due`, `terminated_pending_resolution`).
 * Esto es sólo lo que lee una persona. La regla de siempre: la etiqueta no
 * autoriza nada — eso lo decide el backend con el identificador.
 */

const ETIQUETA: Record<string, string> = {
  pending: "Pendiente de activación",
  onboarding: "En alta",
  active: "Activa",
  past_due: "Pago pendiente",
  restricted: "Restringida",
  suspended: "Suspendida",
  terminated_pending_resolution: "En cierre",
  terminated: "Cerrada",
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
  return ETIQUETA[String(status || "")] || "Estado desconocido";
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  const clave = String(status || "");
  return <Pildora tono={TONO[clave] || "neutro"}>{etiquetaDeEstado(clave)}</Pildora>;
}

export default StatusPill;
