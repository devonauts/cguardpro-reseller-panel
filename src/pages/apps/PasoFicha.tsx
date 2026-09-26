import { useEffect, useId, useMemo, useState } from "react";

import { Boton, Campo, Selector, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import {
  appsService, type AppDelSocio, type CampoDeFicha, type CampoDeInfo, type EstadoDeApps,
  type IdiomaDeFicha, type TiendaDeApps,
} from "@/services/resellerService";

/**
 * PASO 2 — LA FICHA DE LA TIENDA
 *
 * Los campos, sus límites y cuáles son obligatorios llegan del servidor
 * (`requirements`). Cada campo enseña cuántos caracteres le quedan, porque
 * pasarse de 30 en el nombre es el error más común y la tienda sólo lo dice al
 * final.
 *
 * El idioma PRINCIPAL es obligatorio; el otro es opcional y, si se rellena, la
 * app se publica también en ese idioma.
 */

type Listing = EstadoDeApps["apps"]["guard"]["listing"];

export function PasoFicha({ estado, app, alCambiar }: { estado: EstadoDeApps; app: AppDelSocio; alCambiar: (e: EstadoDeApps) => void }) {
  const t = useT();
  const ficha = estado.apps[app];
  const req = estado.requirements;

  const [bundleId, setBundleId] = useState(ficha.bundleId);
  const [listing, setListing] = useState<Listing>(ficha.listing || {});
  const [info, setInfo] = useState<Record<string, string>>(() => aTexto(ficha.info));
  const [idioma, setIdioma] = useState<IdiomaDeFicha>((ficha.info.primaryLanguage as IdiomaDeFicha) || "es");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [malos, setMalos] = useState<string[]>([]);

  // Al cambiar de app se carga su ficha.
  useEffect(() => {
    setBundleId(ficha.bundleId);
    setListing(ficha.listing || {});
    setInfo(aTexto(ficha.info));
    setMalos([]);
    setError(null);
    setAviso(null);
  }, [app]); // eslint-disable-line react-hooks/exhaustive-deps

  const principal: IdiomaDeFicha = info.primaryLanguage === "en" ? "en" : "es";
  const bloqueado = !!ficha.submittedAt;
  const idValido = useMemo(() => new RegExp(req.identificador).test(bundleId), [bundleId, req.identificador]);

  const valor = (i: IdiomaDeFicha, tienda: TiendaDeApps, clave: string) => listing?.[i]?.[tienda]?.[clave] ?? "";
  const poner = (i: IdiomaDeFicha, tienda: TiendaDeApps, clave: string, v: string) =>
    setListing((l) => ({ ...l, [i]: { ...(l?.[i] || {}), [tienda]: { ...(l?.[i]?.[tienda] || {}), [clave]: v } } }));

  // Copiar lo de Apple a Google cuando Google está vacío: casi siempre es lo mismo.
  const copiarDeApple = () => {
    const a = listing?.[idioma]?.apple || {};
    const g = listing?.[idioma]?.google || {};
    setListing((l) => ({
      ...l,
      [idioma]: {
        ...(l?.[idioma] || {}),
        google: {
          ...g,
          title: g.title || a.name || "",
          shortDescription: g.shortDescription || (a.subtitle || "").slice(0, 80),
          fullDescription: g.fullDescription || a.description || "",
        },
      },
    }));
  };

  const guardar = async () => {
    setGuardando(true); setError(null); setAviso(null); setMalos([]);
    try {
      const cambios: Record<string, unknown> = { listing, info };
      if (!bloqueado) cambios.bundleId = bundleId;
      alCambiar(await appsService.guardarFicha(app, cambios));
      setInfo((i) => ({ ...i, reviewPassword: "" }));
      setAviso(t("apps.guardado"));
    } catch (e: any) {
      setError(e?.message || t("apps.noGuardo"));
      if (Array.isArray(e?.fields)) setMalos(e.fields);
    } finally {
      setGuardando(false);
    }
  };

  const camposDe = (tienda: TiendaDeApps) => req.campos.filter((c) => c.tienda === tienda);

  return (
    <div className="apps-bloque">
      <Tarjeta>
        <TarjetaCabecera titulo={t("apps.identificador")} nota={t("apps.identificadorNota")} />
        <div className="apps-formulario">
          <Campo
            etiqueta={t("apps.bundleId")}
            value={bundleId}
            disabled={bloqueado}
            onChange={(e) => setBundleId(e.target.value.trim().toLowerCase())}
            error={bundleId && !idValido ? t("apps.bundleIdMal") : null}
            ayuda={bloqueado ? t("apps.bundleIdBloqueado") : t("apps.bundleIdAyuda", { ejemplo: ficha.suggestedBundleId })}
            autoComplete="off"
          />
        </div>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera titulo={t("apps.fichaTitulo")} nota={t("apps.fichaNota")} />
        <div className="apps-idiomas">
          <div className="apps-segmentos" role="tablist" aria-label={t("apps.idiomaFicha")}>
            {(req.idiomas as IdiomaDeFicha[]).map((i) => (
              <button key={i} type="button" role="tab" aria-selected={idioma === i}
                className={`apps-segmentos__boton${idioma === i ? " apps-segmentos__boton--activo" : ""}`}
                onClick={() => setIdioma(i)}>
                {t(i === "es" ? "apps.idiomaEs" : "apps.idiomaEn")}
                {i === principal && <span className="apps-segmentos__marca">{t("apps.principal")}</span>}
              </button>
            ))}
          </div>
          <Selector
            etiqueta={t("apps.idiomaPrincipal")}
            value={principal}
            onChange={(e) => setInfo({ ...info, primaryLanguage: e.target.value })}
          >
            <option value="es">{t("apps.idiomaEs")}</option>
            <option value="en">{t("apps.idiomaEn")}</option>
          </Selector>
        </div>
        {idioma !== principal && <p className="apps-sutil">{t("apps.idiomaOpcional")}</p>}

        <h3 className="apps-subtitulo">{t("apps.tiendaApple")}</h3>
        <div className="apps-formulario">
          {camposDe("apple").map((c) => (
            <CampoConContador key={`${idioma}.apple.${c.clave}`} campo={c} valor={valor(idioma, "apple", c.clave)}
              obligatorio={c.obligatorio && idioma === principal}
              mal={malos.includes(`${idioma}.apple.${c.clave}`)}
              alCambiar={(v) => poner(idioma, "apple", c.clave, v)} />
          ))}
        </div>

        <div className="apps-subtitulo-fila">
          <h3 className="apps-subtitulo">{t("apps.tiendaGoogle")}</h3>
          <Boton variante="fantasma" onClick={copiarDeApple}>{t("apps.copiarDeApple")}</Boton>
        </div>
        <div className="apps-formulario">
          {camposDe("google").map((c) => (
            <CampoConContador key={`${idioma}.google.${c.clave}`} campo={c} valor={valor(idioma, "google", c.clave)}
              obligatorio={c.obligatorio && idioma === principal}
              mal={malos.includes(`${idioma}.google.${c.clave}`)}
              alCambiar={(v) => poner(idioma, "google", c.clave, v)} />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera titulo={t("apps.infoTitulo")} nota={t("apps.infoNota")} />
        <div className="apps-formulario">
          {req.info.filter((c) => !c.clave.startsWith("review")).map((c) => (
            <CampoDeInfoUI key={c.clave} campo={c} valor={info[c.clave] || ""} categorias={req.categorias}
              mal={malos.includes(`info.${c.clave}`)} alCambiar={(v) => setInfo({ ...info, [c.clave]: v })} />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera titulo={t("apps.revisionTitulo")} nota={t("apps.revisionNota")} />
        <div className="apps-formulario">
          {req.info.filter((c) => c.clave.startsWith("review")).map((c) => (
            <CampoDeInfoUI key={c.clave} campo={c} valor={info[c.clave] || ""} categorias={req.categorias}
              mal={malos.includes(`info.${c.clave}`)}
              yaPuesta={c.clave === "reviewPassword" && !!ficha.info.hasReviewPassword}
              alCambiar={(v) => setInfo({ ...info, [c.clave]: v })} />
          ))}
        </div>
      </Tarjeta>

      <div className="apps-acciones apps-acciones--pie">
        <Boton variante="primario" cargando={guardando} onClick={guardar}>{t("apps.guardarFicha")}</Boton>
        {aviso && <span className="apps-ok" role="status">{aviso}</span>}
        {error && <span className="apps-error" role="alert">{error}</span>}
      </div>
    </div>
  );
}

/** Todo lo de `info` como texto editable (sin el indicador de contraseña). */
function aTexto(info: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(info || {})) {
    if (k === "hasReviewPassword" || v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}

function CampoConContador({
  campo, valor, obligatorio, mal, alCambiar,
}: { campo: CampoDeFicha; valor: string; obligatorio: boolean; mal: boolean; alCambiar: (v: string) => void }) {
  const t = useT();
  const etiqueta = `${t(`apps.campo.${campo.clave}` as Clave)}${obligatorio ? " *" : ""}`;
  const ayuda = t(`apps.campo.${campo.clave}Ayuda` as Clave);
  const quedan = campo.max - valor.length;
  const contador = <span className={`apps-contador${quedan < 0 ? " apps-contador--mal" : ""}`}>{t("apps.quedan", { n: quedan })}</span>;
  const error = mal ? t("apps.campoMal") : quedan < 0 ? t("apps.demasiadoLargo") : null;

  if (campo.tipo === "largo") {
    return <AreaDeTexto etiqueta={etiqueta} ayuda={ayuda} valor={valor} max={campo.max} error={error} contador={contador} alCambiar={alCambiar} />;
  }
  return (
    <div className="apps-campo">
      <Campo etiqueta={etiqueta} ayuda={ayuda} value={valor} error={error}
        type={campo.tipo === "url" ? "url" : "text"} inputMode={campo.tipo === "url" ? "url" : undefined}
        placeholder={campo.tipo === "url" ? "https://" : undefined}
        onChange={(e) => alCambiar(e.target.value)} />
      {contador}
    </div>
  );
}

function CampoDeInfoUI({
  campo, valor, categorias, mal, yaPuesta, alCambiar,
}: { campo: CampoDeInfo; valor: string; categorias: string[]; mal: boolean; yaPuesta?: boolean; alCambiar: (v: string) => void }) {
  const t = useT();
  const etiqueta = `${t(`apps.info.${campo.clave}` as Clave)}${campo.obligatorio ? " *" : ""}`;
  const ayuda = t(`apps.info.${campo.clave}Ayuda` as Clave);
  const error = mal ? t("apps.campoMal") : null;

  if (campo.tipo === "categoria") {
    return (
      <Selector etiqueta={etiqueta} value={valor} onChange={(e) => alCambiar(e.target.value)}>
        <option value="">{t("apps.elegir")}</option>
        {categorias.map((c) => <option key={c} value={c}>{t(`apps.categoria.${c}` as Clave)}</option>)}
      </Selector>
    );
  }
  if (campo.tipo === "largo") {
    return <AreaDeTexto etiqueta={etiqueta} ayuda={ayuda} valor={valor} max={campo.max} error={error} alCambiar={alCambiar} />;
  }
  return (
    <Campo
      etiqueta={etiqueta}
      ayuda={campo.tipo === "secreto" && yaPuesta ? t("apps.contrasenaPuesta") : ayuda}
      value={valor}
      error={error}
      revelable={campo.tipo === "secreto"}
      type={campo.tipo === "secreto" ? "password" : campo.tipo === "email" ? "email" : campo.tipo === "url" ? "url" : campo.tipo === "telefono" ? "tel" : "text"}
      placeholder={campo.tipo === "url" ? "https://" : campo.tipo === "secreto" && yaPuesta ? "••••••••" : undefined}
      maxLength={campo.max}
      autoComplete={campo.tipo === "secreto" ? "new-password" : "off"}
      onChange={(e) => alCambiar(e.target.value)}
    />
  );
}

/** El `Campo` del kit es de una línea; esto es su versión multilínea, con la misma piel. */
function AreaDeTexto({
  etiqueta, ayuda, valor, max, error, contador, alCambiar,
}: { etiqueta: string; ayuda?: string; valor: string; max: number; error: string | null; contador?: JSX.Element; alCambiar: (v: string) => void }) {
  const id = useId();
  return (
    <div className="campo apps-campo">
      <label className="campo__etiqueta" htmlFor={id}>{etiqueta}</label>
      <div className={`campo__caja${error ? " campo__caja--error" : ""}`}>
        <textarea id={id} className="campo__control apps-area" value={valor} rows={max > 500 ? 8 : 3}
          aria-invalid={error ? true : undefined} onChange={(e) => alCambiar(e.target.value)} />
      </div>
      {ayuda && <p className="apps-sutil">{ayuda}</p>}
      {contador}
      {error && <p className="apps-error">{error}</p>}
    </div>
  );
}

export default PasoFicha;
