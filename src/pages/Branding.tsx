import { Link } from "react-router-dom";
import BrandingForm from "@/components/BrandingForm";
import BrandingPreview from "@/components/BrandingPreview";
import { Boton, EstadoDeDatos, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import {
  CAMPOS_DE_MARCA, CAMPOS_DEL_ASISTENTE, hayCambios, useBorradorDeMarca,
} from "@/pages/useBorradorDeMarca";
import { useT } from "@/i18n/IdiomaProvider";
import "./Branding.scss";

/**
 * La pantalla de marca.
 *
 * ── DOS COSAS DISTINTAS, Y SE VE CUÁL ES CUÁL ─────────────────────────────
 * Lo que se edita es el BORRADOR. Lo que ven los clientes es lo PUBLICADO. Los
 * dos están a la vista a propósito: sin esa distinción, alguien cambia un color,
 * cierra la pestaña y se queda convencido de que ya está cambiado.
 *
 * El botón de publicar sólo se enciende cuando hay algo sin publicar.
 */

export function Branding() {
  const t = useT();
  const {
    borrador, publicado, cargando, error, aviso, guardando, publicando,
    cargar, cambiar, publicar, setBorrador,
  } = useBorradorDeMarca();

  const sinPublicar = hayCambios(borrador, publicado, CAMPOS_DE_MARCA);
  const asistenteSinPublicar = hayCambios(borrador, publicado, CAMPOS_DEL_ASISTENTE);

  return (
    <div>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("marca.titulo")}</h1>
          <p className="cabecera__sub">{t("marca.sub")}</p>
        </div>
        <Boton
          onClick={publicar}
          cargando={publicando}
          disabled={!(sinPublicar || asistenteSinPublicar) || cargando}
        >
          {t("marca.publicar")}
        </Boton>
      </header>

      <EstadoDeDatos cargando={cargando} error={error && !borrador ? error : null} onReintentar={() => cargar()}>
        {borrador && (
          <>
          {/* The login, big and full width: it is what customers will see. */}
          <div className="marca__previa">
            <BrandingPreview marca={borrador} nota={t("marca.previaNota")} />
          </div>
          {/* Publishing also publishes the assistant (one transaction on the
              server): if it has unpublished edits, say so here. */}
          {asistenteSinPublicar && (
            <p className="marca__nota">
              {t("marca.asistenteSinPublicar")}{" "}
              <Link to="/assistant">{t("nav.asistente")}</Link>
            </p>
          )}
          <div className="marca">
            <div className="marca__columna">
              <Tarjeta>
                <TarjetaCabecera
                  titulo={t("marca.identidad")}
                  nota={t(sinPublicar ? "marca.sinPublicar" : "marca.todoPublicado")}
                />
                <BrandingForm
                  marca={borrador}
                  onCambio={cambiar}
                  /* The list is REQUIRED: without it the form paints every
                     editable field. The assistant has its own page (/assistant). */
                  campos={["platformName", "loginTagline", "brandHue", "brandChroma", "fontFamily"]}
                  ranuras={[]}
                  onImagenSubida={setBorrador}
                  deshabilitado={publicando}
                />

                {/* Saving and errors are announced, not just painted. */}
                <p className="marca__estado" role="status" aria-live="polite">
                  {guardando ? t("marca.guardando") : aviso || ""}
                </p>
                {error && borrador && (
                  <p role="alert" className="marca__error">{error}</p>
                )}
              </Tarjeta>
            </div>

            <div className="marca__columna">
              <Tarjeta>
                <TarjetaCabecera
                  titulo={t("marca.logosYSoporte")}
                  nota={t("marca.logosYSoporteSub")}
                />
                <BrandingForm
                  marca={borrador}
                  onCambio={cambiar}
                  campos={["supportEmail", "supportPhone", "supportUrl"]}
                  ranuras={["logo", "logoDark", "favicon", "emailLogo"]}
                  onImagenSubida={setBorrador}
                  deshabilitado={publicando}
                />
              </Tarjeta>
            </div>
          </div>
          </>
        )}
      </EstadoDeDatos>
    </div>
  );
}

export default Branding;
