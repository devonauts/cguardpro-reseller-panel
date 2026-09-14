import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import StatusPill from "@/components/StatusPill";
import { Boton } from "@/components/ui/kit";
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
  texto: string;
  /** Sin implementar todavía: se ve, no se pulsa. */
  proximamente?: boolean;
}

const NAV: Entrada[] = [
  { a: "/dashboard", texto: "Resumen" },
  { a: "/branding", texto: "Tu marca" },
  { a: "/companies", texto: "Empresas" },
  { a: "/usage", texto: "Consumo" },
  { a: "/billing", texto: "Facturación", proximamente: true },
  { a: "/team", texto: "Equipo", proximamente: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { me, salir } = useResellerAuth();
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

  const nombre = me?.reseller.displayName || me?.reseller.legalName || "Panel de socio";
  const persona = me?.user.fullName
    || [me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ")
    || me?.user.email
    || "Mi cuenta";

  return (
    <div className="marco">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <aside
        id="nav-lateral"
        className={`lateral${menuAbierto ? " lateral--abierto" : ""}`}
        aria-label="Secciones del panel"
      >
        <div className="lateral__marca">
          <span className="lateral__nombre">{nombre}</span>
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
                    {e.texto}
                    <span className="nav__insignia">Próximamente</span>
                  </span>
                ) : (
                  <NavLink
                    to={e.a}
                    className={({ isActive }) =>
                      `nav__enlace${isActive ? " nav__enlace--activo" : ""}`}
                  >
                    {e.texto}
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
            aria-label={menuAbierto ? "Cerrar el menú" : "Abrir el menú"}
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
                <Boton variante="fantasma" bloque role="menuitem" onClick={salir}>
                  Cerrar sesión
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
