import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Boton, Campo, EstadoDeDatos, Icono, Pildora, type Tono } from "@/components/cristal";
import { fechaCorta, precio } from "@/lib/dinero";
import {
  cobroAEmpresasService, type CobroAEmpresas, type EmpresaCobrada, type PasarelaDelCatalogo,
  type PreciosAEmpresas,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import "./CobrosAEmpresas.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * COBROS A TUS EMPRESAS
 *
 * El socio cobra a SUS empresas con SU pasarela: el dinero va directo a su
 * cuenta, sin pasar por la plataforma. Aquí conecta la pasarela, fija sus
 * precios (nunca por debajo del mínimo de su contrato) y ve cómo va cada
 * empresa: en prueba, al día, en mora o pausada.
 *
 * Las credenciales se escriben una vez y no vuelven: el servidor nunca las
 * devuelve, así que para cambiarlas se escriben de nuevo.
 * ════════════════════════════════════════════════════════════════════════════
 */

const ESTADO: Record<string, { tono: Tono; texto: Clave }> = {
  trialing: { tono: "neutro", texto: "cobros.estadoPrueba" },
  active: { tono: "ok", texto: "cobros.estadoAlDia" },
  past_due: { tono: "aviso", texto: "cobros.estadoMora" },
  paused: { tono: "peligro", texto: "cobros.estadoPausada" },
  exempt: { tono: "neutro", texto: "cobros.estadoExenta" },
};

const PAISES: Record<string, string> = {
  US: "🇺🇸", MX: "🇲🇽", PE: "🇵🇪", EC: "🇪🇨", PA: "🇵🇦", AR: "🇦🇷",
};

/** «12.50» → 1250. Vacío → null. */
function aCentavos(v: string): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Math.round(Number(s) * 100);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}
const aTexto = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

export function CobrosAEmpresas() {
  const t = useT();
  const { puede } = useResellerAuth();
  const gestiona = puede("reseller.billing.manage");
  const [datos, setDatos] = useState<CobroAEmpresas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await cobroAEmpresasService.leer());
    } catch (e: any) {
      setError(e?.message || t("cobros.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const moneda = datos?.pricing?.currency ?? datos?.minimums.currency ?? "USD";
  const activo = datos?.gateway?.status === "connected" && !!datos?.pricing;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("cobros.titulo")}</h1>
          <p className="cabecera__sub">{t("cobros.sub")}</p>
        </div>
      </header>

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {datos && (
          <div className="cobros">
            <div className="cobros__resumen">
              <Ficha etiqueta={t("cobros.cobrado30")} valor={precio(datos.collectedLast30Cents, moneda)} />
              <Ficha etiqueta={t("cobros.pendiente")} valor={precio(datos.outstandingCents, moneda)} />
              <Ficha
                etiqueta={t("cobros.estado")}
                valor={activo ? t("cobros.activo") : t("cobros.inactivo")}
                nota={activo ? t("cobros.activoNota") : t("cobros.inactivoNota")}
              />
            </div>

            <Pasarela datos={datos} gestiona={gestiona} onCambio={cargar} />
            <Precios datos={datos} gestiona={gestiona} onCambio={cargar} />
            <Empresas datos={datos} gestiona={gestiona} onCambio={cargar} />

            <p className="cobros__legal">
              <Icono nombre="libro" tamano={15} />
              {t("cobros.noFiscal")}
            </p>
          </div>
        )}
      </EstadoDeDatos>
    </>
  );
}

function Ficha({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <section className="cobros-ficha">
      <span className="cobros-ficha__etiqueta">{etiqueta}</span>
      <span className="cobros-ficha__valor">{valor}</span>
      {nota && <span className="cobros-ficha__nota">{nota}</span>}
    </section>
  );
}

/* ── 1. La pasarela ──────────────────────────────────────────────────────── */

