import { useState } from "react";

import { Boton, Estado, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { fechaYHora } from "@/lib/dinero";
import { appsService, type AppDelSocio, type EstadoDeApps } from "@/services/resellerService";

/**
 * PASO 5 — PEDIR LA PUBLICACIÓN
 *
 * Aquí se ve, en palabras, qué falta: «Falta el nombre en la App Store
 * (español)», no `es.apple.name`. Cuando no falta nada, el socio pide la
 * publicación y a partir de ahí es trabajo nuestro: compilar la app con su
 * marca y subirla a sus cuentas (la última fase del proyecto).
 */

type Paso = "cuentas" | "ficha" | "artes" | "vista" | "publicar";

export function PasoPublicar({
  estado, app, alCambiar, irA,
}: { estado: EstadoDeApps; app: AppDelSocio; alCambiar: (e: EstadoDeApps) => void; irA: (p: Paso) => void }) {
  const t = useT();
  const ficha = estado.apps[app];
  const p = ficha.progress;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** «es.apple.name» → «Nombre en la App Store (español)». */
  const nombreDeFalta = (clave: string): string => {
    if (clave === "bundleId") return t("apps.bundleId");
    const partes = clave.split(".");
    if (partes[0] === "info") return t(`apps.info.${partes[1]}` as Clave);
    const [idioma, tienda, campo] = partes;
    return t("apps.faltaCampo", {
      campo: t(`apps.campo.${campo}` as Clave),
      tienda: t(tienda === "apple" ? "apps.tiendaApple" : "apps.tiendaGoogle"),
      idioma: t(idioma === "es" ? "apps.idiomaEs" : "apps.idiomaEn"),
    });
  };

  const pedir = async () => {
    setEnviando(true); setError(null);
    try { alCambiar(await appsService.pedirPublicacion(app)); } catch (e: any) { setError(e?.message || t("apps.noGuardo")); } finally { setEnviando(false); }
  };

  const Bloque = ({ ok, titulo, paso, faltas }: { ok: boolean; titulo: Clave; paso: Paso; faltas: string[] }) => (
    <li className="apps-resumen__fila">
      <Estado tono={ok ? "ok" : "aviso"} texto={t(titulo)} explicacion={ok ? t("apps.completo") : t("apps.incompleto")} />
      {!ok && faltas.length > 0 && (
        <ul className="apps-lista-simple">
          {faltas.slice(0, 8).map((f) => <li key={f}>{f}</li>)}
          {faltas.length > 8 && <li>{t("apps.yMas", { n: faltas.length - 8 })}</li>}
        </ul>
      )}
      {!ok && <Boton variante="fantasma" onClick={() => irA(paso)}>{t("apps.irAlPaso")}</Boton>}
    </li>
  );

  return (
    <div className="apps-bloque">
      <Tarjeta>
        <TarjetaCabecera titulo={t("apps.publicarTitulo")} nota={t("apps.publicarNota")} />
        <ul className="apps-resumen">
          <Bloque ok={p.cuentas} titulo="apps.paso.cuentas" paso="cuentas" faltas={p.cuentas ? [] : [t("apps.faltaCuentas")]} />
          <Bloque ok={p.ficha} titulo="apps.paso.ficha" paso="ficha" faltas={p.faltanFicha.map(nombreDeFalta)} />
          <Bloque ok={p.artes} titulo="apps.paso.artes" paso="artes" faltas={p.faltanArtes.map((a) => t(`apps.arte.${a}` as Clave))} />
        </ul>

        {ficha.status === "draft" ? (
          <div className="apps-acciones">
            <Boton variante="primario" cargando={enviando} disabled={!p.listo} onClick={pedir}>
              {t("apps.pedirPublicacion")}
            </Boton>
            {!p.listo && <span className="apps-sutil">{t("apps.faltanPasos")}</span>}
          </div>
        ) : (
          <Estado
            tono="ok"
            texto={t(`apps.estado.${ficha.status}` as Clave)}
            explicacion={ficha.submittedAt ? t("apps.enviadaEl", { fecha: fechaYHora(ficha.submittedAt) }) : undefined}
          />
        )}
        {error && <p className="apps-error" role="alert">{error}</p>}
      </Tarjeta>

      <Tarjeta>
        <TarjetaCabecera titulo={t("apps.queSigue")} />
        <ol className="apps-lista-simple apps-lista-simple--numerada">
          <li>{t("apps.sigue1")}</li>
          <li>{t("apps.sigue2")}</li>
          <li>{t("apps.sigue3")}</li>
        </ol>
      </Tarjeta>
    </div>
  );
}

export default PasoPublicar;
