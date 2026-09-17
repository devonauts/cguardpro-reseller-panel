import { Icono, type NombreDeIcono } from "@/components/cristal";
import "./Ventaja.scss";

/**
 * Un punto de valor de la columna izquierda: baldosa de cristal, título y nota.
 *
 * Tres iguales seguidos. Escrito en línea en el armazón, cambiar el espaciado
 * de uno y olvidarse de los otros dos es cuestión de tiempo.
 */
export function Ventaja({
  icono, titulo, nota,
}: {
  icono: NombreDeIcono;
  titulo: string;
  nota: string;
}) {
  return (
    <li className="ventaja">
      <span className="ventaja__icono"><Icono nombre={icono} /></span>
      <span className="ventaja__texto">
        <span className="ventaja__titulo">{titulo}</span>
        <span className="ventaja__nota">{nota}</span>
      </span>
    </li>
  );
}

export default Ventaja;
