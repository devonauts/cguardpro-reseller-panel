import { CSSProperties, ReactNode } from "react";
import type { Marca } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./BrandingPreview.scss";

/**
 * La vista previa de la marca.
 *
 * ── ES LOCAL, Y ESO ES LO IMPORTANTE ──────────────────────────────────────
 * Lo que se pinta aquí sale del BORRADOR y no sale de este recuadro. No toca el
 * CRM de ninguna empresa, ni la pantalla pública de entrada, ni el panel de
 * superadmin, ni la sesión de ningún otro socio, ni lo que ya está publicado.
 * Nada de eso cambia hasta que alguien pulsa Publicar y el servidor lo copia.
 *
 * Técnicamente, eso se consigue escribiendo las fichas de color en el ESTILO
 * EN LÍNEA de este contenedor, no en `:root`. Escribirlas en la raíz teñiría el
 * panel entero mientras se mueve el deslizador — y entonces «vista previa» y
 * «aplicado» dejarían de distinguirse.
 *
 * ── EL TONO, NO EL COLOR ──────────────────────────────────────────────────
 * El socio elige un TONO y una saturación; la luminosidad la fija el sistema,
 * igual que en el resto del panel. Por eso no hay selector de color ni campo
 * hexadecimal: son la forma de acabar con un botón amarillo y letras blancas.
 */

/**
 * Las fichas de marca del borrador, acotadas a este contenedor.
 *
 * Se redefinen SÓLO `--brand-h` y `--brand-c`. Los colores compuestos
 * (`--brand`, `--brand-hover`, …) se recalculan solos, porque en `tokens.css`
 * están escritos en función de estas dos y de `--brand-l`.
 *
 * Es lo que impide que la vista previa mienta: la LUMINOSIDAD no se repite
 * aquí, así que no puede quedarse desfasada respecto al sistema de diseño. Y
 * como el socio no elige luminosidad, lo que se ve aquí es exactamente lo que
 * verán sus clientes.
 */
function fichasDeMarca(hue: number | null, chroma: number | null): CSSProperties {
  const h = hue === null || hue === undefined ? 222 : hue;
  const c = chroma === null || chroma === undefined ? 0.15 : chroma;
  return {
    "--brand-h": String(h),
    "--brand-c": String(c),
  } as CSSProperties;
}

export function BrandingPreview({
  marca,
  logoUrl,
  titulo,
  nota,
}: {
  marca: Marca;
  logoUrl?: string | null;
  titulo?: string;
  nota?: ReactNode;
}) {
  const t = useT();
  const nombre = marca.platformName?.trim() || t("marca.previaTuMarca");

  return (
    <section className="previa" aria-labelledby="previa-titulo">
      <header className="previa__cabecera">
        <h2 id="previa-titulo" className="previa__titulo">{titulo ?? t("marca.previaTitulo")}</h2>
        {nota && <p className="previa__nota">{nota}</p>}
      </header>

      {/* El estilo va AQUÍ, en línea y acotado a este contenedor. */}
      <div className="previa__lienzo" style={fichasDeMarca(marca.brandHue, marca.brandChroma)}>
        <div className="previa__tarjeta">
          <div className="previa__logo">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="previa__imagen" />
            ) : (
              <span className="previa__inicial" aria-hidden="true">
                {nombre.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="previa__marca">{nombre}</div>
          {marca.loginTagline && (
            <p className="previa__lema">{marca.loginTagline}</p>
          )}

          {/* Un formulario de mentira: se ve el acento donde de verdad se verá. */}
          <div className="previa__campo" aria-hidden="true">
            <span className="previa__etiqueta">{t("marca.previaCorreo")}</span>
            <span className="previa__control" />
          </div>
          <div className="previa__campo" aria-hidden="true">
            <span className="previa__etiqueta">{t("marca.previaContrasena")}</span>
            <span className="previa__control" />
          </div>
          <span className="previa__boton" aria-hidden="true">{t("marca.previaEntrar")}</span>

          {(marca.supportEmail || marca.supportPhone) && (
            <p className="previa__soporte">
              {t("marca.previaAyuda")} {marca.supportEmail || marca.supportPhone}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default BrandingPreview;
