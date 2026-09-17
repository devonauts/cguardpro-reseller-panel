import { lazy, ReactNode, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import StatusPill from "@/components/StatusPill";
import { FondoEspacial } from "@/components/cristal";
import { BarraSuperior, Rail } from "@/components/panel";
import { nombreDeRol } from "@/lib/rolDeSocio";
import { esNativo } from "@/plataforma";
import { useT } from "@/i18n/IdiomaProvider";
import "./AppLayout.scss";

/**
 * El armazón de la app instalada se carga SOLO. Es el único módulo que toca
 * Ionic, y Ionic pesa 809 kB — medidos: el paquete de entrada pasaba de 221 kB
 * a 1.030 kB con sólo importarlo. Detrás de `lazy()` vive en su propio trozo,
 * que un navegador no pide nunca porque `esNativo` es falso y esta rama no se
 * llega a pintar. `checkBundle` lo comprueba después de cada construcción.
 */
const ArmazonNativo = lazy(() => import("@/nativo"));

/**
 * El armazón del panel: raíl flotante, barra de controles y contenido, todo
 * sobre el mismo lienzo negro que la pantalla de entrada.
 *
 * Aquí sólo vive la COMPOSICIÓN y el estado del menú móvil. El raíl y la barra
 * son piezas con su propio SCSS; este fichero no dibuja nada.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  /* Instalada o en un navegador: son dos armazones distintos para el MISMO
     panel. Lo de dentro —las páginas, los datos, los permisos— es el mismo
     código; lo que cambia es la forma que lo envuelve.

     La decisión se toma UNA vez, aquí. Repartir `esNativo` por las páginas es
     como acabó la app del vigilante, con 49 comprobaciones sueltas y ningún
     sitio donde entender qué se ve en cada plataforma. */
  if (esNativo) {
    return (
      <Suspense fallback={<div className="marco"><FondoEspacial /></div>}>
        <ArmazonNativo>{children}</ArmazonNativo>
      </Suspense>
    );
  }
  return <ArmazonWeb>{children}</ArmazonWeb>;
}

function ArmazonWeb({ children }: { children: ReactNode }) {
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
