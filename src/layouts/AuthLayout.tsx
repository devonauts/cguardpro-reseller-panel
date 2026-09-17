import { ReactNode, useEffect } from "react";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import { useIdioma } from "@/i18n/IdiomaProvider";
import "./AuthLayout.scss";

/**
 * El marco de la pantalla de entrada: negro mate y un degradado contenido.
 *
 * SIN MARCA. Ni logotipo ni nombre de plataforma: la marca del socio llega en
 * una fase posterior y se resolverá por el anfitrión. Poner aquí «CGuard Pro»
 * sería justo lo contrario de lo que este producto vende.
 *
 * El control de idioma sí va aquí, y va ARRIBA DEL TODO: quien abre esto por
 * primera vez lo ve en inglés, y tiene que poder cambiarlo sin entrar.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { idioma, t } = useIdioma();

  /* El título de la pestaña también es texto que se lee.
     Aquí NUNCA hay marca de socio —o todavía no se sabe de quién es el panel, o
     ya se ha cerrado la sesión y se ha limpiado—, así que ponerlo desde aquí no
     puede pisar la marca de nadie. Sin esto, cambiar a castellano dejaba la
     pestaña en inglés: el único trozo de pantalla en el idioma que no era. */
  useEffect(() => {
    document.title = t("armazon.tituloNeutro");
  }, [idioma, t]);

  return (
    <main className="auth">
      {/* Una sola columna: si el idioma y la caja son dos celdas sueltas de la
          rejilla, cada una se centra en SU mitad y el selector acaba flotando
          en lo alto de la pantalla, lejos de lo que modifica. */}
      <div className="auth__columna">
        <div className="auth__idioma">
          <SelectorDeIdioma compacto />
        </div>
        <div className="auth__caja">{children}</div>
      </div>
    </main>
  );
}

export default AuthLayout;
