import { useCallback, useEffect, useState } from "react";

import { EstadoDeDatos, Tarjeta, TarjetaCabecera, Cifra, Pildora } from "@/components/ui/kit";
import { portalService, type DerechosDelSocio } from "@/services/resellerService";
import "./Derechos.css";

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
  const [d, setD] = useState<DerechosDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setD(await portalService.derechos());
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar tus derechos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const concedidos = d?.grantedAll ? d.catalog.length : (d?.granted?.length ?? 0);

  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <h1>Plan y derechos</h1>
        <p className="pagina__nota">
          Qué módulos puedes ofrecer a tus empresas y cuántas puedes gestionar.
          Lo define tu acuerdo con CGuard Pro.
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !d}
        etiquetaVacio="No se pudieron leer tus derechos."
        onReintentar={cargar}
      >
        {d && (
          <>
            <div className="derechos__cifras">
              <Cifra
                etiqueta="Módulos incluidos"
                valor={d.grantedAll ? "Todo el catálogo" : `${concedidos} de ${d.catalog.length}`}
              />
              <Cifra
                etiqueta="Empresas dadas de alta"
                valor={String(d.quota.used)}
              />
              <Cifra
                etiqueta="Límite de empresas"
                valor={d.quota.unlimited ? "Sin límite" : String(d.quota.max ?? "—")}
              />
              <Cifra
                etiqueta="Te quedan"
                valor={d.quota.unlimited ? "—" : String(d.quota.remaining ?? 0)}
              />
            </div>

            <Tarjeta>
              <TarjetaCabecera
                titulo="Módulos"
                nota={
                  d.grantedAll
                    ? "Tu acuerdo no recorta el catálogo: puedes ofrecerlos todos."
                    : "Sólo los marcados como incluidos entran en tu acuerdo."
                }
              />
              {!d.catalog.length ? (
                <p className="derechos__vacio">El catálogo de módulos está vacío.</p>
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
                            {incluido ? "Incluido" : "No incluido"}
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
              <TarjetaCabecera titulo="Marca de la plataforma" />
              <p className="derechos__desc">
                {d.showPlatformAttribution
                  ? "Tus pantallas pueden mostrar que la tecnología es de CGuard Pro."
                  : "Tus pantallas no muestran ninguna referencia a CGuard Pro."}
              </p>
            </Tarjeta>
          </>
        )}
      </EstadoDeDatos>
    </section>
  );
}

export default Derechos;
