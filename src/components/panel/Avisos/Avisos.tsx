import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Emergente, Icono } from "@/components/cristal";
import { useIdioma } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { alVolverLaConexion, escuchar } from "@/lib/tiempoReal";
import { notificacionesService, type Notificacion } from "@/services/resellerService";
import "./Avisos.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA CAMPANA — el centro de avisos del panel.
 *
 * Antes enseñaba sólo el registro de actividad y guardaba «visto» en el
 * navegador: cuando el superadmin pasaba un ticket a «En curso» o lo resolvía,
 * aquí no aparecía nada (queja del dueño, 2026-09-28).
 *
 * Ahora es de verdad:
 *   · los avisos viven en el servidor, por persona, con su leído/no leído;
 *   · llegan EN VIVO por el websocket (`reseller:aviso`): el contador sube y la
 *     campana se mueve sin recargar nada;
 *   · pulsar uno lo marca leído y lleva a su pantalla (el ticket en Soporte);
 *   · «Marcar todo como leído» y, abajo, la actividad de la cuenta.
 *
 * Además se reparte un evento del navegador (`socio:aviso`) para que la
 * pantalla abierta —Soporte— se refresque sola.
 * ════════════════════════════════════════════════════════════════════════════
 */

export const EVENTO_AVISO = "socio:aviso";

const TITULO: Record<string, Clave> = {
  "ticket.respuesta": "notificaciones.ticketRespuesta",
  "ticket.en_curso": "notificaciones.ticketEnCurso",
  "ticket.resuelto": "notificaciones.ticketResuelto",
  "ticket.reabierto": "notificaciones.ticketReabierto",
  "cobro.pasarela": "notificaciones.pasarelaRota",
};

/** «hace 5 min», «ayer»… en el idioma del panel. */
function haceCuanto(iso: string, idioma: string): string {
  const seg = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: "auto" });
  const abs = Math.abs(seg);
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(seg / 86400), "day");
  return new Date(iso).toLocaleDateString(idioma, { day: "numeric", month: "short" });
}

export function Avisos() {
  const { t, idioma } = useIdioma();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<Notificacion[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [fallo, setFallo] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [timbre, setTimbre] = useState(false);
  const temporizador = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await notificacionesService.lista(30);
      setFilas(r.rows ?? []);
      setNoLeidos(r.noLeidos ?? 0);
      setFallo(false);
    } catch {
      setFallo(true);
    } finally {
      setCargado(true);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // En vivo: el aviso entra arriba, sube el contador y la campana se mueve.
  useEffect(() => {
    const quitar = escuchar("reseller:aviso", (a: Notificacion) => {
      if (!a || !a.id) return;
      setFilas((l) => [a, ...l.filter((x) => x.id !== a.id)].slice(0, 30));
      if (!a.leido) setNoLeidos((n) => n + 1);
      setTimbre(true);
      if (temporizador.current) window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setTimbre(false), 1200);
      window.dispatchEvent(new CustomEvent(EVENTO_AVISO, { detail: a }));
    });
    const alVolver = alVolverLaConexion(() => { void cargar(); });
    return () => {
      quitar();
      alVolver();
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, [cargar]);

  const alternar = () => {
    if (!abierto) void cargar();
    setAbierto((v) => !v);
  };

  const abrir = async (a: Notificacion) => {
    setAbierto(false);
    if (!a.leido) {
      setFilas((l) => l.map((x) => (x.id === a.id ? { ...x, leido: true } : x)));
      setNoLeidos((n) => Math.max(0, n - 1));
      notificacionesService.marcarLeidas([a.id]).catch(() => { /* se reintenta al abrir */ });
    }
    if (a.enlace) navigate(a.enlace);
  };

  const marcarTodo = async () => {
    setFilas((l) => l.map((x) => ({ ...x, leido: true })));
    setNoLeidos(0);
    try { await notificacionesService.marcarLeidas(); } catch { void cargar(); }
  };

  const contador = noLeidos > 9 ? "9+" : String(noLeidos);

  return (
    <div className="avisos">
      <button
        type="button"
        className={`avisos__boton${timbre ? " avisos__boton--timbre" : ""}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={noLeidos > 0
          ? t("notificaciones.abrirConPendientes", { n: noLeidos })
          : t("notificaciones.titulo")}
        onClick={alternar}
      >
        <Icono nombre="campana" tamano={18} />
        {noLeidos > 0 && <span className="avisos__contador" aria-hidden="true">{contador}</span>}
      </button>

      <Emergente abierto={abierto} onCerrar={() => setAbierto(false)} etiqueta={t("notificaciones.titulo")}>
        <div className="avisos__cabecera">
          <p className="avisos__titulo">{t("notificaciones.titulo")}</p>
          {noLeidos > 0 && (
            <button type="button" className="avisos__marcar" onClick={marcarTodo}>
              {t("notificaciones.marcarTodo")}
            </button>
          )}
        </div>

        {!cargado ? (
          <ul className="avisos__lista" aria-hidden="true">
            {[0, 1, 2].map((i) => <li key={i} className="avisos__esqueleto" />)}
          </ul>
        ) : fallo && filas.length === 0 ? (
          <p className="avisos__vacio">{t("notificaciones.noCargo")}</p>
        ) : filas.length === 0 ? (
          <div className="avisos__vacio">
            <Icono nombre="campana" tamano={22} />
            <span>{t("notificaciones.vacio")}</span>
          </div>
        ) : (
          <ul className="avisos__lista" role="menu">
            {filas.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={`avisos__item${a.leido ? "" : " avisos__item--nuevo"}`}
                  onClick={() => abrir(a)}
                >
                  <span className="avisos__marca" aria-hidden="true" />
                  <span className="avisos__cuerpo">
                    <span className="avisos__accion">
                      {TITULO[a.tipo] ? t(TITULO[a.tipo]) : t("notificaciones.generico")}
                    </span>
                    {a.datos?.asunto && <span className="avisos__detalle">{a.datos.asunto}</span>}
                    {a.datos?.respuesta && <span className="avisos__respuesta">{a.datos.respuesta}</span>}
                    <span className="avisos__cuando">{haceCuanto(a.createdAt, idioma)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link to="/activity" className="avisos__todo" onClick={() => setAbierto(false)}>
          {t("notificaciones.verActividad")}
        </Link>
      </Emergente>
    </div>
  );
}

export default Avisos;
