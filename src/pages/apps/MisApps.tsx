import { useCallback, useEffect, useState } from "react";

import { EstadoDeDatos, Icono } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { appsService, type AppDelSocio, type EstadoDeApps } from "@/services/resellerService";
import { PasoCuentas } from "./PasoCuentas";
import { PasoFicha } from "./PasoFicha";
import { PasoArtes } from "./PasoArtes";
import { VistaPrevia } from "./VistaPrevia";
import { PasoPublicar } from "./PasoPublicar";
import "./MisApps.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * MIS APPS — LA APP DEL VIGILANTE Y LA DEL SUPERVISOR CON TU MARCA
 *
 * Cinco pasos en pestañas, y arriba qué app se está configurando:
 *
 *   1. Cuentas     — crear las cuentas de Apple y Google y darnos acceso.
 *                    Es lo mismo para las dos apps.
 *   2. Ficha       — lo que se lee en la tienda, en español e inglés.
 *   3. Icono y artes — con las medidas exactas que pide cada tienda.
 *   4. Vista previa — cómo se verá en la App Store y en Google Play.
 *   5. Publicar    — qué falta y el botón para pedir la publicación.
 *
 * Todo lo que es regla de las tiendas (límites, medidas, obligatorios) llega
 * del servidor en `requirements`: aquí no hay números copiados.
 * ════════════════════════════════════════════════════════════════════════════
 */

type Paso = "cuentas" | "ficha" | "artes" | "vista" | "publicar";

const PASOS: Array<{ id: Paso; texto: Clave }> = [
  { id: "cuentas", texto: "apps.paso.cuentas" },
  { id: "ficha", texto: "apps.paso.ficha" },
  { id: "artes", texto: "apps.paso.artes" },
  { id: "vista", texto: "apps.paso.vista" },
  { id: "publicar", texto: "apps.paso.publicar" },
];

export function MisApps() {
  const t = useT();
  const [estado, setEstado] = useState<EstadoDeApps | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<AppDelSocio>("guard");
  const [paso, setPaso] = useState<Paso>("cuentas");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstado(await appsService.estado());
    } catch (e: any) {
      setError(e?.message || t("apps.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const ficha = estado?.apps[app];
  const hecho = (p: Paso): boolean => {
    if (!ficha) return false;
    if (p === "cuentas") return ficha.progress.cuentas;
    if (p === "ficha") return ficha.progress.ficha;
    if (p === "artes") return ficha.progress.artes;
    if (p === "publicar") return ficha.status !== "draft";
    return false;
  };

  return (
    <Pagina titulo={t("apps.titulo")} nota={t("apps.nota")}>
      <EstadoDeDatos cargando={cargando && !estado} error={error} onReintentar={cargar}>
        {estado && ficha && (
          <>
            <div className="apps-cual" role="tablist" aria-label={t("apps.cualApp")}>
              {(["guard", "supervisor"] as AppDelSocio[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={app === a}
                  className={`apps-cual__boton${app === a ? " apps-cual__boton--activo" : ""}`}
                  onClick={() => setApp(a)}
                >
                  <span className="apps-cual__nombre">{t(a === "guard" ? "apps.appVigilante" : "apps.appSupervisor")}</span>
                  <span className="apps-cual__nota">{t(a === "guard" ? "apps.appVigilanteNota" : "apps.appSupervisorNota")}</span>
                  {estado.apps[a].status !== "draft" && (
                    <span className="apps-cual__estado">{t(`apps.estado.${estado.apps[a].status}` as Clave)}</span>
                  )}
                </button>
              ))}
            </div>

            <nav className="apps-pasos" aria-label={t("apps.pasos")}>
              <ol className="apps-pasos__lista">
                {PASOS.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`apps-pasos__paso${paso === p.id ? " apps-pasos__paso--activo" : ""}${hecho(p.id) ? " apps-pasos__paso--hecho" : ""}`}
                      aria-current={paso === p.id ? "step" : undefined}
                      onClick={() => setPaso(p.id)}
                    >
                      <span className="apps-pasos__numero">
                        {hecho(p.id) ? <Icono nombre="visto" tamano={14} /> : i + 1}
                      </span>
                      <span>{t(p.texto)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            {paso === "cuentas" && <PasoCuentas estado={estado} alCambiar={setEstado} />}
            {paso === "ficha" && <PasoFicha estado={estado} app={app} alCambiar={setEstado} />}
            {paso === "artes" && <PasoArtes estado={estado} app={app} alCambiar={setEstado} />}
            {paso === "vista" && <VistaPrevia estado={estado} app={app} />}
            {paso === "publicar" && <PasoPublicar estado={estado} app={app} alCambiar={setEstado} irA={setPaso} />}
          </>
        )}
      </EstadoDeDatos>
    </Pagina>
  );
}

export default MisApps;
