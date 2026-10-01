import { useCallback, useEffect, useState } from "react";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { alVolverLaConexion, escuchar } from "@/lib/tiempoReal";
import { borrarSesionDeSoporte, leerSesionDeSoporte } from "@/lib/sesionDeSoporte";
import { get, post } from "@/services/api";
import { useT } from "@/i18n/IdiomaProvider";
import "./SoporteEnVivo.scss";

interface Soporte {
  quien: "plataforma" | "socio";
  nombreDelSoporte: string;
  ticketId: string | null;
  ticketAsunto: string | null;
  desde: string;
  venceSesion: string;
}

const RUTA = "/reseller/soporte-en-vivo";
const CADA_MINUTO = 60_000;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOPORTE EN VIVO — el marco y el aviso
 *
 * Dos caras de lo mismo:
 *
 * · Si quien está delante ES el soporte de la plataforma (entró con un pase
 *   desde el SuperAdmin): marco ámbar alrededor de toda la ventana y una barra
 *   con en nombre de quién actúa, el ticket, los minutos que le quedan y la
 *   salida. Manda un latido cada minuto para que el aviso de los demás no se
 *   quede encendido si cierra la pestaña.
 *
 * · Si es GENTE DEL SOCIO: el mismo marco y un aviso arriba, «el soporte de
 *   CGuardPro está conectado en vivo en tu panel», con el ticket que atiende.
 *   Llega al instante por el tiempo real; mientras está a la vista se vuelve a
 *   preguntar cada minuto, porque si el soporte se va sin pulsar «Salir» el
 *   aviso caduca solo y eso no trae evento.
 *
 * El marco no tapa ni empuja nada: es un borde sin eventos de ratón.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SoporteEnVivo() {
  const t = useT();
  const { salir: cerrarSesion } = useResellerAuth();
  const [sesion] = useState(leerSesionDeSoporte);
  const [soporte, setSoporte] = useState<Soporte | null>(null);
  const [soyElSoporte, setSoyElSoporte] = useState(false);
  const [ahora, setAhora] = useState(Date.now());

  const esSoporte = !!sesion || soyElSoporte;

  const consultar = useCallback(async () => {
    try {
      const r = await get<{ soporte: Soporte | null; soyElSoporte: boolean }>(RUTA);
      setSoporte(r?.soporte ?? null);
      setSoyElSoporte(!!r?.soyElSoporte);
    } catch {
      /* sin respuesta no se enseña nada: mejor que un aviso falso */
    }
  }, []);

  // Al entrar, y cada vez que el servidor avisa o vuelve la conexión.
  useEffect(() => {
    void consultar();
    const quitar = [
      escuchar("soporte:en-vivo", (p: Soporte) => setSoporte(p || null)),
      escuchar("soporte:fin", () => setSoporte(null)),
      alVolverLaConexion(() => { void consultar(); }),
    ];
    return () => quitar.forEach((f) => f());
  }, [consultar]);

  // Mientras hay aviso a la vista, se vuelve a preguntar: caduca sin evento.
  useEffect(() => {
    if (!soporte || esSoporte) return;
    const id = window.setInterval(() => { void consultar(); }, CADA_MINUTO);
    return () => window.clearInterval(id);
  }, [soporte, esSoporte, consultar]);

  const salir = useCallback(async () => {
    try { await post(`${RUTA}/fin`); } catch { /* se sale igual */ }
    borrarSesionDeSoporte();
    cerrarSesion();
    window.close();
    window.setTimeout(() => window.location.replace("/login"), 150);
  }, [cerrarSesion]);

  // El soporte: latido cada minuto y reloj de la sesión.
  useEffect(() => {
    if (!esSoporte) return;
    const latido = window.setInterval(() => { post(`${RUTA}/latido`).catch(() => undefined); }, CADA_MINUTO);
    const reloj = window.setInterval(() => setAhora(Date.now()), 15_000);
    return () => { window.clearInterval(latido); window.clearInterval(reloj); };
  }, [esSoporte]);

  const vence = new Date(sesion?.expiresAt || soporte?.venceSesion || 0).getTime();
  useEffect(() => {
    if (esSoporte && vence && ahora >= vence) void salir();
  }, [esSoporte, vence, ahora, salir]);

  if (esSoporte) {
    const minutos = Math.max(0, Math.ceil((vence - ahora) / 60000));
    const ticket = sesion?.ticketAsunto || soporte?.ticketAsunto || null;
    return (
      <>
        <div className="soporte-marco" aria-hidden="true" />
        <div className="soporte-barra" role="status" aria-live="polite">
          <span className="soporte-barra__texto">
            {t("soporteVivo.barra", { socio: sesion?.resellerName || "" })}
            {ticket ? <span className="soporte-barra__ticket">{t("soporteVivo.ticket", { ticket })}</span> : null}
          </span>
          {vence ? <span className="soporte-barra__minutos">{t("soporteVivo.minutos", { n: minutos })}</span> : null}
          <button type="button" className="soporte-barra__salir" onClick={() => { void salir(); }}>
            {t("soporteVivo.salir")}
          </button>
        </div>
      </>
    );
  }

  if (!soporte) return null;

  return (
    <>
      <div className="soporte-marco" aria-hidden="true" />
      <div className="soporte-aviso" role="status" aria-live="polite">
        <span className="soporte-aviso__punto" aria-hidden="true" />
        <span>
          {t("soporteVivo.aviso", { nombre: soporte.nombreDelSoporte || "CGuardPro" })}
          {soporte.ticketAsunto ? ` · ${t("soporteVivo.avisoTicket", { ticket: soporte.ticketAsunto })}` : null}
        </span>
      </div>
    </>
  );
}

export default SoporteEnVivo;
