import { useState } from "react";

import { Marca } from "@/components/cristal";
import type { MarcaParaPintar } from "@/services/resellerService";
import { useTema } from "@/tema/tema";
import "./MarcaDelPanel.scss";

/**
 * La marca de arriba del raíl: la del SOCIO en cuanto la ha publicado.
 *
 * ── POR QUÉ (2026-09-29) ──────────────────────────────────────────────────
 * El socio configura su marca para sus clientes, pero su propio panel seguía
 * diciendo «C-GUARD PRO PARTNERS». Su equipo trabaja aquí a diario: que el
 * panel sea SUYO es lo que vende la marca blanca, también puertas adentro.
 *
 * Por orden: su logotipo completo → su emblema con su nombre → su nombre solo
 * → y sólo si no ha publicado NADA, el emblema del producto (primer día, antes
 * del asistente). Se elige la versión del logotipo que va con el tema del
 * panel (oscuro o claro); la otra es el respaldo.
 */
export function MarcaDelPanel({ marca }: { marca: MarcaParaPintar | null | undefined }) {
  const [rota, setRota] = useState<string | null>(null);
  const nombre = marca?.platformName?.trim() || null;
  /* En oscuro, la versión para fondo oscuro primero; en claro, al revés. */
  const [tema] = useTema();
  const a = marca?.assets;
  const completo = (tema === "claro" ? a?.fullLight || a?.fullDark : a?.fullDark || a?.fullLight) || null;
  const emblema = (tema === "claro" ? a?.markLight || a?.markDark : a?.markDark || a?.markLight) || null;

  // Una imagen que no carga no deja un hueco: se cae al siguiente escalón.
  if (completo && rota !== completo) {
    return (
      <div className="marca-panel">
        <img
          className="marca-panel__logo"
          src={completo}
          alt={nombre || ""}
          onError={() => setRota(completo)}
        />
      </div>
    );
  }

  if (!nombre) return <Marca />;

  return (
    <div className="marca-panel">
      {emblema && rota !== emblema ? (
        <img className="marca-panel__emblema" src={emblema} alt="" onError={() => setRota(emblema)} />
      ) : (
        <span className="marca-panel__inicial" aria-hidden="true">{nombre.slice(0, 1).toUpperCase()}</span>
      )}
      <span className="marca-panel__nombre">{nombre}</span>
    </div>
  );
}

export default MarcaDelPanel;
