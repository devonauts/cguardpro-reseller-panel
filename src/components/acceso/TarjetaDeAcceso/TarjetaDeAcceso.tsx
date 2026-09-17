import { ReactNode } from "react";

import "./TarjetaDeAcceso.scss";

/**
 * La lámina de cristal ahumado donde se entra.
 *
 * ── POR QUÉ ES SU PROPIO COMPONENTE ───────────────────────────────────────
 * Porque es la única superficie del producto con luz de estudio: un foco
 * blando en el canto superior, más intenso hacia el centro. En el resto del
 * panel esa luz sobraría —hay doce tarjetas por pantalla y doce focos son
 * ninguno—, pero aquí sólo hay una pieza y es lo primero que se ve.
 *
 * El material sale del sistema; lo propio de esta tarjeta es el foco y el
 * respiro interior.
 */
export function TarjetaDeAcceso({ children }: { children: ReactNode }) {
  return <div className="tarjeta-acceso">{children}</div>;
}

export default TarjetaDeAcceso;
