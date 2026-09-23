import { useCallback, useEffect, useState } from "react";

import {
  Boton, Campo, CampoCopiable, EstadoDeDatos, Estado, Panel, Pildora,
} from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { fechaYHora } from "@/lib/dinero";
import {
  domainsService,
  type DominioDelSocio, type DominiosDelSocio, type InstruccionDeDns,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { estadoDeDominio } from "@/lib/estadoDeDominio";
import "./Dominios.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * TU DIRECCIÓN
 *
 * Aquí el socio ve la dirección que le dio CGuard Pro y, si quiere, trae una
 * SUYA: `portal.suempresa.com`. Es la pantalla donde un producto de marca
 * blanca deja de parecer alquilado.
 *
 * ── SE ESCRIBE PARA QUIEN NO SABE QUÉ ES UN CNAME ─────────────────────────
 * El que abre esto es el dueño de una empresa de seguridad, no el que
 * administra su DNS. Así que no se le pide «configura un CNAME»: se le dice
 * qué tiene que copiar y dónde, y se le da un botón para copiarlo. El nombre
 * de nuestro proveedor de borde no aparece por ninguna parte: es nuestro
 * proveedor, no su problema, y decirlo sólo le daría un sitio equivocado al
 * que ir a buscar cuando algo no funcione.
 *
 * ── Y SE LE DICE LA VERDAD CUANDO NO PODEMOS ──────────────────────────────
 * Mientras el borde no esté configurado, las acciones que dependen de él salen
 * desactivadas y con el motivo escrito. Un botón que parece que funciona y no
 * hace nada es peor que uno apagado que explica por qué.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Un registro: su tipo, su nombre y su valor, en un bloque hundido. */
function Registro({ paso }: { paso: InstruccionDeDns }) {
  const t = useT();
  const esCname = paso.tipo === "CNAME";
  return (
    <div className="dns__registro">
      <span className="dns__tipo">{paso.tipo}</span>
      <div className="dns__campos">
        <CampoCopiable etiqueta={t("dominios.dnsNombre")} valor={paso.nombre} />
        <CampoCopiable
          etiqueta={t(esCname ? "dominios.dnsDestino" : "dominios.dnsValor")}
          valor={paso.valor}
        />
      </div>
    </div>
  );
}

/**
 * Los registros AGRUPADOS POR PARA QUÉ SIRVEN.
 *
 * Tres registros seguidos, sin decir cuál hace qué, se leen como una lista de
 * cosas que copiar y ya. Agrupados —enrutado, titularidad, certificado— quien
 * los pega sabe qué está haciendo, y cuando uno falle sabrá cuál mirar.
 *
 * El orden lo fija el servidor y aquí NO se reordena: si algún día manda un
 * cuarto propósito que no conocemos, cae en su propio grupo con un rótulo
 * genérico en vez de desaparecer.
 */
const SECCION: Record<string, Clave> = {
  enrutado: "dominios.seccionEnrutado",
  titularidad: "dominios.seccionTitularidad",
  certificado: "dominios.seccionCertificado",
};

function Instrucciones({ pasos }: { pasos: InstruccionDeDns[] }) {
  const t = useT();
  const grupos: Array<{ proposito: string; pasos: InstruccionDeDns[] }> = [];
  for (const paso of pasos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.proposito === paso.proposito) ultimo.pasos.push(paso);
    else grupos.push({ proposito: String(paso.proposito), pasos: [paso] });
  }

  return (
    <div className="dns">
      <p className="dns__intro">
        {t(pasos.length === 1 ? "dominios.dnsIntroUno" : "dominios.dnsIntroVarios")}
      </p>
      {grupos.map((g, i) => (
        <section key={`${g.proposito}-${i}`} className="dns__seccion">
          <h4 className="dns__seccion-titulo">
            {t(SECCION[g.proposito] ?? "dominios.seccionOtro")}
          </h4>
          {g.pasos.map((paso, j) => (
            <Registro key={`${paso.tipo}-${j}`} paso={paso} />
          ))}
        </section>
      ))}
      <p className="dns__pie">{t("dominios.dnsPie")}</p>
    </div>
  );
}

