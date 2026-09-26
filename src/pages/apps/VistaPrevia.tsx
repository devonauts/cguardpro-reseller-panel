import { useState } from "react";

import { Tarjeta } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { TEXTOS_DE_TIENDA, type TextoDeTienda } from "@/i18n/catalogo/textosDeTienda";
import { urlDeArchivo } from "@/services/api";
import type { AppDelSocio, EstadoDeApps, IdiomaDeFicha } from "@/services/resellerService";

/**
 * PASO 4 — CÓMO SE VERÁ EN LA TIENDA
 *
 * Una maqueta fiel de la ficha de la App Store y de Google Play, dentro de un
 * teléfono, con lo que el socio ha escrito y subido. No pretende ser un
 * píxel exacto de cada tienda (cambian cada año), sino dejar ver lo que de
 * verdad importa: si el nombre cabe, si el icono se lee a tamaño real, si la
 * primera captura cuenta algo y cómo corta la descripción.
 *
 * Los textos de la propia tienda («Obtener», «Instalar») van en el idioma de
 * la ficha que se previsualiza, no en el del panel: es lo que verá el cliente.
 */

/** «Obtener», «Instalar»…: en el idioma de la FICHA, no del panel. */
const tt = (_t: ReturnType<typeof useT>, idioma: IdiomaDeFicha, clave: TextoDeTienda) =>
  TEXTOS_DE_TIENDA[idioma][clave];

export function VistaPrevia({ estado, app }: { estado: EstadoDeApps; app: AppDelSocio }) {
  const t = useT();
  const [tienda, setTienda] = useState<"apple" | "google">("apple");
  const ficha = estado.apps[app];
  const principal = (ficha.info.primaryLanguage as IdiomaDeFicha) || "es";
  const [idioma, setIdioma] = useState<IdiomaDeFicha>(principal);

  return (
    <div className="apps-bloque">
      <div className="apps-vista__controles">
        <div className="apps-segmentos" role="tablist" aria-label={t("apps.tienda")}>
          {(["apple", "google"] as const).map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tienda === x}
              className={`apps-segmentos__boton${tienda === x ? " apps-segmentos__boton--activo" : ""}`}
              onClick={() => setTienda(x)}>
              {t(x === "apple" ? "apps.tiendaApple" : "apps.tiendaGoogle")}
            </button>
          ))}
        </div>
        <div className="apps-segmentos" role="tablist" aria-label={t("apps.idiomaFicha")}>
          {(["es", "en"] as const).map((i) => (
            <button key={i} type="button" role="tab" aria-selected={idioma === i}
              className={`apps-segmentos__boton${idioma === i ? " apps-segmentos__boton--activo" : ""}`}
              onClick={() => setIdioma(i)}>
              {t(i === "es" ? "apps.idiomaEs" : "apps.idiomaEn")}
            </button>
          ))}
        </div>
      </div>

      <Tarjeta>
        <div className="apps-vista">
          <div className={`apps-telefono apps-telefono--${tienda}`}>
            <div className="apps-telefono__isla" aria-hidden="true" />
            <div className="apps-telefono__pantalla">
              {tienda === "apple"
                ? <FichaApple estado={estado} app={app} idioma={idioma} />
                : <FichaGoogle estado={estado} app={app} idioma={idioma} />}
            </div>
          </div>
          <aside className="apps-vista__notas">
            <h3 className="apps-subtitulo">{t("apps.vistaQueMirar")}</h3>
            <ul className="apps-lista-simple">
              <li>{t("apps.vistaNota1")}</li>
              <li>{t("apps.vistaNota2")}</li>
              <li>{t("apps.vistaNota3")}</li>
              <li>{t("apps.vistaNota4")}</li>
            </ul>
          </aside>
        </div>
      </Tarjeta>
    </div>
  );
}

function url(ficha: EstadoDeApps["apps"]["guard"], clave: string, i = 0): string | null {
  const v = ficha.assets[clave];
  const id = Array.isArray(v) ? v[i] : i === 0 ? v : null;
  return id ? urlDeArchivo(ficha.assetUrls[id]) : null;
}

