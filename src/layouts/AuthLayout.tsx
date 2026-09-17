import { ReactNode, useEffect } from "react";

import { FondoEspacial } from "@/components/cristal";
import { PanelDeMarca, TarjetaDeAcceso } from "@/components/acceso";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import { useIdioma } from "@/i18n/IdiomaProvider";
import "./AuthLayout.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL MARCO DE LA ENTRADA
 *
 * Dos columnas sobre el espacio: la marca a la izquierda, la lámina de cristal
 * a la derecha. Aquí sólo vive la COMPOSICIÓN — quién va dónde y cómo se
 * recoloca al estrecharse. Las piezas se traen de `components/acceso`.
 *
 * ── ESTE MARCO NO SABE QUÉ HAY DENTRO ─────────────────────────────────────
 * Envuelve TODO lo que pasa sin sesión: la entrada, «comprobando tu sesión…» y
 * los avisos de capa apagada. Por eso el formulario no vive aquí — si viviera,
 * esas otras pantallas heredarían un formulario que no les toca.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { idioma, t } = useIdioma();

  /* El título de la pestaña también es texto que se lee. Aquí NUNCA hay marca
     de socio —o todavía no se sabe de quién es el panel, o ya se cerró la
     sesión y se limpió—, así que ponerlo desde aquí no pisa la marca de nadie. */
  useEffect(() => {
    document.title = t("armazon.tituloNeutro");
  }, [idioma, t]);

  return (
    <main className="entrada">
      <FondoEspacial />

      <div className="entrada__idioma">
        <SelectorDeIdioma />
      </div>

      <div className="entrada__rejilla">
        <PanelDeMarca />
        <TarjetaDeAcceso>{children}</TarjetaDeAcceso>
      </div>

      <p className="entrada__valores" aria-hidden="true">
        <span>{t("portada.personas")}</span>
        <span>{t("portada.propiedad")}</span>
        <span>{t("portada.progreso")}</span>
      </p>

      <footer className="entrada__legal">
        {t("login.derechos", { anio: new Date().getFullYear() })}
      </footer>
    </main>
  );
}

export default AuthLayout;
