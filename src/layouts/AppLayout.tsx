import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import StatusPill from "@/components/StatusPill";
import { logoDeCabecera } from "@/branding/marcaDelSocio";
import useModoOscuro from "@/branding/useModoOscuro";
import { Boton } from "@/components/ui/kit";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./AppLayout.css";

/**
 * El armazón: barra lateral, barra superior y contenido.
 *
 * ── LO QUE NO HAY, Y ES A PROPÓSITO ───────────────────────────────────────
 * No hay logotipo del socio, ni color de marca resuelto por anfitrión, ni
 * nombre de plataforma: eso es la fase de marca. Lo que se enseña hoy es el
 * nombre comercial que ya está en la ficha del socio, que es un dato suyo y no
 * una personalización.
 *
 * Las secciones que aún no existen aparecen DESACTIVADAS y dicen que llegan más
 * adelante. Enseñar un enlace que lleva a una pantalla vacía es peor que no
 * enseñarlo: quien lo pulsa cree que algo se ha roto.
 */

interface Entrada {
  a: string;
  /** La CLAVE del rótulo, no el rótulo: el menú también cambia de idioma. */
  texto: Clave;
  /** Sin implementar todavía: se ve, no se pulsa. */
  proximamente?: boolean;
}

const NAV: Entrada[] = [
  { a: "/dashboard", texto: "nav.resumen" },
  { a: "/branding", texto: "nav.marca" },
  { a: "/companies", texto: "nav.empresas" },
  { a: "/usage", texto: "nav.consumo" },
  { a: "/billing", texto: "nav.facturacion" },
  /* El bloque de «tu acuerdo con CGuardPro»: qué se pactó, qué incluye y qué
     ha pasado. Va después de lo operativo-comercial porque se consulta de
     tanto en tanto, no a diario. */
  { a: "/contract", texto: "nav.contrato" },
  { a: "/entitlements", texto: "nav.derechos" },
  { a: "/activity", texto: "nav.actividad" },
  { a: "/domains", texto: "nav.dominios" },
  { a: "/account", texto: "nav.cuenta" },
  { a: "/team", texto: "nav.equipo" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { me, salir } = useResellerAuth();
  const t = useT();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const location = useLocation();
  const cuentaRef = useRef<HTMLDivElement>(null);

  // Al navegar se cierra el menú móvil: si no, en un teléfono queda tapando la
  // pantalla a la que se acaba de llegar.
  useEffect(() => {
    setMenuAbierto(false);
    setCuentaAbierta(false);
  }, [location.pathname]);

  // Escape cierra lo que esté abierto — quien navega con teclado necesita una
  // salida que no dependa de acertar con el ratón fuera del menú.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuAbierto(false); setCuentaAbierta(false); }
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  /* El nombre PUBLICADO manda sobre el comercial: es el que el socio eligió
     enseñar. Si no ha publicado ninguno, su razón comercial; y de último, el
     rótulo neutro. Nunca «CGuard Pro». */
  const nombre = me?.branding?.platformName
    || me?.reseller.displayName
    || me?.reseller.legalName
    || t("armazon.tituloNeutro");

  /* Qué logotipo toca lo decidió el servidor; aquí sólo se elige claro u
     oscuro según el modo del sistema. `null` = no hay imagen, y entonces se
     enseña el nombre en texto: jamás el logotipo de la plataforma. */
  const logo = logoDeCabecera(me?.branding, useModoOscuro());
  const persona = me?.user.fullName
    || [me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ")
    || me?.user.email
    || t("armazon.miCuenta");

  return (
    <div className="marco">
      <a className="skip-link" href="#contenido">{t("armazon.saltar")}</a>

      <aside
        id="nav-lateral"
        className={`lateral${menuAbierto ? " lateral--abierto" : ""}`}
        aria-label={t("armazon.secciones")}
      >
        <div className="lateral__marca">
          {logo
            ? <img className="lateral__logo" src={logo} alt={nombre} />
            : <span className="lateral__nombre">{nombre}</span>}
          {me?.reseller.publicId && (
            <span className="lateral__codigo">{me.reseller.publicId}</span>
          )}
        </div>

        <nav className="lateral__nav">
          <ul>
            {NAV.map((e) => (
              <li key={e.a}>
                {e.proximamente ? (
                  /* Un `span` y no un enlace desactivado: un `<a>` sin destino
                     sigue recibiendo el foco y promete algo que no cumple. */
                  <span className="nav__enlace nav__enlace--proximamente">
                    {t(e.texto)}
                    <span className="nav__insignia">{t("armazon.proximamente")}</span>
                  </span>
                ) : (
                  <NavLink
                    to={e.a}
                    className={({ isActive }) =>
                      `nav__enlace${isActive ? " nav__enlace--activo" : ""}`}
                  >
                    {t(e.texto)}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* La cortina del móvil. `aria-hidden`: es decoración, no un control. */}
      {menuAbierto && (
        <div className="cortina" aria-hidden="true" onClick={() => setMenuAbierto(false)} />
      )}

      <div className="columna">
        <header className="superior">
          <button
            type="button"
            className="superior__hamburguesa"
            aria-expanded={menuAbierto}
            aria-controls="nav-lateral"
            aria-label={menuAbierto ? t("armazon.cerrarMenu") : t("armazon.abrirMenu")}
            onClick={() => setMenuAbierto((v) => !v)}
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div className="superior__estado">
            <StatusPill status={me?.reseller.status} />
          </div>

          <div className="superior__cuenta" ref={cuentaRef}>
            <button
              type="button"
              className="cuenta__boton"
              aria-expanded={cuentaAbierta}
              aria-haspopup="menu"
              onClick={() => setCuentaAbierta((v) => !v)}
            >
              <span className="cuenta__nombre">{persona}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {cuentaAbierta && (
              <div className="cuenta__menu" role="menu">
                <div className="cuenta__correo">{me?.user.email}</div>
                {/* El idioma se cambia SIN salir: no se toca la sesión. */}
                <div className="cuenta__idioma">
                  <SelectorDeIdioma compacto />
                </div>
                <Boton variante="fantasma" bloque role="menuitem" onClick={salir}>
                  {t("armazon.cerrarSesion")}
                </Boton>
              </div>
            )}
          </div>
        </header>

        <main id="contenido" className="contenido" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
