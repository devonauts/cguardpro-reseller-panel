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
 * qué tiene que copiar y dónde, y se le da un botón para copiarlo. La palabra
 * «Cloudflare» no aparece: es nuestro proveedor, no su problema.
 *
 * ── Y SE LE DICE LA VERDAD CUANDO NO PODEMOS ──────────────────────────────
 * Mientras el borde no esté configurado, las acciones que dependen de él salen
 * desactivadas y con el motivo escrito. Un botón que parece que funciona y no
 * hace nada es peor que uno apagado que explica por qué.
 * ════════════════════════════════════════════════════════════════════════════
 */

const ESTADO: Record<string, { texto: string; tono: "ok" | "aviso" | "peligro" | "neutro"; ayuda: string }> = {
  activo: {
    texto: "Funcionando", tono: "ok",
    ayuda: "Tu gente ya puede entrar por esta dirección.",
  },
  pendiente_dns: {
    texto: "Falta el registro", tono: "aviso",
    ayuda: "Añade el registro de abajo con la empresa que gestiona tu dominio. "
      + "Suele tardar entre unos minutos y unas horas en propagarse.",
  },
  verificando: {
    texto: "Comprobando", tono: "aviso",
    ayuda: "Estamos comprobando tu dominio. No tienes que hacer nada más.",
  },
  pendiente_tls: {
    texto: "Preparando el certificado", tono: "aviso",
    ayuda: "Tu dominio ya nos llega. Falta emitir el certificado de seguridad; "
      + "es automático y suele tardar unos minutos.",
  },
  mal_configurado: {
    texto: "Algo no cuadra", tono: "peligro",
    ayuda: "No encontramos el registro esperado. Revisa que esté copiado exactamente.",
  },
  desactivado: {
    texto: "Desactivado", tono: "neutro",
    ayuda: "Esta dirección no está en uso. Puedes volver a activarla comprobándola.",
  },
};

function Instruccion({ paso }: { paso: InstruccionDeDns }) {
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
        <span className="dns__etiqueta">Tipo</span>
        <code className="dns__valor">{paso.tipo}</code>
      </div>
      <div className="dns__campo">
        <span className="dns__etiqueta">Nombre</span>
        <code className="dns__valor">{paso.nombre}</code>
      </div>
      <div className="dns__campo dns__campo--ancho">
        <span className="dns__etiqueta">
          {paso.proposito === "titularidad" ? "Valor (para verificar que es tuyo)" : "Valor"}
        </span>
        <code className="dns__valor dns__valor--largo">{paso.valor}</code>
      </div>
      <Boton variante="suave" onClick={copiar} type="button">
        {copiado ? "Copiado" : "Copiar"}
      </Boton>
    </div>
  );
}

