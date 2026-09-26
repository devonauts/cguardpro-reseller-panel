import { Link } from "react-router-dom";
import BrandingForm from "@/components/BrandingForm";
import { FormaSvg } from "@/components/SelectorDeForma";
import { Boton, EstadoDeDatos, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { esForma, FORMA_POR_DEFECTO, siglaDelAgente } from "@/lib/formasDelAgente";
import {
  CAMPOS_DE_MARCA, CAMPOS_DEL_ASISTENTE, hayCambios, useBorradorDeMarca,
} from "@/pages/useBorradorDeMarca";
import { useT } from "@/i18n/IdiomaProvider";
import "./Branding.scss";
import "./Asistente.scss";

/**
 * The partner's AI assistant: name, face, shape, tone and greeting.
 *
 * It used to be a card inside the brand screen, mixed with logos and colours.
 * It has its own page now, but it is still the SAME draft as the brand and is
 * published with it in one transaction — so this page warns when publishing
 * would also take pending brand edits live.
 */
export function Asistente() {
  const t = useT();
  const {
    borrador, publicado, cargando, error, aviso, guardando, publicando,
    cargar, cambiar, publicar, setBorrador,
  } = useBorradorDeMarca();

  const sinPublicar = hayCambios(borrador, publicado, CAMPOS_DEL_ASISTENTE);
  const marcaSinPublicar = hayCambios(borrador, publicado, CAMPOS_DE_MARCA);
  const color = `oklch(0.58 ${borrador?.brandChroma ?? 0.15} ${borrador?.brandHue ?? 222})`;
  const nombre = borrador?.agentName?.trim() || t("asistente.nombrePorDefecto");
  const forma = esForma(borrador?.agentShape) ? borrador!.agentShape! : FORMA_POR_DEFECTO;
  /* The face as the CRM will show it (signed link from the draft). */
  const cara = borrador?.agentAvatarFileId ? borrador?.assets?.agentAvatar?.url || null : null;
  /* After an upload, reload quietly: the upload answer may not carry the
     signed link yet, and the preview must show the new face at once. */
  const alSubir = (m: any) => {
    setBorrador(m);
    void cargar(true);
  };

  return (
    <div>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("asistente.titulo")}</h1>
          <p className="cabecera__sub">{t("asistente.sub")}</p>
        </div>
        <Boton
          onClick={publicar}
          cargando={publicando}
          disabled={!(sinPublicar || marcaSinPublicar) || cargando}
        >
          {t("marca.publicar")}
        </Boton>
      </header>

      <EstadoDeDatos cargando={cargando} error={error && !borrador ? error : null} onReintentar={() => cargar()}>
        {borrador && (
          <>
            {marcaSinPublicar && (
              <p className="marca__nota">
                {t("asistente.marcaSinPublicar")}{" "}
                <Link to="/branding">{t("nav.marca")}</Link>
              </p>
            )}
            <div className="marca">
              <div className="marca__columna">
                <Tarjeta>
                  <TarjetaCabecera
                    titulo={t("marca.asistente")}
                    nota={t(sinPublicar ? "marca.sinPublicar" : "marca.todoPublicado")}
                  />
                  <BrandingForm
                    marca={borrador}
                    onCambio={cambiar}
                    campos={["agentName", "agentShape", "agentIcon", "agentTone", "agentGreeting"]}
                    ranuras={["agentAvatar"]}
                    onImagenSubida={alSubir}
                    deshabilitado={publicando}
                  />
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
                  <TarjetaCabecera titulo={t("asistente.previa")} nota={t("asistente.previaNota")} />
                  {/* What a customer sees in the CRM: the chat panel and, in the
                      corner, the bubble with the shape, the colour and the name. */}
                  <div className="asist-previa" aria-hidden>
                    <div className="asist-previa__chat">
                      <div className="asist-previa__cabecera" style={{ background: color }}>
                        {cara
                          ? <img className="asist-previa__cara" src={cara} alt="" />
                          : <FormaSvg forma={forma} color="rgba(255,255,255,.25)" sigla={siglaDelAgente(nombre)} tamano={22} icono={borrador.agentIcon} />}
                        <strong>{nombre}</strong>
                      </div>
                      <div className="asist-previa__cuerpo">
                        <p className="asist-previa__globo">
                          {borrador.agentGreeting?.trim() || t("asistente.saludoPorDefecto", { nombre })}
                        </p>
                      </div>
                    </div>
                    <div className="asist-previa__burbuja">
                      <FormaSvg forma={forma} color={color} sigla={cara ? "" : siglaDelAgente(nombre)} tamano={64} icono={cara ? null : borrador.agentIcon} />
                      {cara && <img className="asist-previa__cara asist-previa__cara--grande" src={cara} alt="" />}
                    </div>
                  </div>
                </Tarjeta>
              </div>
            </div>
          </>
        )}
      </EstadoDeDatos>
    </div>
  );
}

export default Asistente;
