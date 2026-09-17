import { Link } from "react-router-dom";

import { Icono, type NombreDeIcono } from "@/components/cristal";
import "./BaldosaDeAccion.scss";

/**
 * Una baldosa de acción: icono arriba, rótulo debajo.
 *
 * La misma pieza sirve para «Acciones rápidas» y para «¿Necesitas ayuda?» —
 * lo único que cambia es a dónde lleva. Dos componentes idénticos con nombres
 * distintos es cómo empiezan a separarse.
 *
 * `a` para rutas internas, `href` para lo de fuera. Nunca las dos.
 */
export function BaldosaDeAccion({
  icono, etiqueta, a, href,
}: {
  icono: NombreDeIcono;
  etiqueta: string;
  a?: string;
  href?: string;
}) {
  const dentro = (
    <>
      <span className="baldosa__icono"><Icono nombre={icono} tamano={22} /></span>
      <span className="baldosa__etiqueta">{etiqueta}</span>
    </>
  );

  if (href) {
    return (
      /* `noreferrer` además de `noopener`: sin él, el destino recibe de dónde
         viene la visita, y de dónde viene es el panel de un socio. */
      <a className="baldosa" href={href} target="_blank" rel="noopener noreferrer">
        {dentro}
      </a>
    );
  }

  return <Link className="baldosa" to={a ?? "/"}>{dentro}</Link>;
}

export default BaldosaDeAccion;
