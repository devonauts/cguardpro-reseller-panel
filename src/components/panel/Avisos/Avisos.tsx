import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Emergente, Icono } from "@/components/cristal";
import { fechaYHora } from "@/lib/dinero";
import { nombreDeAccion } from "@/pages/Actividad";
import { useT } from "@/i18n/IdiomaProvider";
import { portalService, type LineaDeActividad } from "@/services/resellerService";
import "./Avisos.scss";

/**
 * La campana.
 *
 * ── NO INVENTA AVISOS: ENSEÑA LA ACTIVIDAD QUE YA SE AUDITA ───────────────
 * El socio no tiene un sistema de notificaciones, y una campana que nunca
 * tiene nada dentro sólo ocupa sitio. Pero SÍ existe un registro de lo que
 * pasa en su cuenta —marca publicada, empresa dada de alta, decisiones de
 * CGuardPro—, y eso es exactamente lo que alguien espera encontrar al pulsarla.
 *
 * El punto rojo compara la entrada más reciente con la última que se vio, que
 * se guarda EN ESTE NAVEGADOR. No es estado de servidor y no pretende serlo:
 * marcar «leído» de verdad necesitaría una tabla, y ésa es otra conversación.
 */

const VISTO = "cguard_reseller_avisos_visto";

export function Avisos() {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<LineaDeActividad[]>([]);
  const [hayNuevo, setHayNuevo] = useState(false);

  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await portalService.actividad(0, 5);
      const lista = r.rows ?? [];
      setFilas(lista);
      setFallo(false);
      try {
        const visto = localStorage.getItem(VISTO);
        setHayNuevo(!!lista[0]?.at && lista[0].at !== visto);
      } catch {
        /* almacenamiento bloqueado: se prefiere NO marcar nada que marcarlo
           todo como nuevo en cada carga */
      }
    } catch {
      // A failed load is not "no activity": say so inside the menu.
      setFallo(true);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const alternar = () => {
    // Loaded once per mount it went stale all session: refresh on open.
    if (!abierto) void cargar();
    setAbierto((v) => {
      if (!v && filas[0]?.at) {
        try { localStorage.setItem(VISTO, filas[0].at); } catch { /* da igual */ }
        setHayNuevo(false);
      }
      return !v;
    });
  };

  return (
    <div className="avisos">
      <button
        type="button"
        className="avisos__boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={t("avisos.abrir")}
        onClick={alternar}
      >
        <Icono nombre="bocadillo" tamano={18} />
        {hayNuevo && <span className="avisos__punto" aria-hidden="true" />}
      </button>

      <Emergente abierto={abierto} onCerrar={() => setAbierto(false)} etiqueta={t("avisos.abrir")}>
        <p className="avisos__titulo">{t("avisos.abrir")}</p>
        {fallo && filas.length === 0 ? (
          <p className="avisos__vacio">{t("avisos.noCargo")}</p>
        ) : filas.length === 0 ? (
          <p className="avisos__vacio">{t("avisos.vacio")}</p>
        ) : (
          <ul className="avisos__lista">
            {filas.map((f) => (
              <li key={f.id}>
                <span className="avisos__accion">{nombreDeAccion(f.action)}</span>
                <span className="avisos__cuando">{fechaYHora(f.at)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/activity" className="avisos__todo" onClick={() => setAbierto(false)}>
          {t("tablero.verTodo")}
        </Link>
      </Emergente>
    </div>
  );
}

export default Avisos;
