import { useCallback, useEffect, useState } from "react";

import {
  Boton, Campo, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera,
} from "@/components/ui/kit";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { fechaYHora } from "@/lib/dinero";
import {
  domainsService,
  type DominioDelSocio, type DominiosDelSocio, type InstruccionDeDns,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./Dominios.css";

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

type Tono = "ok" | "aviso" | "peligro" | "neutro";

const ESTADO: Record<string, { texto: Clave; tono: Tono; ayuda: Clave }> = {
  activo: {
    texto: "dominios.conectado", tono: "ok", ayuda: "dominios.conectadoAyuda",
  },
  pendiente_dns: {
    texto: "dominios.dnsRequerida", tono: "aviso", ayuda: "dominios.dnsRequeridaAyuda",
  },
  verificando: {
    texto: "dominios.verificando", tono: "aviso", ayuda: "dominios.verificandoAyuda",
  },
  pendiente_tls: {
    texto: "dominios.preparandoSsl", tono: "aviso", ayuda: "dominios.preparandoSslAyuda",
  },
  mal_configurado: {
    texto: "dominios.requiereAtencion", tono: "peligro", ayuda: "dominios.requiereAtencionAyuda",
  },
  desactivado: {
    texto: "dominios.desactivado", tono: "neutro", ayuda: "dominios.desactivadoAyuda",
  },
};

function Instruccion({ paso }: { paso: InstruccionDeDns }) {
  const t = useT();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(paso.valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* Sin permiso de portapapeles el valor sigue a la vista para copiarlo a
         mano: no se bloquea nada por esto. */
    }
  };

  return (
    <div className="dns__fila">
      <div className="dns__campo">
        <span className="dns__etiqueta">{t("dominios.dnsTipo")}</span>
        <code className="dns__valor">{paso.tipo}</code>
      </div>
      <div className="dns__campo">
        <span className="dns__etiqueta">{t("dominios.dnsNombre")}</span>
        <code className="dns__valor">{paso.nombre}</code>
      </div>
      <div className="dns__campo dns__campo--ancho">
        <span className="dns__etiqueta">
          {t(paso.proposito === "titularidad"
            ? "dominios.dnsValorTitularidad"
            : "dominios.dnsValor")}
        </span>
        <code className="dns__valor dns__valor--largo">{paso.valor}</code>
      </div>
      <Boton variante="suave" onClick={copiar} type="button">
        {t(copiado ? "comun.copiado" : "comun.copiar")}
      </Boton>
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
    <div className="dominios">
      <TarjetaCabecera
        titulo={t("dominios.titulo")}
        nota={t("dominios.sub")}
      />

      {aviso && <p className="dominios__aviso">{aviso}</p>}

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {/* ── La que da CGuard Pro ─────────────────────────────────────── */}
        <Tarjeta>
          <h2 className="dominios__titulo">{t("dominios.plataformaTitulo")}</h2>
          <p className="dominios__nota">{t("dominios.plataformaNota")}</p>
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
        </Tarjeta>

        {/* ── Los suyos ────────────────────────────────────────────────── */}
        <Tarjeta>
          <h2 className="dominios__titulo">{t("dominios.propioTitulo")}</h2>
          <p className="dominios__nota">
            {t("dominios.propioNota1")} <code>{t("dominios.ejemplo")}</code>
            {t("dominios.propioNota2")}
          </p>

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
            const est = ESTADO[d.estado] ?? ESTADO.pendiente_dns;
            const abierto = !!detalle[d.id];

            return (
              <div key={d.id} className="dominio">
                <div className="dominio__cabecera">
                  <span className="dominios__host">{d.hostname}</span>
                  <Pildora tono={est.tono}>{t(est.texto)}</Pildora>
                  {d.isPrimary && <Pildora tono="ok">{t("dominios.principal")}</Pildora>}
                </div>

                <p className="dominio__ayuda">{t(est.ayuda)}</p>

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
                  <div className="dns">
                    <p className="dns__intro">
                      {t(detalle[d.id].instrucciones!.length === 1
                        ? "dominios.dnsIntroUno"
                        : "dominios.dnsIntroVarios")}
                    </p>
                    {detalle[d.id].instrucciones!.map((paso, i) => (
                      <Instruccion key={`${paso.tipo}-${i}`} paso={paso} />
                    ))}
                    <p className="dns__pie">{t("dominios.dnsPie")}</p>
                  </div>
                )}
              </div>
            );
          })}
        </Tarjeta>
      </EstadoDeDatos>
    </div>
  );
}

export default Dominios;
