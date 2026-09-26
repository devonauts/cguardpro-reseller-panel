import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

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
   * Las secciones que cuelgan de ésta.
   *
   * Un grupo NO es un enlace: pulsarlo abre o cierra, no navega. Por eso su
   * `a` sirve sólo de prefijo para saber si alguno de sus hijos está activo —
   * y por eso el grupo se pinta como `<button>` y no como `<NavLink>`.
   */
  hijos?: Entrada[];
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
  { a: "/company-billing", icono: "moneda", texto: "nav.cobros" },
  { a: "/team", icono: "personas", texto: "nav.equipo" },
  { a: "/billing", icono: "tarjeta", texto: "nav.facturacion" },
];

/**
 * ── POR QUÉ MARCA Y DOMINIOS BAJAN A AJUSTES ──────────────────────────────
 * Las dos son CONFIGURACIÓN de la cuenta: se tocan al montar el negocio y
 * luego casi nunca. Arriba competían a diario con las cuatro que sí se usan
 * —tablero, empresas, equipo, facturación— y alargaban la lista principal a
 * seis entradas de peso desigual.
 *
 * El grupo conserva `/account` como destino de su propia pantalla; lo que
 * cuelga son las otras tres.
 */
const NAV_SECUNDARIA: Entrada[] = [
  { a: "/usage", icono: "grafico", texto: "nav.consumo" },
  { a: "/activity", icono: "libro", texto: "nav.actividad" },
  { a: "/contract", icono: "escudo", texto: "nav.contrato" },
  { a: "/entitlements", icono: "corona", texto: "nav.derechos", dorado: true },
  {
    a: "/account",
    icono: "engranaje",
    texto: "nav.ajustesCorto",
    hijos: [
      { a: "/account", icono: "engranaje", texto: "nav.cuenta" },
      { a: "/branding", icono: "paleta", texto: "nav.marcaCorto" },
      { a: "/assistant", icono: "bocadillo", texto: "nav.asistente" },
      { a: "/domains", icono: "globo", texto: "nav.dominios" },
      { a: "/analytics", icono: "grafico", texto: "nav.analitica" },
    ],
  },
];

function Enlace({ entrada }: { entrada: Entrada }) {
  const t = useT();
  if (entrada.hijos?.length) return <Grupo entrada={entrada} />;

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

/**
 * Una sección con lo suyo dentro.
 *
 * ── SE ABRE SOLO CUANDO ESTÁS DENTRO ──────────────────────────────────────
 * Si la ruta actual es una de las hijas, el grupo nace abierto: llegar a
 * «Marca» por un enlace y encontrarse el menú cerrado deja a la persona sin
 * saber dónde está. A partir de ahí manda lo que ella pulse — por eso el
 * estado arranca del sitio y no se recalcula en cada render.
 *
 * ── EL GRUPO NO NAVEGA ────────────────────────────────────────────────────
 * Es un `<button>` con `aria-expanded`, no un enlace. Un elemento que a veces
 * abre y a veces navega enseña a desconfiar de él; y para «Tu cuenta», que es
 * la pantalla del propio grupo, hay una entrada hija con su nombre.
 */
function Grupo({ entrada }: { entrada: Entrada }) {
  const t = useT();
  const { pathname } = useLocation();
  const hijos = entrada.hijos ?? [];
  const dentro = hijos.some((h) => pathname === h.a || pathname.startsWith(`${h.a}/`));
  const [abierto, setAbierto] = useState(dentro);

  /* Si la navegación entra en el grupo desde fuera —un enlace del tablero, una
     URL pegada— se abre. No se cierra solo al salir: cerrarle a alguien el
     menú que acaba de usar es perderle el sitio. */
  useEffect(() => { if (dentro) setAbierto(true); }, [dentro]);

  return (
    <li>
      <button
        type="button"
        className={`rail__enlace rail__grupo${dentro ? " rail__enlace--activo" : ""}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <Icono nombre={entrada.icono} tamano={19} />
        <span>{t(entrada.texto)}</span>
        <Icono
          nombre="galon"
          tamano={16}
          className={`rail__galon${abierto ? " rail__galon--abierto" : ""}`}
        />
      </button>

      {abierto && (
        <ul className="rail__submenu">
          {hijos.map((h) => (
            <li key={h.a}>
              <NavLink
                end
                to={h.a}
                className={({ isActive }) =>
                  `rail__enlace rail__subenlace${isActive ? " rail__enlace--activo" : ""}`}
              >
                <Icono
                  nombre={h.icono}
                  tamano={17}
                  className={h.dorado ? "icono--oro" : ""}
                />
                <span>{t(h.texto)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
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
        {/* Dos grupos CON NOMBRE: lo que se hace a diario con el negocio, y la
            relación con la plataforma. La línea sola los separaba, pero no
            decía qué hay en cada lado; con el título se elige el grupo antes
            de leer las entradas (ley de Hick). */}
        <p className="rail__titulo-grupo">{t("nav.grupoNegocio")}</p>
        <ul>
          {NAV.map((e) => <Enlace key={e.a} entrada={e} />)}
        </ul>
        <p className="rail__titulo-grupo rail__titulo-grupo--segundo">{t("nav.grupoCuenta")}</p>
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