function Pasarela({ datos, gestiona, onCambio }: { datos: CobroAEmpresas; gestiona: boolean; onCambio: () => void }) {
  const t = useT();
  const gw = datos.gateway;
  const [eligiendo, setEligiendo] = useState<PasarelaDelCatalogo | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conectar = async () => {
    if (!eligiendo) return;
    setEnviando(true);
    setError(null);
    try {
      await cobroAEmpresasService.conectar(eligiendo.provider, valores);
      setEligiendo(null);
      setValores({});
      onCambio();
    } catch (e: any) {
      setError(e?.message || t("cobros.noConecto"));
    } finally {
      setEnviando(false);
    }
  };

  const desconectar = async () => {
    setEnviando(true);
    try { await cobroAEmpresasService.desconectar(); onCambio(); } finally { setEnviando(false); }
  };

  return (
    <section className="bloque" aria-labelledby="cobros-pasarela">
      <header className="bloque__cabecera">
        <h2 id="cobros-pasarela" className="bloque__titulo">{t("cobros.pasarelaTitulo")}</h2>
      </header>
      <p className="bloque__nota">{t("cobros.pasarelaSub")}</p>

      {gw && !eligiendo && (
        <div className="cobros-pasarela">
          <span className="cobros-pasarela__icono"><Icono nombre="tarjeta" tamano={20} /></span>
          <span className="cobros-pasarela__datos">
            <strong>{gw.name}</strong>
            <span>{gw.accountLabel ?? "—"}</span>
          </span>
          <Pildora tono={gw.status === "connected" ? "ok" : "peligro"}>
            {t(gw.status === "connected" ? "cobros.conectada" : "cobros.conError")}
          </Pildora>
          <Pildora tono={gw.mode === "live" ? "ok" : "aviso"}>
            {t(gw.mode === "live" ? "cobros.modoReal" : "cobros.modoPrueba")}
          </Pildora>
          {gestiona && (
            <span className="cobros-pasarela__acciones">
              <Boton variante="suave" onClick={() => setEligiendo(datos.catalog.find((c) => c.provider === gw.provider) ?? null)}>
                {t("cobros.cambiarClaves")}
              </Boton>
              <Boton variante="fantasma" onClick={desconectar} disabled={enviando}>{t("cobros.desconectar")}</Boton>
            </span>
          )}
        </div>
      )}

      {(!gw || eligiendo) && (
        <div className="cobros-catalogo">
          {datos.catalog.map((c) => (
            <button
              key={c.provider}
              type="button"
              className={`cobros-opcion${eligiendo?.provider === c.provider ? " cobros-opcion--elegida" : ""}`}
              disabled={!c.available || !gestiona}
              onClick={() => { setEligiendo(c); setValores({}); setError(null); }}
            >
              <strong>{c.name}</strong>
              <span className="cobros-opcion__paises">{c.countries.map((p) => PAISES[p] ?? p).join(" ")}</span>
              {!c.available && <span className="cobros-opcion__pronto">{t("cobros.proximamente")}</span>}
            </button>
          ))}
        </div>
      )}

      {eligiendo && (
        <div className="cobros-formulario">
          {eligiendo.fields.map((f) => (
            <Campo
              key={f.clave}
              etiqueta={f.etiqueta}
              type={f.secreto ? "password" : "text"}
              revelable={f.secreto}
              autoComplete="off"
              value={valores[f.clave] ?? ""}
              onChange={(e) => setValores((v) => ({ ...v, [f.clave]: e.target.value }))}
            />
          ))}
          <p className="bloque__nota">{t("cobros.clavesNota")}</p>
          {error && <p role="alert" className="cobros__error">{error}</p>}
          <div className="cobros-formulario__botones">
            <Boton variante="fantasma" onClick={() => setEligiendo(null)} disabled={enviando}>{t("comun.cancelar")}</Boton>
            <Boton onClick={conectar} cargando={enviando}>{t("cobros.conectar")}</Boton>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── 2. Los precios ──────────────────────────────────────────────────────── */

function Precios({ datos, gestiona, onCambio }: { datos: CobroAEmpresas; gestiona: boolean; onCambio: () => void }) {
  const t = useT();
  const p = datos.pricing;
  const min = datos.minimums;
  const [f, setF] = useState(() => ({
    currency: p?.currency ?? min.currency,
    perUser: aTexto(p?.perUserCents ?? min.perUserCents),
    monthly: aTexto(p?.monthlyFeeCents ?? min.monthlyFeeCents),
    setup: aTexto(p?.setupFeeCents ?? 0),
    trialDays: String(p?.trialDays ?? 14),
    graceDays: String(p?.graceDays ?? 7),
  }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const guardar = async () => {
    setError(null);
    setAviso(null);
    const cuerpo: PreciosAEmpresas = {
      currency: f.currency.toUpperCase(),
      perUserCents: aCentavos(f.perUser) ?? 0,
      monthlyFeeCents: aCentavos(f.monthly) ?? 0,
      setupFeeCents: aCentavos(f.setup) ?? 0,
      trialDays: Number(f.trialDays) || 0,
      graceDays: Number(f.graceDays) || 0,
    };
    if ([cuerpo.perUserCents, cuerpo.monthlyFeeCents, cuerpo.setupFeeCents].some((n) => Number.isNaN(n))) {
      setError(t("cobros.importeNoValido"));
      return;
    }
    setEnviando(true);
    try {
      await cobroAEmpresasService.guardarPrecios(cuerpo);
      setAviso(t("cobros.preciosGuardados"));
      onCambio();
    } catch (e: any) {
      setError(e?.message || t("cobros.noGuardo"));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value })),
    disabled: !gestiona,
  });

  return (
    <section className="bloque" aria-labelledby="cobros-precios">
      <header className="bloque__cabecera">
        <h2 id="cobros-precios" className="bloque__titulo">{t("cobros.preciosTitulo")}</h2>
      </header>
      <p className="bloque__nota">{t("cobros.preciosSub")}</p>

      <div className="cobros-precios">
        <Campo etiqueta={t("cobros.porUsuario")} inputMode="decimal" {...campo("perUser")}
          ayuda={t("cobros.minimo", { p: precio(min.perUserCents, min.currency) })} />
        <Campo etiqueta={t("cobros.cuotaMensual")} inputMode="decimal" {...campo("monthly")}
          ayuda={min.monthlyFeeCents > 0 ? t("cobros.minimo", { p: precio(min.monthlyFeeCents, min.currency) }) : t("cobros.sinMinimo")} />
        <Campo etiqueta={t("cobros.cuotaAlta")} inputMode="decimal" {...campo("setup")} ayuda={t("cobros.cuotaAltaAyuda")} />
        <Campo etiqueta={t("cobros.moneda")} maxLength={3} {...campo("currency")} />
        <Campo etiqueta={t("cobros.diasPrueba")} inputMode="numeric" {...campo("trialDays")} />
        <Campo etiqueta={t("cobros.diasGracia")} inputMode="numeric" {...campo("graceDays")} ayuda={t("cobros.diasGraciaAyuda")} />
      </div>

      {error && <p role="alert" className="cobros__error">{error}</p>}
      {aviso && <p role="status" className="cobros__aviso">{aviso}</p>}
      {gestiona && (
        <div className="cobros-formulario__botones">
          <Boton onClick={guardar} cargando={enviando}>{t("cobros.guardarPrecios")}</Boton>
        </div>
      )}
    </section>
  );
}

/* ── 3. Las empresas ─────────────────────────────────────────────────────── */

function Empresas({ datos, gestiona, onCambio }: { datos: CobroAEmpresas; gestiona: boolean; onCambio: () => void }) {
  const t = useT();
  const [abierta, setAbierta] = useState<string | null>(null);
  const moneda = datos.pricing?.currency ?? datos.minimums.currency;

  return (
    <section className="bloque" aria-labelledby="cobros-empresas">
      <header className="bloque__cabecera">
        <h2 id="cobros-empresas" className="bloque__titulo">{t("cobros.empresasTitulo")}</h2>
      </header>
      {datos.companies.length === 0 ? (
        <p className="bloque__vacio">{t("empresas.vacio")}</p>
      ) : (
        <div className="cobros-tabla" role="table" aria-label={t("cobros.empresasTitulo")}>
          <div className="cobros-tabla__fila cobros-tabla__fila--cabecera" role="row">
            <span role="columnheader">{t("cobros.colEmpresa")}</span>
            <span role="columnheader">{t("cobros.colEstado")}</span>
            <span role="columnheader">{t("cobros.colFecha")}</span>
            <span role="columnheader">{t("cobros.colTarjeta")}</span>
            <span role="columnheader" className="cobros-tabla__derecha">{t("cobros.colPendiente")}</span>
          </div>
          {datos.companies.map((e) => {
            const est = ESTADO[e.status] ?? ESTADO.trialing;
            return (
              <div key={e.tenantId} className="cobros-tabla__grupo">
                <button
                  type="button"
                  role="row"
                  className={`cobros-tabla__fila${abierta === e.tenantId ? " cobros-tabla__fila--abierta" : ""}`}
                  onClick={() => setAbierta((a) => (a === e.tenantId ? null : e.tenantId))}
                  aria-expanded={abierta === e.tenantId}
                >
                  <span role="cell" className="cobros-tabla__nombre">{e.name || t("empresas.sinNombre")}</span>
                  <span role="cell"><Pildora tono={est.tono}>{t(est.texto)}</Pildora></span>
                  <span role="cell">
                    {e.anchorAt
                      ? t("cobros.renuevaDia", { d: Number(e.anchorAt.slice(8, 10)) })
                      : e.trialEndsAt ? t("cobros.pruebaHasta", { f: fechaCorta(e.trialEndsAt) }) : "—"}
                  </span>
                  <span role="cell">{t(e.hasCard ? "cobros.conTarjeta" : "cobros.sinTarjeta")}</span>
                  <span role="cell" className="cobros-tabla__derecha">{precio(e.outstandingCents, moneda)}</span>
                </button>
                {abierta === e.tenantId && (
                  <Ajuste empresa={e} datos={datos} gestiona={gestiona} onCambio={onCambio} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Ajuste({ empresa, datos, gestiona, onCambio }: {
  empresa: EmpresaCobrada; datos: CobroAEmpresas; gestiona: boolean; onCambio: () => void;
}) {
  const t = useT();
  const o = empresa.override;
  const [f, setF] = useState({
    perUser: aTexto(o?.perUserCents ?? null),
    monthly: aTexto(o?.monthlyFeeCents ?? null),
    setup: aTexto(o?.setupFeeCents ?? null),
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (extra: { exempt?: boolean } = {}) => {
    setEnviando(true);
    setError(null);
    try {
      await cobroAEmpresasService.ajustarEmpresa(empresa.tenantId, {
        perUserCents: aCentavos(f.perUser),
        monthlyFeeCents: aCentavos(f.monthly),
        setupFeeCents: aCentavos(f.setup),
        ...extra,
      });
      onCambio();
    } catch (e: any) {
      setError(e?.message || t("cobros.noGuardo"));
    } finally {
      setEnviando(false);
    }
  };

  const base = datos.pricing;
  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value })),
    disabled: !gestiona,
    inputMode: "decimal" as const,
  });

  return (
    <div className="cobros-ajuste">
      <p className="bloque__nota">{t("cobros.ajusteNota")}</p>
      <div className="cobros-precios">
        <Campo etiqueta={t("cobros.porUsuario")} placeholder={aTexto(base?.perUserCents)} {...campo("perUser")} />
        <Campo etiqueta={t("cobros.cuotaMensual")} placeholder={aTexto(base?.monthlyFeeCents)} {...campo("monthly")} />
        <Campo etiqueta={t("cobros.cuotaAlta")} placeholder={aTexto(base?.setupFeeCents)} {...campo("setup")} />
      </div>
      {error && <p role="alert" className="cobros__error">{error}</p>}
      {gestiona && (
        <div className="cobros-formulario__botones">
          <Link to={`/companies/${empresa.tenantId}`} className="bloque__enlace">{t("cobros.verEmpresa")}</Link>
          <Boton variante="fantasma" onClick={() => guardar({ exempt: empresa.status !== "exempt" })} disabled={enviando}>
            {t(empresa.status === "exempt" ? "cobros.quitarExencion" : "cobros.eximir")}
          </Boton>
          <Boton onClick={() => guardar()} cargando={enviando}>{t("cobros.guardarAjuste")}</Boton>
        </div>
      )}
    </div>
  );
}

export default CobrosAEmpresas;
