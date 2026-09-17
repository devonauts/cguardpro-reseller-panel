import { useCallback, useEffect, useState } from "react";

import { EstadoDeDatos, Tarjeta, TarjetaCabecera, Cifra, Pildora } from "@/components/cristal";
import { portalService, type DerechosDelSocio } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./Derechos.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PLAN Y DERECHOS — QUÉ PUEDE REVENDER Y CUÁNTO CABE
 *
 * ── LA REGRESIÓN QUE ESTA PANTALLA NO PUEDE REPETIR ───────────────────────
 * La misma pantalla del panel de superadmin salió en blanco en la etapa C: el
 * catálogo llega como OBJETOS —`{key,label,description}`— y se pintaba `{f}`
 * directamente, que es «Objects are not valid as a React child» (#31) y tumba
 * el render entero.
 *
 * Aquí se pinta `label` y `description`, y lo concedido se compara por CLAVE
 * (`granted.includes(f.key)`), nunca por objeto — que era el segundo fallo de
 * la etapa C y sobrevivía a arreglar el primero: ningún módulo salía concedido
 * jamás.
 *
 * ── DE LECTURA ────────────────────────────────────────────────────────────
 * Un socio que pudiera concederse módulos o ampliarse el cupo no tendría ni
 * módulos ni cupo. Esto informa; lo licencia CGuardPro.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function Derechos() {
  const t = useT();
  const [d, setD] = useState<DerechosDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setD(await portalService.derechos());
    } catch (e: any) {
      setError(e?.message || t("derechos.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const concedidos = d?.grantedAll ? d.catalog.length : (d?.granted?.length ?? 0);

  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <h1>{t("derechos.titulo")}</h1>
        <p className="pagina__nota">{t("derechos.nota")}</p>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !d}
        etiquetaVacio={t("derechos.vacio")}
        onReintentar={cargar}
      >
        {d && (
          <>
            <div className="derechos__cifras">
              <Cifra
                etiqueta={t("derechos.modulosIncluidos")}
                valor={d.grantedAll
                  ? t("derechos.todoElCatalogo")
                  : t("derechos.deN", { a: concedidos, b: d.catalog.length })}
              />
              <Cifra
                etiqueta={t("derechos.empresasAlta")}
                valor={String(d.quota.used)}
              />
              <Cifra
                etiqueta={t("derechos.limiteEmpresas")}
                valor={d.quota.unlimited ? t("comun.sinLimite") : String(d.quota.max ?? "—")}
              />
              <Cifra
                etiqueta={t("derechos.teQuedan")}
                valor={d.quota.unlimited ? "—" : String(d.quota.remaining ?? 0)}
              />
            </div>

            <Tarjeta>
              <TarjetaCabecera
                titulo={t("derechos.modulos")}
                nota={t(d.grantedAll ? "derechos.notaTodo" : "derechos.notaParcial")}
              />
              {!d.catalog.length ? (
                <p className="derechos__vacio">{t("derechos.catalogoVacio")}</p>
              ) : (
                <ul className="derechos__lista">
                  {d.catalog.map((f) => {
                    /* Por CLAVE. Comparar el objeto contra una lista de cadenas
                       no acierta nunca — el fallo de la etapa C. */
                    const incluido = d.grantedAll || (d.granted ?? []).includes(f.key);
                    return (
                      <li
                        key={f.key}
                        className={`derechos__item${incluido ? " derechos__item--si" : ""}`}
                      >
                        <div className="derechos__item-cab">
                          {/* Nunca `{f}`: el objeto no se pinta. */}
                          <span className="derechos__nombre">{f.label}</span>
                          <Pildora tono={incluido ? "ok" : "neutro"}>
                            {t(incluido ? "derechos.incluido" : "derechos.noIncluido")}
                          </Pildora>
                        </div>
                        <p className="derechos__desc">{f.description}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo={t("derechos.marcaPlataforma")} />
              <p className="derechos__desc">
                {t(d.showPlatformAttribution ? "derechos.marcaSi" : "derechos.marcaNo")}
              </p>
            </Tarjeta>
          </>
        )}
      </EstadoDeDatos>
    </section>
  );
}

export default Derechos;
