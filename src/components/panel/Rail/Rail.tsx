import { NavLink } from "react-router-dom";

import { Icono, Marca, type NombreDeIcono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
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

interface Entrada {
  a: string;
  icono: NombreDeIcono;
  texto: Clave;
  /**
   * El icono va en ORO en vez del gris de la navegación. Es distinción, no
   * estado: el oro aquí no avisa de nada — ver `--gold` en tokens.css.
   */
  dorado?: boolean;
}

/**
 * Lo que se usa a diario, arriba. Lo que se consulta de tanto en tanto
 * —contrato, plan, actividad— baja a un segundo grupo separado por una línea.
 *
 * Once entradas seguidas se leen como una lista de la compra y obligan a
 * repasarlas enteras cada vez. Partidas en seis y cuatro, la mirada va directa
 * al grupo que toca.
 */
const NAV: Entrada[] = [
  { a: "/dashboard", icono: "casa", texto: "nav.tablero" },
  { a: "/companies", icono: "edificio", texto: "nav.empresas" },
  { a: "/domains", icono: "globo", texto: "nav.dominios" },
  { a: "/branding", icono: "paleta", texto: "nav.marcaCorto" },
  { a: "/team", icono: "personas", texto: "nav.equipo" },
  { a: "/billing", icono: "tarjeta", texto: "nav.facturacion" },
];

const NAV_SECUNDARIA: Entrada[] = [
  { a: "/usage", icono: "grafico", texto: "nav.consumo" },
  { a: "/activity", icono: "libro", texto: "nav.actividad" },
  { a: "/contract", icono: "escudo", texto: "nav.contrato" },
  { a: "/entitlements", icono: "corona", texto: "nav.derechos", dorado: true },
  { a: "/account", icono: "engranaje", texto: "nav.ajustesCorto" },
];

function Enlace({ entrada }: { entrada: Entrada }) {
  const t = useT();
  return (
    <li>
      <NavLink
        to={entrada.a}
        className={({ isActive }) => `rail__enlace${isActive ? " rail__enlace--activo" : ""}`}
      >
        <Icono
          nombre={entrada.icono}
          tamano={19}
          className={entrada.dorado ? "icono--oro" : ""}
        />
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
          {NAV.map((e) => <Enlace key={e.a} entrada={e} />)}
        </ul>
        <ul className="rail__nav--secundaria">
          {NAV_SECUNDARIA.map((e) => <Enlace key={e.a} entrada={e} />)}
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