export function Dominios() {
  const { puede } = useResellerAuth();
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
      setError(e?.message || "No se pudieron cargar tus direcciones.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn: () => Promise<unknown>, exito?: string) => {
    setEnviando(true);
    setAviso(null);
    try {
      await fn();
      if (exito) setAviso(exito);
      await cargar();
    } catch (e: any) {
      setAviso(e?.message || "No se pudo completar la acción.");
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
    }, "Dominio añadido. Ahora añade el registro que te indicamos abajo.");
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
      setAviso(e?.message || "No se pudieron cargar las instrucciones.");
    }
  };

  const propios = (datos?.dominios ?? []).filter((d) => d.type === "custom");
  const dePlataforma = (datos?.dominios ?? []).filter((d) => d.type !== "custom");

  return (
    <div className="dominios">
      <TarjetaCabecera
        titulo="Tu dirección"
        nota="La dirección web por la que tu equipo y tus clientes entran a la plataforma."
      />

      {aviso && <p className="dominios__aviso">{aviso}</p>}

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {/* ── La que da CGuard Pro ─────────────────────────────────────── */}
        <Tarjeta>
          <h2 className="dominios__titulo">Tu dirección de CGuard Pro</h2>
          <p className="dominios__nota">
            Siempre funciona y no hay que configurar nada. Aunque añadas un dominio
            propio, esta dirección sigue disponible.
          </p>
          {dePlataforma.length === 0 && (
            <p className="dominios__vacio">Todavía no tienes una dirección asignada.</p>
          )}
          {dePlataforma.map((d) => (
            <div key={d.id} className="dominios__fila">
              <span className="dominios__host">{d.hostname}</span>
              <Pildora tono={d.isActive ? "ok" : "neutro"}>
                {d.isActive ? "Funcionando" : "Sin activar"}
              </Pildora>
              {d.isPrimary && <Pildora tono="ok">Principal</Pildora>}
            </div>
          ))}
        </Tarjeta>

        {/* ── Los suyos ────────────────────────────────────────────────── */}
        <Tarjeta>
          <h2 className="dominios__titulo">Tu propio dominio</h2>
          <p className="dominios__nota">
            Usa una dirección tuya, como <code>portal.tuempresa.com</code>. Tu sitio
            web principal sigue funcionando igual: sólo se usa un subdominio.
          </p>

          {datos && !datos.proveedorListo && (
            <p className="dominios__bloqueo">
              {datos.motivoProveedor
                || "Los dominios propios todavía no están disponibles en esta instalación."}
            </p>
          )}

          {gestiona && (
            <form className="dominios__alta" onSubmit={agregar}>
              <Campo
                id="nuevo-dominio"
                etiqueta="Dominio"
                placeholder="portal.tuempresa.com"
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                disabled={enviando || propios.length >= (datos?.tope ?? 0)}
              />
              <Boton
                type="submit"
                disabled={enviando || !nuevo.trim() || propios.length >= (datos?.tope ?? 0)}
              >
                Añadir dominio
              </Boton>
            </form>
          )}

          {propios.length === 0 && (
            <p className="dominios__vacio">Todavía no has añadido ningún dominio propio.</p>
          )}

          {propios.map((d) => {
            const est = ESTADO[d.estado] ?? ESTADO.pendiente_dns;
            const abierto = !!detalle[d.id];

            return (
              <div key={d.id} className="dominio">
                <div className="dominio__cabecera">
                  <span className="dominios__host">{d.hostname}</span>
                  <Pildora tono={est.tono}>{est.texto}</Pildora>
                  {d.isPrimary && <Pildora tono="ok">Principal</Pildora>}
                </div>

                <p className="dominio__ayuda">{est.ayuda}</p>

                {d.lastFailureReason && (
                  <p className="dominio__fallo">{d.lastFailureReason}</p>
                )}

                <div className="dominio__meta">
                  {d.lastCheckedAt && <span>Comprobado {fechaYHora(d.lastCheckedAt)}</span>}
                  {d.failureCount > 0 && <span>{d.failureCount} intento(s) sin éxito</span>}
                </div>

                {gestiona && (
                  <div className="dominio__acciones">
                    <Boton variante="suave" type="button" onClick={() => verInstrucciones(d.id)}>
                      {abierto ? "Ocultar instrucciones" : "Ver qué añadir en tu DNS"}
                    </Boton>
                    <Boton
                      variante="suave"
                      type="button"
                      disabled={enviando || !datos?.proveedorListo}
                      onClick={() => accion(
                        () => domainsService.comprobar(d.id),
                        "Comprobación lanzada.",
                      )}
                    >
                      Comprobar de nuevo
                    </Boton>
                    {d.isActive && !d.isPrimary && (
                      <Boton
                        variante="suave"
                        type="button"
                        disabled={enviando}
                        onClick={() => accion(
                          () => domainsService.hacerPrincipal(d.id),
                          "Ahora es tu dirección principal.",
                        )}
                      >
                        Hacer principal
                      </Boton>
                    )}
                    {d.isActive && (
                      <Boton
                        variante="suave"
                        type="button"
                        disabled={enviando}
                        onClick={() => accion(
                          () => domainsService.desactivar(d.id),
                          "Dominio desactivado.",
                        )}
                      >
                        Desactivar
                      </Boton>
                    )}
                    <Boton
                      variante="peligro"
                      type="button"
                      disabled={enviando}
                      onClick={() => accion(
                        () => domainsService.quitar(d.id),
                        "Dominio quitado.",
                      )}
                    >
                      Quitar
                    </Boton>
                  </div>
                )}

                {abierto && detalle[d.id]?.instrucciones && (
                  <div className="dns">
                    <p className="dns__intro">
                      Añade {detalle[d.id].instrucciones!.length === 1 ? "este registro" : "estos registros"}
                      {" "}con la empresa que gestiona tu dominio (donde lo compraste).
                    </p>
                    {detalle[d.id].instrucciones!.map((paso, i) => (
                      <Instruccion key={`${paso.tipo}-${i}`} paso={paso} />
                    ))}
                    <p className="dns__pie">
                      Cuando lo hayas añadido, pulsa «Comprobar de nuevo». Los cambios de
                      DNS pueden tardar un rato en verse.
                    </p>
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
