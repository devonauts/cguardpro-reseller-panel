import { useRef, useState } from "react";

import { Boton, Pildora, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { urlDeArchivo } from "@/services/api";
import {
  appsService, type AppDelSocio, type EstadoDeApps, type RanuraDeArte,
} from "@/services/resellerService";

/**
 * PASO 3 — ICONO Y ARTES
 *
 * Cada ranura dice QUÉ medida exacta pide la tienda antes de subir nada, y el
 * servidor la vuelve a comprobar sobre los bytes (no se redimensiona: una
 * captura estirada por nosotros sería una captura que el socio no ha visto).
 * Las capturas se pueden reordenar: la primera es la que se ve en la tienda.
 */

export function PasoArtes({ estado, app, alCambiar }: { estado: EstadoDeApps; app: AppDelSocio; alCambiar: (e: EstadoDeApps) => void }) {
  const t = useT();
  const artes = estado.requirements.artes;
  return (
    <div className="apps-bloque">
      <p className="apps-intro">{t("apps.artesIntro")}</p>
      <div className="apps-dos">
        {(["apple", "google"] as const).map((tienda) => (
          <Tarjeta key={tienda}>
            <TarjetaCabecera titulo={t(tienda === "apple" ? "apps.tiendaApple" : "apps.tiendaGoogle")} />
            {artes.filter((r) => r.tienda === tienda).map((r) => (
              <Ranura key={r.clave} ranura={r} estado={estado} app={app} alCambiar={alCambiar} />
            ))}
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

/** «1320 × 2868 o 1290 × 2796» / «entre 320 y 3840 px por lado». */
export function medidasEnTexto(r: RanuraDeArte, t: ReturnType<typeof useT>): string {
  if (r.medidas) return r.medidas.map(([a, b]) => `${a} × ${b}`).join(` ${t("apps.o")} `);
  if (r.rango) return t("apps.rangoMedidas", { min: r.rango.min, max: r.rango.max });
  return "";
}

function Ranura({ ranura, estado, app, alCambiar }: { ranura: RanuraDeArte; estado: EstadoDeApps; app: AppDelSocio; alCambiar: (e: EstadoDeApps) => void }) {
  const t = useT();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const ficha = estado.apps[app];
  const valor = ficha.assets[ranura.clave];
  const ids: string[] = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const lleno = ids.length >= ranura.maximo;
  const faltan = Math.max(0, ranura.minimo - ids.length);
  const esCaptura = ranura.maximo > 1;

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setSubiendo(true); setError(null); setAviso(null);
    let ultimo: EstadoDeApps | null = null;
    try {
      // Uno a uno: cada captura se valida por separado y un error dice cuál.
      for (const f of archivos.slice(0, Math.max(1, ranura.maximo - (ranura.maximo > 1 ? ids.length : 0)))) {
        const r = await appsService.subirArte(app, ranura.clave, f);
        ultimo = r.state;
        if (r.upload.aplanado) setAviso(t("apps.aplanado"));
      }
    } catch (err: any) {
      setError(`${err?.message || t("apps.noSubio")}`);
    } finally {
      if (ultimo) alCambiar(ultimo);
      setSubiendo(false);
    }
  };

  const quitar = async (id: string) => {
    setError(null);
    try { alCambiar(await appsService.quitarArte(app, ranura.clave, id)); } catch (err: any) { setError(err?.message || t("apps.noGuardo")); }
  };

  const mover = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const nuevos = [...ids];
    [nuevos[i], nuevos[j]] = [nuevos[j], nuevos[i]];
    try { alCambiar(await appsService.ordenarArtes(app, ranura.clave, nuevos)); } catch (err: any) { setError(err?.message || t("apps.noGuardo")); }
  };

  return (
    <section className="apps-ranura">
      <div className="apps-ranura__cabeza">
        <div className="apps-ranura__texto">
          <span className="apps-ranura__titulo">
            {t(`apps.arte.${ranura.clave}` as Clave)}
            {!ranura.obligatorio && <span className="apps-sutil"> · {t("apps.opcional")}</span>}
          </span>
          <span className="apps-sutil">{medidasEnTexto(ranura, t)} px · {t(`apps.arte.${ranura.clave}Nota` as Clave)}</span>
          {esCaptura && (
            <span className="apps-sutil">
              {t("apps.cuantas", { n: ids.length, max: ranura.maximo })}
              {faltan > 0 && ` · ${t("apps.faltanMinimo", { n: faltan })}`}
            </span>
          )}
        </div>
        <div className="apps-ranura__acciones">
          {ids.length >= ranura.minimo && ranura.minimo > 0 && <Pildora tono="ok">{t("apps.listo")}</Pildora>}
          <Boton variante="suave" cargando={subiendo} disabled={lleno && esCaptura} onClick={() => entrada.current?.click()}>
            {t(esCaptura ? "apps.subirCapturas" : ids.length ? "apps.cambiar" : "apps.subir")}
          </Boton>
        </div>
      </div>

      <input ref={entrada} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp"
        multiple={esCaptura} aria-label={t(`apps.arte.${ranura.clave}` as Clave)} onChange={subir} />

      {ids.length > 0 && (
        <ul className={`apps-miniaturas${ranura.clave === "featureGraphic" ? " apps-miniaturas--ancha" : ""}`}>
          {ids.map((id, i) => (
            <li key={id} className="apps-miniatura">
              {ficha.assetUrls[id] && <img src={urlDeArchivo(ficha.assetUrls[id])!} alt="" className="apps-miniatura__img" />}
              <div className="apps-miniatura__acciones">
                {esCaptura && (
                  <>
                    <button type="button" className="apps-mini-boton" disabled={i === 0} aria-label={t("apps.moverIzq")} onClick={() => mover(i, -1)}>←</button>
                    <button type="button" className="apps-mini-boton" disabled={i === ids.length - 1} aria-label={t("apps.moverDer")} onClick={() => mover(i, 1)}>→</button>
                  </>
                )}
                <button type="button" className="apps-mini-boton apps-mini-boton--quitar" aria-label={t("apps.quitar")} onClick={() => quitar(id)}>×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {aviso && <p className="apps-ok" role="status">{aviso}</p>}
      {error && <p className="apps-error" role="alert">{error}</p>}
    </section>
  );
}

export default PasoArtes;