export function Dominios() {
  const { puede } = useResellerAuth();
  const t = useT();
  const gestiona = puede("reseller.domain.manage");

  const [datos, setDatos] = useState<DominiosDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Record<string, DominioDelSocio>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await domainsService.listar());
    } catch (e: any) {
      setError(e?.message || t("dominios.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn: () => Promise<unknown>, exito?: string) => {
    setEnviando(true);
    setAviso(null);
    try {
      await fn();
      if (exito) setAviso(exito);
      await cargar();
    } catch (e: any) {
      setAviso(e?.message || t("comun.noSePudoAccion"));
    } finally {
      setEnviando(false);
    }
  };

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    await accion(async () => {
      const d = await domainsService.agregar(nuevo.trim());
      setDetalle((p) => ({ ...p, [d.id]: d }));
      setNuevo("");
    }, t("dominios.anadido"));
  };

  const verInstrucciones = async (id: string) => {
    if (detalle[id]) {
      setDetalle((p) => { const q = { ...p }; delete q[id]; return q; });
      return;
    }
    try {
      const d = await domainsService.ver(id);
      setDetalle((p) => ({ ...p, [id]: d }));
    } catch (e: any) {
      setAviso(e?.message || t("dominios.noInstrucciones"));
    }
  };

  const propios = (datos?.dominios ?? []).filter((d) => d.type === "custom");
  const dePlataforma = (datos?.dominios ?? []).filter((d) => d.type !== "custom");

  return (
    <Pagina titulo={t("dominios.titulo")} nota={t("dominios.sub")}>
      {aviso && <p className="dominios__aviso">{aviso}</p>}

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {/* ── La que da CGuard Pro ─────────────────────────────────────── */}
        <Panel titulo={t("dominios.plataformaTitulo")} nota={t("dominios.plataformaNota")}>
          {dePlataforma.length === 0 && (
            <p className="dominios__vacio">{t("dominios.sinAsignada")}</p>
          )}
          {dePlataforma.map((d) => (
            <div key={d.id} className="dominios__fila">
              <span className="dominios__host">{d.hostname}</span>
              <Pildora tono={d.isActive ? "ok" : "neutro"}>
                {t(d.isActive ? "dominios.conectado" : "dominios.sinActivar")}
              </Pildora>
              {d.isPrimary && <Pildora tono="ok">{t("dominios.principal")}</Pildora>}
            </div>
          ))}
        </Panel>

        {/* ── Los suyos ────────────────────────────────────────────────── */}
        <Panel
          titulo={t("dominios.propioTitulo")}
          nota={
            <>
              {t("dominios.propioNota1")} <code>{t("dominios.ejemplo")}</code>
              {t("dominios.propioNota2")}
            </>
          }
        >

          {datos && !datos.proveedorListo && (
            <p className="dominios__bloqueo">
              {datos.motivoProveedor || t("dominios.bloqueo")}
            </p>
          )}

          {gestiona && (
            <form className="dominios__alta" onSubmit={agregar}>
              <Campo
                id="nuevo-dominio"
                etiqueta={t("dominios.campoDominio")}
                placeholder={t("dominios.ejemplo")}
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                disabled={enviando || propios.length >= (datos?.tope ?? 0)}
              />
              <Boton
                type="submit"
                disabled={enviando || !nuevo.trim() || propios.length >= (datos?.tope ?? 0)}
              >
                {t("dominios.anadir")}
              </Boton>
            </form>
          )}

          {propios.length === 0 && (
            <p className="dominios__vacio">{t("dominios.sinPropios")}</p>
          )}

          {propios.map((d) => {
            const est = estadoDeDominio(d.estado);
            const abierto = !!detalle[d.id];

            return (
              <div key={d.id} className="dominio">
                <div className="dominio__cabecera">
                  <span className="dominio__rotulo">{t("dominios.dominioPropio")}</span>
                  <span className="dominios__host">{d.hostname}</span>
                </div>

                {/* El estado NO es sólo una píldora de color: lleva su rótulo
                    y, debajo, qué significa y qué toca hacer. Un color solo
                    obliga a aprenderse la convención. */}
                <Estado
                  etiqueta={t("dominios.estadoEtiqueta")}
                  tono={est.tono}
                  texto={t(est.texto)}
                  explicacion={t(est.ayuda)}
                  extra={d.isPrimary
                    ? <Pildora tono="ok">{t("dominios.principal")}</Pildora>
                    : undefined}
                />

                {d.lastFailureReason && (
                  <p className="dominio__fallo">{d.lastFailureReason}</p>
                )}

                <div className="dominio__meta">
                  {d.lastCheckedAt && (
                    <span>{t("dominios.comprobado", { f: fechaYHora(d.lastCheckedAt) })}</span>
                  )}
                  {d.failureCount > 0 && (
                    <span>
                      {t(d.failureCount === 1 ? "dominios.intentoUno" : "dominios.intentosVarios",
                         { n: d.failureCount })}
                    </span>
                  )}
                </div>

                {gestiona && (
                  <div className="dominio__acciones">
                    <Boton variante="suave" type="button" onClick={() => verInstrucciones(d.id)}>
                      {t(abierto ? "dominios.ocultarInstrucciones" : "dominios.verInstrucciones")}
                    </Boton>
                    <Boton
                      variante="suave"
                      type="button"
                      disabled={enviando || !datos?.proveedorListo}
                      onClick={() => accion(
                        () => domainsService.comprobar(d.id),
                        t("dominios.verificacionLanzada"),
                      )}
                    >
                      {t("dominios.verificar")}
                    </Boton>
                    {d.isActive && !d.isPrimary && (
                      <Boton
                        variante="suave"
                        type="button"
                        disabled={enviando}
                        onClick={() => accion(
                          () => domainsService.hacerPrincipal(d.id),
                          t("dominios.ahoraPrincipal"),
                        )}
                      >
                        {t("dominios.hacerPrincipal")}
                      </Boton>
                    )}
                    {d.isActive && (
                      <Boton
                        variante="suave"
                        type="button"
                        disabled={enviando}
                        onClick={() => accion(
                          () => domainsService.desactivar(d.id),
                          t("dominios.dominioDesactivado"),
                        )}
                      >
                        {t("dominios.desactivar")}
                      </Boton>
                    )}
                    <Boton
                      variante="peligro"
                      type="button"
                      disabled={enviando}
                      onClick={() => accion(
                        () => domainsService.quitar(d.id),
                        t("dominios.quitado"),
                      )}
                    >
                      {t("dominios.quitar")}
                    </Boton>
                  </div>
                )}

                {abierto && detalle[d.id]?.instrucciones && (
                  <Instrucciones pasos={detalle[d.id].instrucciones!} />
                )}
              </div>
            );
          })}
        </Panel>
      </EstadoDeDatos>
    </Pagina>
  );
}

export default Dominios;
