import { NavLink, useLocation } from "react-router-dom";

import { Icono } from "@/components/cristal";
import { PESTANAS_MOVIL, RESTO_MOVIL } from "@/navegacion/secciones";
import { toqueLeve } from "@/plataforma";
import { useT } from "@/i18n/IdiomaProvider";
import "./BarraDePestanas.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA BARRA DE PESTAÑAS — NUESTRA, NO DE IONIC
 *
 * `IonTabs` exige `IonRouterOutlet`, y `IonRouterOutlet` viene de
 * `@ionic/react-router`, que pide react-router 5. El panel va por la 6. Forzar
 * ese encaje significaba bajar el enrutador de toda la aplicación una versión
 * mayor para ganar una fila de botones.
 *
 * Así que la fila la ponemos nosotros. Son cuatro `NavLink` y un botón: el
 * enrutador que ya hay basta, y de regalo la barra se ve como el resto del
 * panel —cristal ahumado, mismos iconos, mismo acento— en vez de como una app
 * de Ionic con nuestros colores encima.
 *
 * Lo que sí se le coge a Ionic es el COMPORTAMIENTO del contenedor: el
 * desplazamiento con inercia y el hueco de las zonas seguras.
 *
 * ── DEBAJO DEL DEDO, NO DEBAJO DEL CRISTAL ────────────────────────────────
 * La barra reserva su propio alto MÁS el indicador de inicio del teléfono. Sin
 * eso, en un iPhone la última fila de cualquier lista queda tapada por la raya
 * blanca y no hay forma de llegar a ella.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function BarraDePestanas({
  onMas, masAbierto,
}: {
  onMas: () => void;
  masAbierto: boolean;
}) {
  const t = useT();
  const location = useLocation();

  /* «Más» se enciende cuando la pantalla en la que estás vive detrás de él.
     Sin esto, alguien en Facturación no ve ninguna pestaña encendida y pierde
     la referencia de dónde está. */
  const enElResto = RESTO_MOVIL.some((s) => location.pathname.startsWith(s.a));

  return (
    <nav className="pestanas" aria-label={t("armazon.secciones")}>
      {PESTANAS_MOVIL.map((s) => (
        <NavLink
          key={s.a}
          to={s.a}
          className={({ isActive }) =>
            `pestanas__boton${isActive ? " pestanas__boton--activo" : ""}`}
          onClick={() => toqueLeve()}
        >
          <span className="pestanas__icono"><Icono nombre={s.icono} tamano={22} /></span>
          <span className="pestanas__texto">{t(s.cortoMovil ?? s.texto)}</span>
        </NavLink>
      ))}

      <button
        type="button"
        className={`pestanas__boton${masAbierto || enElResto ? " pestanas__boton--activo" : ""}`}
        onClick={() => { toqueLeve(); onMas(); }}
        aria-expanded={masAbierto}
        aria-haspopup="menu"
      >
        <span className="pestanas__icono"><Icono nombre="puntos" tamano={22} /></span>
        <span className="pestanas__texto">{t("nav.mas")}</span>
      </button>
    </nav>
  );
}

export default BarraDePestanas;
