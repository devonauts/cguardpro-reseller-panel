import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Boton, Campo, Confirmar, EstadoDeDatos, Icono, Pildora, type Tono } from "@/components/cristal";
import { fechaCorta, LOCALE_DE_MONEDA, precio, separadores } from "@/lib/dinero";
import { aCentavos } from "@/lib/importeEscrito";
import { LogoDePasarela, marcaDePasarela, nombresDePaises } from "@/components/cobros/LogoDePasarela";
import {
  cobroAEmpresasService, type CobroAEmpresas, type EmpresaCobrada, type PasarelaDelCatalogo,
  type PreciosAEmpresas,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { etiquetaIntl } from "@/i18n/idioma";
import { tOr } from "@/i18n/idioma";
import { FormatoDeFacturas } from "@/components/cobros/FormatoDeFacturas";
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

/** Cents → the text of an input, with the decimal mark of THAT currency («12,50» in ARS). */
function aTexto(c: number | null | undefined, moneda = "USD"): string {
  if (c == null) return "";
  const abs = Math.abs(Math.trunc(c));
  return `${c < 0 ? "-" : ""}${Math.floor(abs / 100)}${separadores(moneda).decimal}${String(abs % 100).padStart(2, "0")}`;
}

/** The partner's billing currency: its registration country's, from the server. */
function monedaDe(datos: CobroAEmpresas): string {
  return datos.currency ?? datos.currencies?.[0] ?? datos.pricing?.currency ?? datos.minimums.currency;
}

/** «COP» → «peso colombiano», in the panel's language. */
function nombreDeMoneda(codigo: string): string {
  try {
    const n = new Intl.DisplayNames([etiquetaIntl()], { type: "currency" }).of(codigo) ?? codigo;
    return n.charAt(0).toUpperCase() + n.slice(1);
  } catch {
    return codigo;
  }
}

/** A plain number in the currency's own punctuation (for exchange rates). */
function numeroEn(moneda: string, n: number, decimales: number): string {
  try {
    return new Intl.NumberFormat(LOCALE_DE_MONEDA[moneda] ?? "en-US", {
      minimumFractionDigits: decimales, maximumFractionDigits: decimales,
    }).format(n);
  } catch {
    return n.toFixed(decimales);
  }
}

export function CobrosAEmpresas() {
  const t = useT();
  const { puede } = useResellerAuth();
  const gestiona = puede("reseller.billing.manage");
  const [datos, setDatos] = useState<CobroAEmpresas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* After a save the page refreshes QUIETLY: a loud reload unmounted every
     section, so "Prices saved." vanished at once and an open company row
     collapsed. */
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) { setCargando(true); setError(null); }
    try {
      setDatos(await cobroAEmpresasService.leer());
    } catch (e: any) {
      if (!silencioso) setError(e?.message || t("cobros.noCargo"));
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [t]);
  const refrescar = useCallback(() => { void cargar(true); }, [cargar]);

  useEffect(() => { cargar(); }, [cargar]);

  const moneda = datos ? monedaDe(datos) : "USD";
  const activo = datos?.gateway?.status === "connected" && !!datos?.pricing;
  const enPrueba = activo && datos?.gateway?.mode !== "live";

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("cobros.titulo")}</h1>
          <p className="cabecera__sub">{t("cobros.sub")}</p>
        </div>
      </header>

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={() => cargar()}>
        {datos && (
          <div className="cobros">
            {/* Aquí sólo se CONFIGURA. Lo que el socio gana —cobrado, por cobrar y
                cada factura— vive en «Ingresos» (decisión del dueño 2026-09-28:
                «deja netamente ingresos para la página de lo que van generando»). */}
            <div className="cobros__resumen cobros__resumen--estado">
              <Ficha
                etiqueta={t("cobros.estado")}
                valor={activo ? t(enPrueba ? "cobros.activoPrueba" : "cobros.activo") : t("cobros.inactivo")}
                nota={activo ? t(enPrueba ? "cobros.activoPruebaNota" : "cobros.activoNota") : t("cobros.inactivoNota")}
              />
              <Link to="/revenue" className="cobros-ficha cobros-ficha--enlace">
                <span className="cobros-ficha__etiqueta">{t("nav.ingresos")}</span>
                <span className="cobros-ficha__valor cobros-ficha__valor--enlace">
                  {t("cobros.verIngresos")} <Icono nombre="flecha" tamano={16} />
                </span>
              </Link>
            </div>

            <Pasarela datos={datos} gestiona={gestiona} onCambio={refrescar} />
            <Precios datos={datos} gestiona={gestiona} onCambio={refrescar} />
            <FormatoDeFacturas gestiona={gestiona} />
            <Empresas datos={datos} gestiona={gestiona} onCambio={refrescar} />

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

  const activarAvisos = async () => {
    setEnviando(true);
    setError(null);
    try {
      await cobroAEmpresasService.activarAvisos();
      onCambio();
    } catch (e: any) {
      setError(e?.message || t("cobros.noConecto"));
    } finally {
      setEnviando(false);
    }
  };

  const desconectar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await cobroAEmpresasService.desconectar();
      onCambio();
    } catch (e: any) {
      // Used to fail silently (try/finally with no catch).
      setError(e?.message || t("cobros.noDesconecto"));
    } finally {
      setEnviando(false);
    }
  };

  const marcaElegida = eligiendo ? marcaDePasarela(eligiendo.provider) : null;
  /* What the pasted keys say about themselves, before anything is sent: a
     live key pasted while testing, or a secret key in the publishable box, is
     caught here instead of after a failed verification. */
  const problemaDe = (clave: string): string | null => {
    const v = (valores[clave] ?? "").trim();
    const prefijos = marcaElegida?.prefijos?.[clave];
    if (!v || !prefijos || prefijos.some((x) => v.startsWith(x))) return null;
    return t("cobros.claveNoCoincide", { p: prefijos.map((x) => `${x}…`).join(" / ") });
  };
  const modoDeLasClaves = (() => {
    const pre = marcaElegida?.prefijoDePrueba;
    const escritas = Object.values(valores).map((v) => v.trim()).filter(Boolean);
    if (!pre || !escritas.length) return null;
    return escritas.some((v) => v.includes(pre)) ? "test" : "live";
  })();
  const hayProblemas = !!eligiendo?.fields.some((f) => problemaDe(f.clave));
  const marcaConectada = gw ? marcaDePasarela(gw.provider) : null;
  const enlacePanel = gw && marcaConectada
    ? (gw.mode !== "live" && marcaConectada.panelDePrueba) || marcaConectada.panel
    : undefined;

  return (
    <section className="bloque" aria-labelledby="cobros-pasarela">
      <header className="bloque__cabecera">
        <h2 id="cobros-pasarela" className="bloque__titulo">{t("cobros.pasarelaTitulo")}</h2>
      </header>
      <p className="bloque__nota">{t("cobros.pasarelaSub")}</p>

      {gw && !eligiendo && (
        <div className="cobros-pasarela">
          <LogoDePasarela provider={gw.provider} nombre={gw.name} tamano={44} />
          <span className="cobros-pasarela__datos">
            <span className="cobros-pasarela__nombre">
              <strong>{gw.name}</strong>
              <Pildora tono={gw.status === "connected" ? "ok" : gw.status === "pending" ? "aviso" : "peligro"}>
                {t(gw.status === "connected" ? "cobros.conectada" : gw.status === "pending" ? "cobros.pendienteVerificar" : "cobros.conError")}
              </Pildora>
              <Pildora tono={gw.mode === "live" ? "ok" : "aviso"}>
                {t(gw.mode === "live" ? "cobros.modoReal" : "cobros.modoPrueba")}
              </Pildora>
            </span>
            <span>{gw.accountLabel ?? "—"}</span>
          </span>
          <span className="cobros-pasarela__acciones">
            {enlacePanel && (
              <a className="btn btn--suave" href={enlacePanel} target="_blank" rel="noopener noreferrer">
                {t("cobros.abrirPanel", { n: gw.name })} <span aria-hidden="true">↗</span>
              </a>
            )}
            {gestiona && (
              <>
                <Boton variante="suave" onClick={() => setEligiendo(datos.catalog.find((c) => c.provider === gw.provider) ?? null)}>
                  {t("cobros.cambiarClaves")}
                </Boton>
                <Confirmar
                  variante="fantasma"
                  disabled={enviando}
                  pregunta={t("cobros.desconectarPregunta")}
                  onConfirmar={desconectar}
                >
                  {t("cobros.desconectar")}
                </Confirmar>
              </>
            )}
          </span>
        </div>
      )}
      {gw && gw.status === "connected" && !eligiendo && gw.events && (
        <div className={`cobros-avisos${gw.events.status === "active" ? "" : " cobros-avisos--falta"}`}>
          <Icono nombre={gw.events.status === "active" ? "visto" : "puntos"} tamano={15} />
          <span className="cobros-avisos__texto">
            {gw.events.status === "active"
              ? t("cobros.avisosActivos", { n: gw.name })
              : gw.events.error
                ? gw.events.error === "webhook_permission"
                  ? t("cobros.avisosPermiso", { n: gw.name })
                  : t("cobros.avisosFaltanPorque", { m: gw.events.error })
                : t("cobros.avisosFaltan")}
            {gw.events.status === "active" && gw.events.lastAt && (
              <span className="cobros-avisos__ultimo"> · {t("cobros.avisosUltimo", { f: fechaCorta(gw.events.lastAt) })}</span>
            )}
          </span>
          {gestiona && gw.events.status !== "active" && (
            <Boton variante="suave" onClick={activarAvisos} cargando={enviando}>{t("cobros.avisosActivar")}</Boton>
          )}
        </div>
      )}
      {/* La pasarela conectada que DEJÓ de aceptar sus claves: lo dice el
          motor al fallar un cobro. Nunca el texto de Stripe. */}
      {gw && gw.status === "connected" && /^gateway_(auth|request)/.test(gw.lastError || "") && !eligiendo && (
        <p role="alert" className="cobros__error">
          {t(/^gateway_auth/.test(gw.lastError || "") ? "fallo.clavesDeLaPasarela" : "fallo.configuracionDeLaPasarela")}
        </p>
      )}
      {gw && gw.status !== "connected" && gw.lastError && !eligiendo && (
        <p role="alert" className="cobros__error">{t("fallo.pasarelaNoConectada")}</p>
      )}
      {error && !eligiendo && <p role="alert" className="cobros__error">{error}</p>}

      {(!gw || eligiendo) && (
        <div className="cobros-catalogo">
          {/* Only gateways that work today: nothing "coming soon" is shown. */}
          {datos.catalog.filter((c) => c.available).map((c) => (
            <button
              key={c.provider}
              type="button"
              aria-pressed={eligiendo?.provider === c.provider}
              className={`cobros-opcion${eligiendo?.provider === c.provider ? " cobros-opcion--elegida" : ""}`}
              disabled={!gestiona}
              onClick={() => { setEligiendo(c); setValores({}); setError(null); }}
            >
              <LogoDePasarela provider={c.provider} nombre={c.name} />
              <span className="cobros-opcion__texto">
                <strong>{c.name}</strong>
                <span>{tOr(`cobros.pasarelaDesc.${c.provider}`, "")}</span>
                {c.countries.length > 0 && (
                  <span className="cobros-opcion__paises">
                    {t("cobros.disponibleEn", { l: nombresDePaises(c.countries) })}
                  </span>
                )}
              </span>
              {eligiendo?.provider === c.provider && (
                <span className="cobros-opcion__visto" aria-hidden="true"><Icono nombre="visto" tamano={16} /></span>
              )}
            </button>
          ))}
        </div>
      )}

      {eligiendo && (
        <div className="cobros-formulario">
          <div className="cobros-formulario__cabecera">
            <LogoDePasarela provider={eligiendo.provider} nombre={eligiendo.name} tamano={32} />
            <strong>{t("cobros.conectaTu", { n: eligiendo.name })}</strong>
          </div>
          {marcaElegida?.claves && (
            <ol className="cobros-pasos">
              <li>
                {t("cobros.paso1", { n: eligiendo.name })}{" "}
                <a href={marcaElegida.claves} target="_blank" rel="noopener noreferrer">
                  {t("cobros.paso1Enlace")} <span aria-hidden="true">↗</span>
                </a>
              </li>
              <li>{t("cobros.paso2")}</li>
              <li>{t("cobros.paso3")}</li>
            </ol>
          )}
          {eligiendo.fields.map((f) => (
            <Campo
              key={f.clave}
              etiqueta={tOr(`cobros.campo.${f.clave}`, f.etiqueta)}
              type={f.secreto ? "password" : "text"}
              revelable={f.secreto}
              autoComplete="off"
              spellCheck={false}
              value={valores[f.clave] ?? ""}
              error={problemaDe(f.clave)}
              onChange={(e) => setValores((v) => ({ ...v, [f.clave]: e.target.value }))}
            />
          ))}
          {modoDeLasClaves && (
            <p className={modoDeLasClaves === "test" ? "cobros__alerta" : "cobros__aviso"}>
              {t(modoDeLasClaves === "test" ? "cobros.clavesDePrueba" : "cobros.clavesReales")}
            </p>
          )}
          <p className="bloque__nota cobros__cifradas">
            <Icono nombre="candado" tamano={14} /> {t("cobros.clavesNota")}
          </p>
          {/* Saved cards belong to the gateway ACCOUNT: another account cannot
              charge them. Said before they swap keys, not after the failures. */}
          {gw && <p className="cobros__alerta">{t("cobros.otraCuentaAviso")}</p>}
          {error && <p role="alert" className="cobros__error">{error}</p>}
          <div className="cobros-formulario__botones">
            <Boton variante="fantasma" onClick={() => setEligiendo(null)} disabled={enviando}>{t("comun.cancelar")}</Boton>
            <Boton onClick={conectar} cargando={enviando} disabled={hayProblemas}>{t("cobros.conectar")}</Boton>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── 2. Los precios ──────────────────────────────────────────────────────── */

/**
 * Los precios del socio, EN SU MONEDA, y cómo cuadran con lo que paga a la
 * plataforma en la del contrato. Todo se convierte al tipo de REFERENCIA del
 * día que manda el servidor: lo que recibe de verdad lo fija su pasarela.
 */
function Precios({ datos, gestiona, onCambio }: { datos: CobroAEmpresas; gestiona: boolean; onCambio: () => void }) {
  const t = useT();
  const p = datos.pricing;
  const min = datos.minimums;
  const fx = datos.fx;
  const base = fx?.base ?? min.currency;
  /* ONE currency, not a choice: the one of the country the partner registered
     with (the server decides it; see cobroAEmpresas.MONEDA_POR_PAIS). */
  const moneda = monedaDe(datos);
  const tasaDeLaMoneda = moneda === base ? 1 : (fx?.rates?.[moneda] ?? null);
  const [f, setF] = useState(() => ({
    currency: moneda,
    // With no prices yet, the suggestion is the minimum IN THEIR currency.
    perUser: aTexto(p?.perUserCents ?? (tasaDeLaMoneda ? Math.ceil(min.perUserCents * tasaDeLaMoneda) : null), moneda),
    setup: aTexto(p?.setupFeeCents ?? 0, moneda),
    trialDays: String(p?.trialDays ?? 14),
    graceDays: String(p?.graceDays ?? 7),
  }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /* La conversión, mientras escribe. `tasa` = unidades de su moneda por 1 del contrato. */
  const tasa = f.currency === base ? 1 : (fx?.rates?.[f.currency] ?? null);
  const aBase = (c: number | null) => (c == null || !tasa ? null : Math.round(c / tasa));
  const enSuMoneda = (c: number) => (tasa ? Math.ceil(c * tasa) : null);
  const minPorUsuario = enSuMoneda(min.perUserCents);
  const otraMoneda = f.currency !== base;
  // Con dos monedas en pantalla, siempre con su código: «MXN 60», «USD 2.50».
  const $b = (c: number | null) => (c == null ? "—" : precio(c, base, otraMoneda));
  const $m = (c: number | null) => (c == null ? "—" : precio(c, f.currency, otraMoneda));

  const porUsuario = aCentavos(f.perUser);
  const plataforma = datos.platform;
  const margen = porUsuario != null && !Number.isNaN(porUsuario) && plataforma && tasa
    ? aBase(porUsuario)! - plataforma.perUserCents : null;

  const guardar = async () => {
    setError(null);
    setAviso(null);
    /* Whole days only: "abc" used to become 0, and 0 grace days pauses a
       company the moment a charge fails. */
    const dias = (v: string) => (/^\d{1,3}$/.test(v.trim()) ? Number(v.trim()) : NaN);
    const trialDays = dias(f.trialDays);
    const graceDays = dias(f.graceDays);
    if (Number.isNaN(trialDays) || Number.isNaN(graceDays)) {
      setError(t("cobros.diasNoValidos"));
      return;
    }
    const cuerpo: PreciosAEmpresas = {
      currency: f.currency,
      perUserCents: porUsuario ?? 0,
      // Partners never charge a monthly fee: the only one is the platform's.
      monthlyFeeCents: 0,
      setupFeeCents: aCentavos(f.setup) ?? 0,
      trialDays,
      graceDays,
    };
    if ([cuerpo.perUserCents, cuerpo.setupFeeCents].some((n) => Number.isNaN(n))) {
      setError(t("cobros.importeNoValido", { e: aTexto(150050, f.currency) }));
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

  /* «Mínimo: MXN 45.00 (USD 2.50)» — en su moneda, y en la del contrato si es otra. */
  const ayudaMinimo = (enMoneda: number | null, enBase: number) => (
    enBase <= 0 ? t("cobros.sinMinimo")
      : otraMoneda
        ? t("cobros.minimoConvertido", { p: $m(enMoneda), b: $b(enBase) })
        : t("cobros.minimo", { p: $b(enBase) })
  );
  const equivalente = (c: number | null) => (otraMoneda && c != null && !Number.isNaN(c) ? ` · ≈ ${$b(aBase(c))}` : "");

  return (
    <section className="bloque" aria-labelledby="cobros-precios">
      <header className="bloque__cabecera">
        <h2 id="cobros-precios" className="bloque__titulo">{t("cobros.preciosTitulo")}</h2>
      </header>
      <p className="bloque__nota">{t("cobros.preciosSub")}</p>

      {datos.belowMinimum && (
        <p role="alert" className="cobros__alerta">{t("cobros.debajoDelMinimo")}</p>
      )}

      <div className="cobros-precios">
        <div className="cobros-moneda">
          <span className="cobros-moneda__etiqueta">{t("cobros.moneda")}</span>
          <span className="cobros-moneda__fija">
            <strong>{moneda}</strong> · {nombreDeMoneda(moneda)}
          </span>
          <span className="cobros-moneda__tasa">{t("cobros.monedaDelRegistro")}</span>
          {otraMoneda && (
            <span className="cobros-moneda__tasa">
              {tasa ? t("cobros.tasa", { b: base, x: numeroEn(f.currency, tasa, tasa >= 100 ? 0 : 2), m: f.currency }) : t("cobros.sinTasa")}
            </span>
          )}
        </div>
        <Campo etiqueta={t("cobros.porUsuario")} inputMode="decimal" {...campo("perUser")}
          ayuda={ayudaMinimo(minPorUsuario, min.perUserCents) + equivalente(porUsuario)} />
        <Campo etiqueta={t("cobros.cuotaAlta")} inputMode="decimal" {...campo("setup")}
          ayuda={t("cobros.cuotaAltaAyuda") + equivalente(aCentavos(f.setup))} />
        <Campo etiqueta={t("cobros.diasPrueba")} inputMode="numeric" {...campo("trialDays")} />
        <Campo etiqueta={t("cobros.diasGracia")} inputMode="numeric" {...campo("graceDays")} ayuda={t("cobros.diasGraciaAyuda")} />
      </div>

      {/* ── CÓMO CUADRA ─────────────────────────────────────────────────── */}
      {plataforma && (
        <div className="cuadre">
          <h3 className="cuadre__titulo">{t("cobros.cuadreTitulo")}</h3>
          <ul className="cuadre__lineas">
            <li>
              <span>{t("cobros.cuadreCobras")}</span>
              <strong>{$m(porUsuario)}{otraMoneda ? ` ≈ ${$b(aBase(porUsuario))}` : ""}</strong>
            </li>
            <li>
              <span>{t("cobros.cuadreNosPagas")}</span>
              <strong>{$b(plataforma.perUserCents)}</strong>
            </li>
            <li className={`cuadre__total${margen != null && margen < 0 ? " cuadre__total--negativo" : ""}`}>
              <span>{t("cobros.cuadreTeQueda")}</span>
              <strong>
                {margen == null ? "—" : `≈ ${$b(margen)}`}
                {margen != null && otraMoneda ? ` (${$m(enSuMoneda(margen))})` : ""}
              </strong>
            </li>
          </ul>
          <p className="cuadre__nota">
            {plataforma.monthlyFeeFreeUntilSeats > 0
              ? t("cobros.cuadreCuotaUmbral", { c: $b(plataforma.monthlyFeeCents), n: plataforma.monthlyFeeFreeUntilSeats })
              : t("cobros.cuadreCuota", { c: $b(plataforma.monthlyFeeCents) })}
          </p>
          {otraMoneda && (
            <p className="cuadre__nota">
              {t("cobros.cuadreReferencia", {
                f: fx?.updatedAt ? fechaCorta(fx.updatedAt) : "—", s: fx?.source ?? "",
              })}
            </p>
          )}
        </div>
      )}

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
        /* A list of expandable buttons: each row IS a button (so it can carry
           aria-expanded), which a table row cannot be. The header is visual. */
        <div className="cobros-tabla">
          <div className="cobros-tabla__fila cobros-tabla__fila--cabecera" aria-hidden="true">
            <span>{t("cobros.colEmpresa")}</span>
            <span>{t("cobros.colEstado")}</span>
            <span>{t("cobros.colFecha")}</span>
            <span>{t("cobros.colTarjeta")}</span>
            <span className="cobros-tabla__derecha">{t("cobros.colPendiente")}</span>
          </div>
          {datos.companies.map((e) => {
            const est = ESTADO[e.status] ?? ESTADO.trialing;
            return (
              <div key={e.tenantId} className="cobros-tabla__grupo">
                <button
                  type="button"
                  className={`cobros-tabla__fila${abierta === e.tenantId ? " cobros-tabla__fila--abierta" : ""}`}
                  onClick={() => setAbierta((a) => (a === e.tenantId ? null : e.tenantId))}
                  aria-expanded={abierta === e.tenantId}
                >
                  <span className="cobros-tabla__nombre">{e.name || t("empresas.sinNombre")}</span>
                  <span><Pildora tono={est.tono}>{t(est.texto)}</Pildora></span>
                  <span>
                    {e.anchorAt
                      ? t("cobros.renuevaDia", { d: Number(e.anchorAt.slice(8, 10)) })
                      : e.trialEndsAt ? t("cobros.pruebaHasta", { f: fechaCorta(e.trialEndsAt) }) : "—"}
                  </span>
                  <span>{t(e.hasCard ? "cobros.conTarjeta" : "cobros.sinTarjeta")}</span>
                  <span className="cobros-tabla__derecha">{precio(e.outstandingCents, moneda)}</span>
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
  const monedaAjuste = monedaDe(datos);
  const [f, setF] = useState({
    perUser: aTexto(o?.perUserCents ?? null, monedaAjuste),
    setup: aTexto(o?.setupFeeCents ?? null, monedaAjuste),
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aviso, setAviso] = useState<string | null>(null);

  const guardar = async (extra: { exempt?: boolean } = {}) => {
    const cuerpo = {
      perUserCents: aCentavos(f.perUser),
      setupFeeCents: aCentavos(f.setup),
    };
    /* NaN travels as null in JSON, and null means "remove the override":
       typing "abc" silently wiped this company's special price. */
    if (Object.values(cuerpo).some((n) => n != null && Number.isNaN(n))) {
      setError(t("cobros.importeNoValido", { e: aTexto(150050, monedaAjuste) }));
      return;
    }
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await cobroAEmpresasService.ajustarEmpresa(empresa.tenantId, { ...cuerpo, ...extra });
      setAviso(t("exempt" in extra ? (extra.exempt ? "cobros.eximida" : "cobros.exencionQuitada") : "cobros.ajusteGuardado"));
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
        <Campo etiqueta={t("cobros.porUsuario")} placeholder={aTexto(base?.perUserCents, monedaAjuste)} {...campo("perUser")} />
        <Campo etiqueta={t("cobros.cuotaAlta")} placeholder={aTexto(base?.setupFeeCents, monedaAjuste)} {...campo("setup")} />
      </div>
      {error && <p role="alert" className="cobros__error">{error}</p>}
      {aviso && <p role="status" className="cobros__aviso">{aviso}</p>}
      {gestiona && (
        <div className="cobros-formulario__botones">
          <Link to={`/companies/${empresa.tenantId}`} className="bloque__enlace">{t("cobros.verEmpresa")}</Link>
          <Confirmar
            variante="fantasma"
            disabled={enviando}
            pregunta={t(empresa.status === "exempt" ? "cobros.quitarExencionPregunta" : "cobros.eximirPregunta")}
            onConfirmar={() => guardar({ exempt: empresa.status !== "exempt" })}
          >
            {t(empresa.status === "exempt" ? "cobros.quitarExencion" : "cobros.eximir")}
          </Confirmar>
          <Boton onClick={() => guardar()} cargando={enviando}>{t("cobros.guardarAjuste")}</Boton>
        </div>
      )}
    </div>
  );
}

export default CobrosAEmpresas;
