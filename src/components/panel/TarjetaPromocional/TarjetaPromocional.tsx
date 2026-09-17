import { Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import "./TarjetaPromocional.scss";

/**
 * La tarjeta de producto del tablero.
 *
 * Es lo único de todo el panel que habla de CGuardPro en vez de hablar de los
 * datos del socio, y por eso va ABAJO y no arriba: quien entra viene a ver sus
 * empresas, no un anuncio.
 *
 * El escudo NO es una imagen: es el icono del sistema a gran tamaño, con el
 * mismo cristal y el mismo canto que el resto. Una ilustración aparte sería
 * otro material más que mantener alineado con el tema.
 */
export function TarjetaPromocional() {
  const t = useT();

  return (
    <section className="promo">
      <div className="promo__texto">
        <p className="promo__marca">
          <Icono nombre="escudo" tamano={15} />
          {t("tablero.promoMarca")}
        </p>
        <h2 className="promo__titulo">{t("tablero.promoTitulo")}</h2>
        <p className="promo__sub">{t("tablero.promoSub")}</p>
        <a
          className="btn btn--suave promo__boton"
          href="https://cguardpro.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("tablero.promoBoton")}
          <Icono nombre="flecha" tamano={16} />
        </a>
      </div>

      <div className="promo__arte" aria-hidden="true">
        <Icono nombre="escudo" tamano={150} />
      </div>
    </section>
  );
}

export default TarjetaPromocional;
