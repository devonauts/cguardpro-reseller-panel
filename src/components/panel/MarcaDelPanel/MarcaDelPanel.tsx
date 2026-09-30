import { useState } from "react";

import { Marca } from "@/components/cristal";
import type { MarcaParaPintar } from "@/services/resellerService";
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
 * del asistente). El panel es siempre oscuro, así que se prefiere la versión
 * del logotipo pensada para fondo oscuro; la clara es el respaldo.
 */
export function MarcaDelPanel({ marca }: { marca: MarcaParaPintar | null | undefined }) {
  const [rota, setRota] = useState<string | null>(null);
  const nombre = marca?.platformName?.trim() || null;
  const completo = marca?.assets?.fullDark || marca?.assets?.fullLight || null;
  const emblema = marca?.assets?.markDark || marca?.assets?.markLight || null;

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
