import { useEffect, useRef, useState } from "react";

import { Boton, Campo } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { cobroAEmpresasService, type FormatoDeFacturas as Formato } from "@/services/resellerService";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL FORMATO DE SUS FACTURAS — Ajustes › Cobros y facturas
 *
 * Lo que el socio decide de las facturas que se emiten SOLAS a sus clientes:
 *   · la numeración: prefijo, siguiente número y dígitos (FAC-000124). Puede
 *     seguir la serie que ya llevaba; el servidor no deja poner un número ya
 *     usado y dice cuál es el siguiente libre;
 *   · quién factura: razón social, identificación fiscal, dirección, contacto
 *     (por defecto, los de su ficha de socio);
 *   · el estilo: color, su logotipo publicado sí/no, y una nota al pie;
 *   · si al cobrarse se le manda la factura al cliente en PDF.
 *
 * La vista previa es el PDF DE VERDAD, dibujado por el servidor con lo que hay
 * en pantalla, sin guardar: lo que se ve es exactamente lo que recibirá.
 * ════════════════════════════════════════════════════════════════════════════
 */

type Edicion = Omit<Formato, "nextFolio" | "brandColor">;

const folio = (p: string, n: number, d: number) =>
  `${p}${String(Math.max(1, Math.floor(n || 1))).padStart(Math.min(Math.max(d || 1, 1), 10), "0")}`;

