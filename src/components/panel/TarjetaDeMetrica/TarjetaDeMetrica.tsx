import { Link } from "react-router-dom";

import { Icono, type NombreDeIcono } from "@/components/cristal";
import "./TarjetaDeMetrica.scss";

/**
 * Una cifra del tablero: baldosa de icono, rótulo, número grande y una nota.
 *
 * ── LLEVA A ALGÚN SITIO, Y POR ESO ES UN ENLACE ───────────────────────────
 * Es un `<Link>` de verdad y no un `div` con `onClick`: así se abre en otra
 * pestaña con el botón central, se copia la dirección, y el teclado la
 * encuentra sin que haya que añadirle `tabIndex` a mano.
 *
 * `valor` acepta texto además de número a propósito. Cuando una cifra no está
 * calculada, la pantalla lo DICE —«todavía sin calcular»— en vez de enseñar un
 * cero: un cero se lee como una medición, y aquí la medición es dinero.
 */
export function TarjetaDeMetrica({
  icono, etiqueta, valor, nota, a,
}: {
  icono: NombreDeIcono;
  etiqueta: string;
  valor: string | number;
  nota?: string;
  a: string;
}) {
  return (
    <Link to={a} className="metrica">
      <span className="metrica__icono"><Icono nombre={icono} tamano={22} /></span>
      <span className="metrica__cabecera">
        <span className="metrica__etiqueta">{etiqueta}</span>
        <span className="metrica__galon"><Icono nombre="galon" tamano={16} /></span>
      </span>
      <span className="metrica__valor">{valor}</span>
      {nota && <span className="metrica__nota">{nota}</span>}
    </Link>
  );
}

export default TarjetaDeMetrica;
