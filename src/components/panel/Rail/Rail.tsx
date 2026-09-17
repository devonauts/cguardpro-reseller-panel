import { NavLink } from "react-router-dom";

import { Icono, Marca } from "@/components/cristal";
import { PRINCIPALES, SECUNDARIAS, type Seccion } from "@/navegacion/secciones";
import { useT } from "@/i18n/IdiomaProvider";
import "./Rail.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL RAÍL DE NAVEGACIÓN
 *
 * Una lámina de cristal FLOTANTE: separada de los bordes, con radio propio y
 * sombra. No va pegada al canto de la ventana — apoyada contra el borde parece
 * un panel de administración; separada parece una pieza puesta encima.
 *
 * ── ICONO Y RÓTULO, SIEMPRE LOS DOS ───────────────────────────────────────
 * Sin rótulo, un icono es una adivinanza: «paleta» puede ser marca, temas o
 * ajustes. Y sin icono, once líneas de texto se leen como una lista de la
 * compra. Juntos, el icono da con el sitio de un vistazo y el rótulo lo
 * confirma.
 *
 * ── LO QUE NO ESTÁ ────────────────────────────────────────────────────────
 * No hay «Informes»: no existe esa pantalla ni los datos detrás. Un enlace a
 * una ruta vacía es peor que no tenerlo — quien lo pulsa cree que algo se ha
 * roto. Aparecerá cuando haya algo que enseñar.
 * ════════════════════════════════════════════════════════════════════════════
 */

/* La lista NO vive aquí. El móvil enseña las mismas secciones con otra forma,
   y dos listas que empiezan iguales dejan de serlo a la primera sección nueva.
   Está en `@/navegacion/secciones`, que es de donde beben los dos armazones.

   Lo que SÍ decide el raíl es la FORMA: dos grupos separados por una línea.
   Once entradas seguidas se leen como una lista de la compra y obligan a
   repasarlas enteras cada vez; partidas en seis y cinco, la mirada va directa
   al grupo que toca. */

function Enlace({ entrada }: { entrada: Seccion }) {
  const t = useT();
  return (
    <li>
      <NavLink
        to={entrada.a}
        className={({ isActive }) => `rail__enlace${isActive ? " rail__enlace--activo" : ""}`}
      >
        <Icono nombre={entrada.icono} tamano={19} />
        <span>{t(entrada.texto)}</span>
      </NavLink>
    </li>
  );
}

export function Rail({
  abierto, nombreDelSocio, codigo,
}: {
  abierto: boolean;
  nombreDelSocio: string;
  codigo?: string | null;
}) {
  const t = useT();

  return (
    <aside
      id="nav-lateral"
      className={`rail${abierto ? " rail--abierto" : ""}`}
      aria-label={t("armazon.secciones")}
    >
      <div className="rail__marca"><Marca /></div>

      <nav className="rail__nav">
        <ul>
          {PRINCIPALES.map((e) => <Enlace key={e.a} entrada={e} />)}
        </ul>
        <ul className="rail__nav--secundaria">
          {SECUNDARIAS.map((e) => <Enlace key={e.a} entrada={e} />)}
        </ul>
      </nav>

      {/* Quién es el socio. Va al pie y no arriba: arriba está la marca del
          PRODUCTO, y mezclarlas confunde de quién es el panel. */}
      <div className="rail__socio">
        <span className="rail__socio-icono"><Icono nombre="corona" tamano={18} /></span>
        <span className="rail__socio-texto">
          <span className="rail__socio-rotulo">{t("rail.socio")}</span>
          <span className="rail__socio-nombre">{nombreDelSocio}</span>
          {codigo && <span className="rail__socio-codigo">{codigo}</span>}
        </span>
      </div>

      <div className="rail__pie">
        <span className="rail__pie-nombre">C-GUARD PRO</span>
        <span className="rail__pie-lema">{t("rail.pieLema")}</span>
      </div>
    </aside>
  );
}

export default Rail;