export function FormatoDeFacturas({ gestiona }: { gestiona: boolean }) {
  const t = useT();
  const [f, setF] = useState<Edicion | null>(null);
  const [original, setOriginal] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [previendo, setPreviendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [colorDeMarca, setColorDeMarca] = useState<string | null>(null);
  const pdfAnterior = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    cobroAEmpresasService.formato()
      .then((r) => {
        if (!vivo) return;
        const { nextFolio: _n, brandColor, ...resto } = r;
        setF(resto);
        setOriginal(JSON.stringify(resto));
        setColorDeMarca(brandColor ?? null);
      })
      .catch((e) => { if (vivo) setError(e?.message || t("formatoFactura.noCargo")); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [t]);

  // La URL del PDF se libera al cambiarla y al salir.
  useEffect(() => () => { if (pdfAnterior.current) URL.revokeObjectURL(pdfAnterior.current); }, []);

  if (cargando) return <div className="formato__esqueleto" aria-hidden="true" />;
  if (!f) return <p className="cobros__error" role="alert">{error}</p>;

  const cambia = <K extends keyof Edicion>(k: K, v: Edicion[K]) => {
    setF((x) => (x ? { ...x, [k]: v } : x));
    setAviso(null);
  };
  const sucio = JSON.stringify(f) !== original;
  const texto = (k: keyof Edicion, etiqueta: string, extra: Record<string, unknown> = {}) => (
    <Campo
      etiqueta={etiqueta}
      value={(f[k] as string | null) ?? ""}
      disabled={!gestiona}
      onChange={(e) => cambia(k, (e.target.value || null) as never)}
      {...extra}
    />
  );

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await cobroAEmpresasService.guardarFormato(f);
      const { nextFolio: _n, brandColor: _b, ...resto } = r;
      setF(resto);
      setOriginal(JSON.stringify(resto));
      setAviso(t("formatoFactura.guardado", { f: r.nextFolio }));
    } catch (e: any) {
      setError(e?.message || t("formatoFactura.noGuardo"));
    } finally {
      setGuardando(false);
    }
  };

  const verPrevia = async () => {
    setPreviendo(true);
    setError(null);
    try {
      const blob = await cobroAEmpresasService.vistaPrevia(f);
      const url = URL.createObjectURL(blob);
      if (pdfAnterior.current) URL.revokeObjectURL(pdfAnterior.current);
      pdfAnterior.current = url;
      setPdf(url);
    } catch (e: any) {
      setError(e?.message || t("formatoFactura.noPrevia"));
    } finally {
      setPreviendo(false);
    }
  };

  return (
    <section className="bloque formato" id="formato" aria-labelledby="formato-titulo">
      <header className="bloque__cabecera">
        <h2 id="formato-titulo" className="bloque__titulo">{t("formatoFactura.titulo")}</h2>
      </header>
      <p className="bloque__nota">{t("formatoFactura.nota")}</p>

      <h3 className="formato__subtitulo">{t("formatoFactura.numeracion")}</h3>
      <div className="formato__rejilla formato__rejilla--numero">
        {texto("prefix", t("formatoFactura.prefijo"), { maxLength: 20, placeholder: "FAC-" })}
        <Campo
          etiqueta={t("formatoFactura.siguiente")}
          type="number"
          min={1}
          inputMode="numeric"
          value={String(f.nextNumber)}
          disabled={!gestiona}
          onChange={(e) => cambia("nextNumber", Math.floor(Number(e.target.value)) || 1)}
        />
        <Campo
          etiqueta={t("formatoFactura.digitos")}
          type="number"
          min={1}
          max={10}
          inputMode="numeric"
          value={String(f.padding)}
          disabled={!gestiona}
          onChange={(e) => cambia("padding", Math.min(10, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
        />
        <div className="formato__muestra" aria-live="polite">
          <span className="formato__muestra-etiqueta">{t("formatoFactura.proxima")}</span>
          <span className="formato__muestra-valor">{folio(f.prefix, f.nextNumber, f.padding)}</span>
        </div>
      </div>
      <p className="bloque__nota">{t("formatoFactura.numeracionNota")}</p>

      <h3 className="formato__subtitulo">{t("formatoFactura.emisor")}</h3>
      <div className="formato__rejilla">
        {texto("issuerName", t("formatoFactura.razonSocial"), { maxLength: 160 })}
        {texto("issuerTaxId", t("formatoFactura.idFiscal"), { maxLength: 64 })}
        {texto("issuerAddress", t("formatoFactura.direccion"), { maxLength: 400 })}
        {texto("issuerEmail", t("formatoFactura.correo"), { maxLength: 160, type: "email" })}
        {texto("issuerPhone", t("formatoFactura.telefono"), { maxLength: 40 })}
        {texto("issuerWebsite", t("formatoFactura.web"), { maxLength: 160 })}
      </div>

      <h3 className="formato__subtitulo">{t("formatoFactura.estilo")}</h3>
      <div className="formato__estilo">
        <label className="formato__color">
          <span>{t("formatoFactura.color")}</span>
          <input
            type="color"
            value={f.accentColor || colorDeMarca || "#1f2937"}
            disabled={!gestiona}
            onChange={(e) => cambia("accentColor", e.target.value)}
          />
          {f.accentColor ? (
            <button type="button" className="formato__enlace" disabled={!gestiona} onClick={() => cambia("accentColor", null)}>
              {t("formatoFactura.colorDeMarca")}
            </button>
          ) : (
            <span className="formato__pista">{t("formatoFactura.colorDeMarcaActivo")}</span>
          )}
        </label>
        <label className="formato__casilla">
          <input
            type="checkbox"
            checked={f.showLogo}
            disabled={!gestiona}
            onChange={(e) => cambia("showLogo", e.target.checked)}
          />
          <span>{t("formatoFactura.logo")}</span>
        </label>
      </div>
      <label className="formato__nota-pie">
        <span className="campo__etiqueta">{t("formatoFactura.notaPie")}</span>
        <textarea
          rows={3}
          maxLength={1000}
          value={f.footerNote ?? ""}
          disabled={!gestiona}
          placeholder={t("formatoFactura.notaPieEjemplo")}
          onChange={(e) => cambia("footerNote", e.target.value || null)}
        />
      </label>

      <h3 className="formato__subtitulo">{t("formatoFactura.envio")}</h3>
      <label className="formato__casilla">
        <input
          type="checkbox"
          checked={f.sendToClient}
          disabled={!gestiona}
          onChange={(e) => cambia("sendToClient", e.target.checked)}
        />
        <span>{t("formatoFactura.enviar")}</span>
      </label>

      {error && <p role="alert" className="cobros__error">{error}</p>}
      {aviso && <p role="status" className="cobros__aviso">{aviso}</p>}

      <div className="cobros-formulario__botones">
        <Boton variante="suave" cargando={previendo} onClick={verPrevia}>{t("formatoFactura.verPrevia")}</Boton>
        {gestiona && (
          <Boton cargando={guardando} disabled={!sucio} onClick={guardar}>{t("formatoFactura.guardar")}</Boton>
        )}
      </div>

      {pdf && (
        <div className="formato__previa">
          <div className="formato__previa-cabecera">
            <span>{t("formatoFactura.previaTitulo")}</span>
            <button type="button" className="formato__enlace" onClick={() => setPdf(null)}>{t("formatoFactura.cerrarPrevia")}</button>
          </div>
          {/* Página ajustada al ancho y sin el panel de miniaturas del visor. */}
          <iframe title={t("formatoFactura.previaTitulo")} src={`${pdf}#view=FitH&navpanes=0&toolbar=1`} className="formato__marco" />
        </div>
      )}
    </section>
  );
}

export default FormatoDeFacturas;
