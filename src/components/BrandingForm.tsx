import { ChangeEvent, useRef, useState } from "react";
import { Boton, Campo } from "@/components/ui/kit";
import {
  brandingService, type Marca, type MarcaEditable, type RanuraDeImagen,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./BrandingForm.css";

/**
 * Los controles de la marca. Se usan igual desde la pantalla de Marca y desde
 * los pasos del asistente, para que no haya dos formularios que se separen.
 *
 * ── NO HAY CAMPO DE CSS, NI DE JS, NI DE HTML ─────────────────────────────
 * Y no puede haberlo. El CRM en el anfitrión de un socio comparte familia de
 * origen con los de todos los demás: quien pudiera inyectar estilos repintaría
 * un diálogo de confirmación, y quien pudiera inyectar guiones se quedaría con
 * las sesiones. Tampoco hay fuentes por URL ni código incrustado.
 *
 * ── EL COLOR ES UN TONO, NO UN COLOR ──────────────────────────────────────
 * No hay selector hexadecimal a propósito: la luminosidad la fija el sistema.
 * Es lo que impide que una marca amarilla acabe con letras blancas encima.
 */

/** Los formatos que el servidor acepta. `accept` orienta; decide el servidor. */
const ACEPTADOS = "image/png,image/jpeg,image/webp";

interface Props {
  marca: Marca;
  /** Sólo los campos que esta pantalla edita. */
  campos?: Array<keyof MarcaEditable>;
  onCambio: (parcial: MarcaEditable) => void;
  /** Ranuras de imagen a mostrar. */
  ranuras?: RanuraDeImagen[];
  onImagenSubida?: (marca: Marca) => void;
  deshabilitado?: boolean;
}

export function BrandingForm({
  marca, campos, onCambio, ranuras = [], onImagenSubida, deshabilitado,
}: Props) {
  const t = useT();
  const muestra = (c: keyof MarcaEditable) => !campos || campos.includes(c);

  return (
    <div className="marca-form">
      {muestra("platformName") && (
        <Campo
          etiqueta={t("marca.campoNombre")}
          value={marca.platformName ?? ""}
          maxLength={60}
          disabled={deshabilitado}
          ayuda={t("marca.campoNombreAyuda")}
          onChange={(e) => onCambio({ platformName: e.target.value })}
        />
      )}

      {muestra("loginTagline") && (
        <Campo
          etiqueta={t("marca.campoLema")}
          value={marca.loginTagline ?? ""}
          maxLength={140}
          disabled={deshabilitado}
          onChange={(e) => onCambio({ loginTagline: e.target.value })}
        />
      )}

      {(muestra("brandHue") || muestra("brandChroma")) && (
        <fieldset className="marca-form__grupo">
          <legend className="marca-form__leyenda">{t("marca.colorLeyenda")}</legend>
          <p className="marca-form__ayuda">{t("marca.colorAyuda")}</p>

          {muestra("brandHue") && (
            <Deslizador
              etiqueta={t("marca.colorTono")}
              id="tono"
              min={0}
              max={360}
              paso={1}
              valor={marca.brandHue ?? 222}
              deshabilitado={deshabilitado}
              onChange={(v) => onCambio({ brandHue: v })}
              /* La rampa se pinta en CSS con las fichas del sistema (ver
                 `BrandingForm.css`): así enseña los tonos con la MISMA
                 luminosidad con la que se van a aplicar, y no con una copia
                 que puede quedarse vieja. */
              conRampa
            />
          )}

          {muestra("brandChroma") && (
            <Deslizador
              etiqueta={t("marca.colorIntensidad")}
              id="intensidad"
              min={0}
              max={0.4}
              paso={0.01}
              valor={marca.brandChroma ?? 0.15}
              deshabilitado={deshabilitado}
              onChange={(v) => onCambio({ brandChroma: v })}
            />
          )}
        </fieldset>
      )}

      {muestra("supportEmail") && (
        <Campo
          etiqueta={t("marca.campoCorreoSoporte")}
          type="email"
          value={marca.supportEmail ?? ""}
          disabled={deshabilitado}
          ayuda={t("marca.campoCorreoSoporteAyuda")}
          onChange={(e) => onCambio({ supportEmail: e.target.value })}
        />
      )}

      {muestra("supportPhone") && (
        <Campo
          etiqueta={t("marca.campoTelefonoSoporte")}
          value={marca.supportPhone ?? ""}
          disabled={deshabilitado}
          onChange={(e) => onCambio({ supportPhone: e.target.value })}
        />
      )}

      {muestra("supportUrl") && (
        <Campo
          etiqueta={t("marca.campoWebSoporte")}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={marca.supportUrl ?? ""}
          disabled={deshabilitado}
          ayuda={t("marca.campoWebSoporteAyuda")}
          onChange={(e) => onCambio({ supportUrl: e.target.value })}
        />
      )}

      {ranuras.map((r) => (
        <SubidaDeImagen
          key={r}
          ranura={r}
          marca={marca}
          deshabilitado={deshabilitado}
          onSubida={onImagenSubida}
        />
      ))}
    </div>
  );
}

/* ── Deslizador ──────────────────────────────────────────────────────────── */

function Deslizador({
  etiqueta, id: nombre, min, max, paso, valor, onChange, conRampa, deshabilitado,
}: {
  etiqueta: string;
  /** Estable y en ASCII: el `id` no puede salir de un rótulo que cambia de
   *  idioma — si saliera, la etiqueta dejaría de apuntar al control al
   *  cambiarlo. */
  id: string;
  min: number; max: number; paso: number; valor: number;
  onChange: (v: number) => void; conRampa?: boolean; deshabilitado?: boolean;
}) {
  const id = `desl-${nombre}`;
  return (
    <div className="desl">
      <label className="desl__etiqueta" htmlFor={id}>
        {etiqueta}
        {/* El valor, a la vista: un deslizador sin número es imposible de
            reproducir y de comunicar por teléfono a quien te da soporte. */}
        <span className="desl__valor">{paso < 1 ? valor.toFixed(2) : valor}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        disabled={deshabilitado}
        className={`desl__control${conRampa ? " desl__control--tono" : ""}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/* ── Subida ──────────────────────────────────────────────────────────────── */

const ETIQUETA_RANURA: Record<RanuraDeImagen, { titulo: Clave; nota: Clave }> = {
  logo: { titulo: "marca.ranuraLogo", nota: "marca.ranuraLogoNota" },
  logoDark: { titulo: "marca.ranuraLogoDark", nota: "marca.ranuraLogoDarkNota" },
  mark: { titulo: "marca.ranuraMark", nota: "marca.ranuraMarkNota" },
  markDark: { titulo: "marca.ranuraMarkDark", nota: "marca.ranuraMarkDarkNota" },
  favicon: { titulo: "marca.ranuraFavicon", nota: "marca.ranuraFaviconNota" },
  emailLogo: { titulo: "marca.ranuraEmailLogo", nota: "marca.ranuraEmailLogoNota" },
};

function SubidaDeImagen({
  ranura, marca, onSubida, deshabilitado,
}: {
  ranura: RanuraDeImagen;
  marca: Marca;
  onSubida?: (m: Marca) => void;
  deshabilitado?: boolean;
}) {
  const t = useT();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const puesto = !!(marca as any)[`${ranura}FileId`];
  const meta = ETIQUETA_RANURA[ranura];
  const titulo = t(meta.titulo);

  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    // El campo se vacía siempre: si no, elegir el MISMO archivo otra vez —tras
    // corregirlo— no dispara el evento y parece que la pantalla se ha colgado.
    e.target.value = "";
    if (!archivo) return;

    setError(null);
    setSubiendo(true);
    try {
      const r = await brandingService.subirImagen(ranura, archivo);
      onSubida?.(r.draft);
    } catch (err: any) {
      /* El servidor dice POR QUÉ no vale —un SVG, una imagen enorme, un archivo
         dañado— y ese mensaje se enseña tal cual: es lo único que le permite al
         socio saber qué volver a exportar. */
      setError(err?.message || t("marca.subidaFallo"));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="subida">
      <div className="subida__texto">
        <span className="subida__titulo">{titulo}</span>
        <span className="subida__nota">{t(meta.nota)}</span>
      </div>

      <div className="subida__acciones">
        {puesto && <span className="subida__puesto">{t("marca.subidaCargado")}</span>}
        <Boton
          variante="suave"
          cargando={subiendo}
          disabled={deshabilitado}
          onClick={() => entrada.current?.click()}
        >
          {t(puesto ? "marca.subidaCambiar" : "marca.subidaSubir")}
        </Boton>
      </div>

      <input
        ref={entrada}
        type="file"
        accept={ACEPTADOS}
        className="sr-only"
        // La etiqueta va en el input porque el botón de arriba es quien lo
        // dispara: sin esto, un lector de pantalla encuentra un campo sin nombre.
        aria-label={t("marca.subidaAria", { que: titulo.toLowerCase() })}
        onChange={elegir}
      />

      {error && <p role="alert" className="subida__error">{error}</p>}
    </div>
  );
}

export default BrandingForm;
