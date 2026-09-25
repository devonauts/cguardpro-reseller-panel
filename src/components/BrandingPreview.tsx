import { useEffect, useRef, useState, type ReactNode } from "react";
import { Boton } from "@/components/cristal";
import { brandingService, type Marca } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./BrandingPreview.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE PARTNER'S LOGIN, EXACTLY AS THEIR CUSTOMERS WILL SEE IT
 *
 * Not a drawing of a login: the real CRM login page, in two iframes — light
 * and dark — dressed in the DRAFT branding through a signed preview link (see
 * the backend's `vistaPreviaDeMarca` and the CRM's `lib/vistaPrevia`). In that
 * mode the CRM never signs anyone in.
 *
 * The frames render at desktop size and are scaled down to fit, so what the
 * partner sees is the real layout, not the phone layout a narrow column would
 * trigger. Colours, name and tagline follow the form live (postMessage); a new
 * logo reloads the frames, since logos come from the saved draft.
 * ════════════════════════════════════════════════════════════════════════════
 */

const ANCHO = 1280;
const ALTO = 800;
const TIPO = "cguard:vista-previa-de-marca";

function Marco({
  src, etiqueta, marca, onListo,
}: {
  src: string;
  etiqueta: string;
  marca: Marca;
  onListo?: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLIFrameElement>(null);
  const [escala, setEscala] = useState(0.4);

  useEffect(() => {
    const c = caja.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setEscala(Math.max(0.1, c.clientWidth / ANCHO)));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  /* Live: what the partner is changing right now, to the frame. */
  const enviar = () => {
    try {
      marco.current?.contentWindow?.postMessage({
        tipo: TIPO,
        brandHue: marca.brandHue,
        brandChroma: marca.brandChroma,
        platformName: marca.platformName ?? "",
        loginTagline: marca.loginTagline ?? null,
      }, "*");
    } catch { /* the frame is still loading */ }
  };

  useEffect(() => {
    const t = window.setTimeout(enviar, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca.brandHue, marca.brandChroma, marca.platformName, marca.loginTagline]);

  useEffect(() => {
    const alRecibir = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return;
      if ((e.data as any)?.tipo === `${TIPO}:lista`) { enviar(); onListo?.(); }
    };
    window.addEventListener("message", alRecibir);
    return () => window.removeEventListener("message", alRecibir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca]);

  return (
    <figure className="previa__marco">
      <figcaption className="previa__etiqueta">{etiqueta}</figcaption>
      <div className="previa__ventana">
        <div className="previa__barra" aria-hidden="true">
          <span className="previa__punto" /><span className="previa__punto" /><span className="previa__punto" />
        </div>
        <div ref={caja} className="previa__lienzo" style={{ height: ALTO * escala }}>
          <iframe
            ref={marco}
            title={etiqueta}
            src={src}
            className="previa__iframe"
            style={{ width: ANCHO, height: ALTO, transform: `scale(${escala})` }}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
            tabIndex={-1}
          />
        </div>
      </div>
    </figure>
  );
}

export function BrandingPreview({
  marca,
  titulo,
  nota,
}: {
  marca: Marca;
  /** Kept for callers that pass it; the logo comes from the saved draft. */
  logoUrl?: string | null;
  titulo?: string;
  nota?: ReactNode;
}) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedir = async () => {
    setError(null);
    try {
      const r = await brandingService.enlaceDeVistaPrevia();
      setUrl(r.url);
    } catch (e: any) {
      setError(e?.message || t("marca.previaNoCargo"));
    }
  };

  useEffect(() => { void pedir(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* A new logo is a new saved draft: the frames reload to fetch it. */
  const version = [marca.logoFileId, marca.logoDarkFileId, marca.faviconFileId, marca.updatedAt].join("|");
  const con = (tema: string) => (url ? `${url}&tema=${tema}&v=${encodeURIComponent(version)}` : "");

  return (
    <section className="previa" aria-labelledby="previa-titulo">
      <header className="previa__cabecera">
        <h2 id="previa-titulo" className="previa__titulo">{titulo ?? t("marca.previaTitulo")}</h2>
        {nota && <p className="previa__nota">{nota}</p>}
      </header>

      {error ? (
        <div className="previa__error">
          <p role="alert">{error}</p>
          <Boton variante="suave" onClick={() => void pedir()}>{t("comun.reintentar")}</Boton>
        </div>
      ) : url ? (
        <div className="previa__pareja">
          <Marco key={`claro-${version}`} src={con("claro")} etiqueta={t("marca.previaClaro")} marca={marca} />
          <Marco key={`oscuro-${version}`} src={con("oscuro")} etiqueta={t("marca.previaOscuro")} marca={marca} />
        </div>
      ) : (
        <p className="previa__nota">{t("comun.cargando")}</p>
      )}
    </section>
  );
}

export default BrandingPreview;
