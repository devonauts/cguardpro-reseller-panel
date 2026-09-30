import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDireccionDeClientes } from "@/components/panel/Enlace";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, Campo, Confirmar, Dato, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera, Icono, type Tono,
} from "@/components/cristal";
import { EliminarEmpresa } from "@/components/empresas/EliminarEmpresa";
import { Avatar } from "@/components/panel";
import {
  cobroAEmpresasService, companiesService,
  type CobroAEmpresas, type Empresa, type FacturasAClientes,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { fecha, fechaCorta, precio } from "@/lib/dinero";
import { ModulosDeLaEmpresa } from "@/components/empresas/ModulosDeLaEmpresa";
import PersonasDeLaEmpresa from "@/components/empresas/PersonasDeLaEmpresa";
import { FacturasDeLaEmpresa } from "@/components/empresas/FacturasDeLaEmpresa";
import { CobroDeLaEmpresa } from "@/components/empresas/CobroDeLaEmpresa";
import "./Billing.scss";
import "./CompanyForm.scss";

const ESTADO_DE_COBRO: Record<string, { tono: Tono; texto: Clave }> = {
  trialing: { tono: "neutro", texto: "cobros.estadoPrueba" },
  active: { tono: "ok", texto: "cobros.estadoAlDia" },
  past_due: { tono: "aviso", texto: "cobros.estadoMora" },
  paused: { tono: "peligro", texto: "cobros.estadoPausada" },
  exempt: { tono: "neutro", texto: "cobros.estadoExenta" },
};

/**
 * La ficha de una empresa.
 *
 * ── NO ES UN TABLERO DE OPERACIÓN ─────────────────────────────────────────
 * No hay vigilantes conectados, ni incidentes, ni rondas, ni ubicaciones, ni
 * cámaras, ni turnos. Es la ficha COMERCIAL de un cliente: quién es, cómo se le
 * localiza y desde cuándo. Todo lo demás pertenece a la empresa y a su gente.
 *
 * ── LO QUE SE PUEDE CORREGIR Y LO QUE NO ──────────────────────────────────
 * Se corrigen los datos de contacto y de identificación. No se toca el plan, ni
 * la facturación, ni la suspensión: el servidor los ignoraría igualmente, y
 * ofrecer el control enseñaría que el formulario miente. Los MÓDULOS
 * ADICIONALES sí se activan aquí, en su propia tarjeta, si la plataforma le ha
 * habilitado al socio revenderlos (`ModulosDeLaEmpresa`).
 *
 * La suspensión se MUESTRA porque el socio necesita saber si su cliente está
 * parado; pero es una palanca de la plataforma y se opera desde allí.
 *
 * ── LO QUE EL SOCIO VIENE A VER (rediseño 2026-09-29) ─────────────────────
 * Arriba, cuatro cifras: cómo va su cobro (en prueba / al día / pausada, con la
 * fecha que toca), lo facturado, lo que debe y si tiene tarjeta. Debajo, a la
 * izquierda lo que se mira a menudo —sus FACTURAS con PDF y las PERSONAS que
 * entran a su CRM— y a la derecha la ficha: datos, COBRO (con «extender
 * prueba») y módulos. Antes eran dos tarjetas de datos sueltos y el correo se
 * partía a mitad de palabra.
 */

export function CompanyDetail() {
  const { tenantId = "" } = useParams();
  const navigate = useNavigate();
  const { puede } = useResellerAuth();
  const t = useT();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Partial<Empresa>>({});
  const [cobro, setCobro] = useState<CobroAEmpresas | null>(null);
  const [facturas, setFacturas] = useState<FacturasAClientes | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const e = await companiesService.detail(tenantId);
      setEmpresa(e);
      setBorrador({});
      setEditando(false);
    } catch (e: any) {
      /* Una empresa que no es suya contesta igual que una que no existe: el
         servidor no distingue, y la pantalla tampoco debe hacerlo. */
      setError(e?.message || t("fichaEmpresa.noEncontrada"));
    } finally {
      setCargando(false);
    }
  }, [tenantId, t]);

  useEffect(() => { cargar(); }, [cargar]);

  const veCobro = puede("reseller.billing.view");
  /* El cobro y las facturas de ESTA empresa. Silencioso: si falla, la ficha
     se ve igual, sin esas tarjetas. */
  const cargarCobro = useCallback(async () => {
    if (!veCobro) return;
    const [c, f] = await Promise.all([
      cobroAEmpresasService.leer().catch(() => null),
      cobroAEmpresasService.facturas({ tenantId, limit: 6 }).catch(() => null),
    ]);
    setCobro(c);
    setFacturas(f);
  }, [tenantId, veCobro]);
  useEffect(() => { void cargarCobro(); }, [cargarCobro]);

  const puedeEditar = puede("reseller.company.update");
  const puedeDarDeBaja = puede("reseller.company.suspend");
  const location = useLocation();
  const archivada = !!empresa?.archivedAt;
  const [cambiandoBaja, setCambiandoBaja] = useState(false);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);

  /* «Editar» desde los tres puntos de la lista llega con `?editar=1`: se abre
     el formulario en cuanto la ficha está cargada, y se limpia la dirección
     para que recargar no lo vuelva a abrir. */
  useEffect(() => {
    if (!empresa || !new URLSearchParams(location.search).has("editar")) return;
    if (puedeEditar && !empresa.archivedAt) setEditando(true);
    navigate(location.pathname, { replace: true, state: location.state });
  }, [empresa]); // eslint-disable-line react-hooks/exhaustive-deps

  const archivar = async () => {
    setCambiandoBaja(true);
    setError(null);
    try {
      const r = await companiesService.archive(tenantId);
      setEmpresa(r.company);
      setEditando(false);
      setAviso(t("bajaEmpresa.archivadaFicha"));
    } catch (e: any) {
      setError(e?.message || t("bajaEmpresa.noSeArchivo"));
    } finally {
      setCambiandoBaja(false);
    }
  };

  const restaurar = async () => {
    setCambiandoBaja(true);
    setError(null);
    try {
      const r = await companiesService.restore(tenantId);
      setEmpresa(r.company);
      setAviso(t("bajaEmpresa.restauradaFicha"));
    } catch (e: any) {
      setError(e?.message || t("bajaEmpresa.noSeRestauro"));
    } finally {
      setCambiandoBaja(false);
    }
  };
  /* La dirección por la que su gente entra a su CRM: la del socio. */
  const { host } = useDireccionDeClientes();
  const puedeEntrar = puede("reseller.company.support_access");
  const [entrando, setEntrando] = useState(false);

  /* "Open their CRM": straight in as support, with a banner and an exit in the
     CRM. The tab is opened NOW, inside the click, so no popup blocker stops it;
     it is pointed at the single-use URL once the server hands it over. */
  const entrarAlCrm = async () => {
    if (entrando) return;
    const pestana = window.open("", "_blank");
    setEntrando(true);
    setError(null);
    try {
      const { url } = await companiesService.supportAccess(tenantId);
      if (pestana) {
        pestana.opener = null;
        pestana.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e: any) {
      pestana?.close();
      setError(e?.message || t("fichaEmpresa.noEntro"));
    } finally {
      setEntrando(false);
    }
  };

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await companiesService.update(tenantId, borrador as any);
      setEmpresa(r.company);
      setBorrador({});
      setEditando(false);
      setAviso(t(r.changed.length ? "fichaEmpresa.guardado" : "fichaEmpresa.sinCambios"));
    } catch (e: any) {
      setError(e?.message || t("fichaEmpresa.noGuardo"));
    } finally {
      setGuardando(false);
    }
  };

  const campo = (k: keyof Empresa) =>
    (borrador[k] as string) ?? (empresa?.[k] as string) ?? "";

  const estadoCobro = cobro?.companies?.find((c) => c.tenantId === tenantId) ?? null;
  const moneda = cobro?.pricing?.currency ?? cobro?.currency ?? Object.keys(facturas?.totalsByCurrency ?? {})[0] ?? "USD";
  const totales = facturas?.totalsByCurrency?.[moneda] ?? null;
  const notaDelCobro = !estadoCobro ? null
    : estadoCobro.anchorAt ? t("cobros.renuevaDia", { d: Number(estadoCobro.anchorAt.slice(8, 10)) })
      : estadoCobro.trialEndsAt ? t("cobros.pruebaHasta", { f: fechaCorta(estadoCobro.trialEndsAt) }) : null;

  return (
    <div>
      {/* La vuelta, arriba a la IZQUIERDA y con su destino escrito: es donde
          la busca la mano (ley de Jakob) y dice a dónde lleva. */}
      <Link to="/companies" className="miga">
        <Icono nombre="flecha" tamano={14} className="miga__icono" />
        {t("empresas.titulo")}
      </Link>
      {(location.state as any)?.recienCreada && (
        <p role="status" className="ficha__creada">
          <Icono nombre="visto" tamano={16} />
          {t("fichaEmpresa.recienCreada")}
        </p>
      )}
      <header className="cabecera ficha__cabecera">
        <div className="ficha__identidad">
          <Avatar nombre={empresa?.name || "?"} tamano={52} />
          <div>
            <h1 className="cabecera__titulo">{empresa?.name || t("fichaEmpresa.titulo")}</h1>
            <p className="cabecera__sub ficha__sub">
              {empresa?.businessTitle || t("fichaEmpresa.sub")}
              {estadoCobro && (
                <Pildora tono={ESTADO_DE_COBRO[estadoCobro.status]?.tono ?? "neutro"}>
                  {ESTADO_DE_COBRO[estadoCobro.status] ? t(ESTADO_DE_COBRO[estadoCobro.status].texto) : estadoCobro.status}
                </Pildora>
              )}
              {archivada
                ? <Pildora tono="neutro">{t("bajaEmpresa.pildoraArchivada")}</Pildora>
                : empresa?.suspendedAt && <Pildora tono="peligro">{t("empresas.suspendida")}</Pildora>}
            </p>
          </div>
        </div>
        <div className="cabecera__acciones">
          {puedeEntrar && empresa && (
            <button type="button" className="btn btn--fantasma ficha__crm" onClick={entrarAlCrm} disabled={entrando}>
              {entrando ? t("fichaEmpresa.entrando") : t("fichaEmpresa.abrirCrm")}
              <Icono nombre="flecha" tamano={14} />
            </button>
          )}
          {!puedeEntrar && host && (
            <a className="btn btn--fantasma ficha__crm" href={`https://${host}/login`} target="_blank" rel="noreferrer">
              {t("fichaEmpresa.abrirCrm")}
              <Icono nombre="flecha" tamano={14} />
            </a>
          )}
          {puedeEditar && !editando && empresa && !archivada && (
            <Boton variante="suave" onClick={() => setEditando(true)}>
              <Icono nombre="lapiz" tamano={16} />
              {t("fichaEmpresa.corregir")}
            </Boton>
          )}
          {puedeDarDeBaja && empresa && !editando && (archivada ? (
            <Boton variante="suave" onClick={restaurar} cargando={cambiandoBaja}>
              <Icono nombre="restaurar" tamano={16} />
              {t("bajaEmpresa.restaurar")}
            </Boton>
          ) : (
            <Confirmar
              variante="suave"
              pregunta={t("bajaEmpresa.preguntaArchivar")}
              textoConfirmar={t("bajaEmpresa.archivar")}
              onConfirmar={archivar}
              cargando={cambiandoBaja}
            >
              <Icono nombre="archivo" tamano={16} />
              {t("bajaEmpresa.archivar")}
            </Confirmar>
          ))}
          {puedeDarDeBaja && empresa && !editando && (
            <Boton variante="peligro" onClick={() => setEliminarAbierto(true)}>
              <Icono nombre="papelera" tamano={16} />
              {t("bajaEmpresa.eliminar")}
            </Boton>
          )}
        </div>
      </header>

      {archivada && (
        <p role="status" className="ficha__archivada">
          <Icono nombre="archivo" tamano={16} />
          {t("bajaEmpresa.bannerArchivada", { f: fechaCorta(empresa!.archivedAt!) })}
        </p>
      )}

      <EliminarEmpresa
        empresa={empresa}
        abierto={eliminarAbierto}
        onCerrar={() => setEliminarAbierto(false)}
        onEliminada={() => navigate("/companies", { replace: true })}
      />

      <EstadoDeDatos cargando={cargando} error={!empresa ? error : null} onReintentar={cargar}>
        {empresa && !editando && (
          <>
            {veCobro && estadoCobro && (
              <div className="resumen ficha__resumen">
                <section className="saldo-ficha">
                  <span className="saldo-ficha__etiqueta">{t("fichaEmpresa.estadoDelCobro")}</span>
                  <span className="saldo-ficha__valor ficha__valor-texto">
                    {ESTADO_DE_COBRO[estadoCobro.status] ? t(ESTADO_DE_COBRO[estadoCobro.status].texto) : estadoCobro.status}
                  </span>
                  {notaDelCobro && <span className="saldo-ficha__nota">{notaDelCobro}</span>}
                </section>
                <section className="saldo-ficha">
                  <span className="saldo-ficha__etiqueta">{t("fichaEmpresa.facturado")}</span>
                  <span className="saldo-ficha__valor">{precio(totales?.cobradoTotalCents ?? 0, moneda)}</span>
                  <span className="saldo-ficha__nota">{t("fichaEmpresa.facturadoNota", { n: facturas?.count ?? 0 })}</span>
                </section>
                <section className={`saldo-ficha${(totales?.porCobrarCents ?? 0) > 0 ? " saldo-ficha--aviso" : ""}`}>
                  <span className="saldo-ficha__etiqueta">{t("ingresos.porCobrar")}</span>
                  <span className="saldo-ficha__valor">{precio(totales?.porCobrarCents ?? 0, moneda)}</span>
                </section>
                <section className="saldo-ficha">
                  <span className="saldo-ficha__etiqueta">{t("fichaEmpresa.tarjeta")}</span>
                  <span className="saldo-ficha__valor ficha__valor-texto">
                    {t(estadoCobro.hasCard ? "fichaEmpresa.tarjetaGuardada" : "cobros.sinTarjeta")}
                  </span>
                  {!estadoCobro.hasCard && <span className="saldo-ficha__nota">{t("fichaEmpresa.sinTarjetaNota")}</span>}
                </section>
              </div>
            )}

            <div className="ficha ficha--detalle">
              <div className="ficha__columna">
                {veCobro && (
                  <FacturasDeLaEmpresa tenantId={tenantId} filas={facturas ? facturas.rows : null} total={facturas?.count ?? 0} />
                )}
                {puede("reseller.company.users.view") && (
                  <Tarjeta>
                    <TarjetaCabecera titulo={t("fichaEmpresa.personas")} nota={t("fichaEmpresa.personasNota")} />
                    <PersonasDeLaEmpresa
                      tenantId={tenantId}
                      puedeGestionar={puede("reseller.company.users.manage") && !empresa.suspendedAt}
                    />
                  </Tarjeta>
                )}
              </div>

              <div className="ficha__columna">
                <Tarjeta>
                  <TarjetaCabecera titulo={t("fichaEmpresa.datos")} />
                  <dl className="ficha__datos ficha__datos--lista">
                    <Dato etiqueta={t("altaEmpresa.razonSocial")} valor={empresa.businessTitle} />
                    <Dato etiqueta={t("altaEmpresa.ruc")} valor={empresa.taxNumber} />
                    <Dato etiqueta={t("altaEmpresa.correo")} valor={empresa.email} />
                    <Dato etiqueta={t("altaEmpresa.telefono")} valor={empresa.phone} />
                    <Dato
                      etiqueta={t("altaEmpresa.direccion")}
                      valor={[empresa.address, empresa.city, empresa.country].filter(Boolean).join(", ") || null}
                    />
                    <Dato etiqueta={t("fichaEmpresa.zonaHoraria")} valor={empresa.timezone} />
                    <Dato etiqueta={t("fichaEmpresa.alta")} valor={fecha(empresa.createdAt)} />
                  </dl>
                </Tarjeta>

                {veCobro && estadoCobro && cobro && (
                  <CobroDeLaEmpresa
                    empresa={estadoCobro}
                    datos={cobro}
                    gestiona={puede("reseller.billing.manage")}
                    onCambio={() => { void cargarCobro(); }}
                  />
                )}

                {empresa.suspendedAt && (
                  <Tarjeta>
                    <TarjetaCabecera titulo={t("fichaEmpresa.suspendidaTitulo")} />
                    <p className="ficha__nota">
                      {t("fichaEmpresa.suspendidaNota", { f: fecha(empresa.suspendedAt) })}
                    </p>
                  </Tarjeta>
                )}

                {!empresa.suspendedAt && <ModulosDeLaEmpresa tenantId={tenantId} />}
              </div>
            </div>
          </>
        )}

        {empresa && editando && (
          <form onSubmit={guardar}>
            <Tarjeta>
              <TarjetaCabecera
                titulo={t("fichaEmpresa.corregir")}
                nota={t("fichaEmpresa.corregirNota")}
              />
              <div className="ficha__campos">
                <Campo etiqueta={t("altaEmpresa.nombre")} value={campo("name")}
                  onChange={(e) => setBorrador((b) => ({ ...b, name: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.razonSocial")} value={campo("businessTitle")}
                  onChange={(e) => setBorrador((b) => ({ ...b, businessTitle: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.correo")} type="email" value={campo("email")}
                  onChange={(e) => setBorrador((b) => ({ ...b, email: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.telefono")} value={campo("phone")}
                  onChange={(e) => setBorrador((b) => ({ ...b, phone: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.pais")} value={campo("country")}
                  onChange={(e) => setBorrador((b) => ({ ...b, country: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.ciudad")} value={campo("city")}
                  onChange={(e) => setBorrador((b) => ({ ...b, city: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.direccion")} value={campo("address")}
                  onChange={(e) => setBorrador((b) => ({ ...b, address: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.ruc")} value={campo("taxNumber")}
                  onChange={(e) => setBorrador((b) => ({ ...b, taxNumber: e.target.value }))} />
              </div>

              {error && <p role="alert" className="ficha__error">{error}</p>}

              <div className="ficha__pie">
                <Boton variante="fantasma" onClick={() => { setEditando(false); setBorrador({}); }}>
                  {t("comun.cancelar")}
                </Boton>
                <Boton type="submit" cargando={guardando}>{t("comun.guardar")}</Boton>
              </div>
            </Tarjeta>
          </form>
        )}

        <p className="ficha__estado" role="status" aria-live="polite">{aviso || ""}</p>
      </EstadoDeDatos>
    </div>
  );
}

export default CompanyDetail;
