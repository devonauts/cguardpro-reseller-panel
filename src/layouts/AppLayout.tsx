import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import StatusPill from "@/components/StatusPill";
import { FondoEspacial } from "@/components/cristal";
import { BarraSuperior, Rail } from "@/components/panel";
import { nombreDeRol } from "@/lib/rolDeSocio";
import { useT } from "@/i18n/IdiomaProvider";
import "./AppLayout.scss";

/**
 * El armazón del panel: raíl flotante, barra de controles y contenido, todo
 * sobre el mismo lienzo negro que la pantalla de entrada.
 *
 * Aquí sólo vive la COMPOSICIÓN y el estado del menú móvil. El raíl y la barra
 * son piezas con su propio SCSS; este fichero no dibuja nada.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const { me, salir } = useResellerAuth();
  const t = useT();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  // Al navegar se cierra el menú móvil: si no, en un teléfono queda tapando la
  // pantalla a la que se acaba de llegar.
  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);

  // Escape cierra el menú — quien navega con teclado necesita una salida que no
  // dependa de acertar con el ratón fuera.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuAbierto(false); };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  /* El nombre PUBLICADO manda sobre el comercial: es el que el socio eligió
     enseñar. Si no ha publicado ninguno, su razón comercial; y de último, el
     rótulo neutro. Nunca «CGuard Pro». */
  const nombreDelSocio = me?.branding?.platformName
    || me?.reseller.displayName
    || me?.reseller.legalName
    || t("armazon.tituloNeutro");

  const persona = me?.user.fullName
    || [me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ")
    || me?.user.email
    || t("armazon.miCuenta");

  return (
    <div className="marco">
      <FondoEspacial />

      <a className="skip-link" href="#contenido">{t("armazon.saltar")}</a>

      <Rail
        abierto={menuAbierto}
        nombreDelSocio={nombreDelSocio}
        codigo={me?.reseller.publicId}
      />

      {/* La cortina del móvil. `aria-hidden`: es decoración, no un control. */}
      {menuAbierto && (
        <div className="cortina" aria-hidden="true" onClick={() => setMenuAbierto(false)} />
      )}

      <div className="columna">
        <BarraSuperior
          menuAbierto={menuAbierto}
          onAlternarMenu={() => setMenuAbierto((v) => !v)}
          persona={persona}
          rol={me?.membership?.role ? nombreDeRol(me.membership.role) : null}
          correo={me?.user.email}
          onSalir={salir}
          estado={<StatusPill status={me?.reseller.status} />}
        />

        <main id="contenido" className="contenido" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