function capturas(ficha: EstadoDeApps["apps"]["guard"], clave: string): string[] {
  const v = ficha.assets[clave];
  return (Array.isArray(v) ? v : []).map((id) => urlDeArchivo(ficha.assetUrls[id])).filter((u): u is string => !!u);
}

function FichaApple({ estado, app, idioma }: { estado: EstadoDeApps; app: AppDelSocio; idioma: IdiomaDeFicha }) {
  const t = useT();
  const ficha = estado.apps[app];
  const f = ficha.listing?.[idioma]?.apple || {};
  const icono = url(ficha, "appleIcon");
  const shots = capturas(ficha, "iphone69");
  return (
    <div className="apps-as">
      <div className="apps-as__cabeza">
        <div className="apps-as__icono">{icono ? <img src={icono} alt="" /> : <span>?</span>}</div>
        <div className="apps-as__titulos">
          <div className="apps-as__nombre">{f.name || t("apps.sinNombre")}</div>
          <div className="apps-as__subtitulo">{f.subtitle || estado.brandName || ""}</div>
          <span className="apps-as__obtener">{tt(t, idioma, "get")}</span>
        </div>
      </div>
      <div className="apps-as__datos">
        <div><strong>{tt(t, idioma, "nuevo")}</strong><span>★★★★★</span></div>
        <div><strong>{tt(t, idioma, "edad")}</strong><span>{tt(t, idioma, "edadEtiqueta")}</span></div>
        <div><strong>{t(`apps.categoria.${String(ficha.info.category || "business")}` as Clave)}</strong><span>{tt(t, idioma, "categoriaEtiqueta")}</span></div>
      </div>
      {f.promotionalText && <p className="apps-as__promo">{f.promotionalText}</p>}
      <div className="apps-as__capturas">
        {shots.length ? shots.map((s, i) => <img key={i} src={s} alt="" className="apps-as__captura" />)
          : <div className="apps-hueco apps-hueco--vertical">{t("apps.sinCapturas")}</div>}
      </div>
      <p className="apps-as__descripcion">
        {(f.description || t("apps.sinDescripcion")).slice(0, 220)}
        {(f.description || "").length > 220 && <span className="apps-as__mas"> … {tt(t, idioma, "more")}</span>}
      </p>
      <div className="apps-as__desarrollador">{estado.brandName}</div>
    </div>
  );
}

function FichaGoogle({ estado, app, idioma }: { estado: EstadoDeApps; app: AppDelSocio; idioma: IdiomaDeFicha }) {
  const t = useT();
  const ficha = estado.apps[app];
  const f = ficha.listing?.[idioma]?.google || {};
  const icono = url(ficha, "googleIcon");
  const destacada = url(ficha, "featureGraphic");
  const shots = capturas(ficha, "androidPhone");
  return (
    <div className="apps-gp">
      {destacada && <img src={destacada} alt="" className="apps-gp__destacada" />}
      <div className="apps-gp__cabeza">
        <div className="apps-gp__icono">{icono ? <img src={icono} alt="" /> : <span>?</span>}</div>
        <div>
          <div className="apps-gp__nombre">{f.title || t("apps.sinNombre")}</div>
          <div className="apps-gp__desarrollador">{estado.brandName}</div>
        </div>
      </div>
      <div className="apps-gp__datos">
        <span>{tt(t, idioma, "nuevo")}</span><span>{tt(t, idioma, "edad")}</span><span>{tt(t, idioma, "contains")}</span>
      </div>
      <span className="apps-gp__instalar">{tt(t, idioma, "install")}</span>
      <div className="apps-gp__capturas">
        {shots.length ? shots.map((s, i) => <img key={i} src={s} alt="" className="apps-gp__captura" />)
          : <div className="apps-hueco apps-hueco--vertical">{t("apps.sinCapturas")}</div>}
      </div>
      <div className="apps-gp__acerca">
        <strong>{tt(t, idioma, "about")} →</strong>
        <p>{f.shortDescription || t("apps.sinDescripcion")}</p>
      </div>
    </div>
  );
}

export default VistaPrevia;
