import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Boton, EstadoDeDatos, Icono, Pildora, Selector, type Tono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { dinero, fechaCorta, precio } from "@/lib/dinero";
import {
  cobroAEmpresasService,
  type FacturaACliente,
  type FacturasAClientes as Respuesta,
} from "@/services/resellerService";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * FACTURACIÓN › FACTURAS A TUS CLIENTES
 *
 * El socio FACTURA a sus empresas: su pasarela cobra el alta, cada renovación y
 * los usuarios nuevos. Aquí ve todas esas facturas —las pagadas y las que aún
 * tiene que cobrar—, con quién, por qué concepto, cuánto y en qué quedó cada
 * intento de cobro. Sólo lectura: el importe lo fijan sus precios.
 *
 * No son facturas fiscales: son los recibos del cobro. La factura legal la
 * emite el socio con su sistema (lo dice la nota de abajo).
 * ════════════════════════════════════════════════════════════════════════════
 */

const ESTADO: Record<string, { texto: Clave; tono: Tono }> = {
  open: { texto: "facturasClientes.estadoOpen", tono: "aviso" },
  paid: { texto: "facturasClientes.estadoPaid", tono: "ok" },
  void: { texto: "facturasClientes.estadoVoid", tono: "neutro" },
  refunded: { texto: "facturasClientes.estadoRefunded", tono: "neutro" },
};

const CONCEPTO: Record<string, Clave> = {
  inicio: "facturasClientes.conceptoInicio",
  renovacion: "facturasClientes.conceptoRenovacion",
  asientos: "facturasClientes.conceptoAsientos",
};

const LINEA: Record<string, Clave> = {
  setup_fee: "facturasClientes.lineaImplementacion",
  seats: "facturasClientes.lineaUsuarios",
  monthly_fee: "facturasClientes.lineaCuota",
};

type Filtro = "" | "open" | "paid";
const POR_PAGINA = 50;

export function FacturasAClientes() {
  const t = useT();
  const [filtro, setFiltro] = useState<Filtro>("");
  const [empresa, setEmpresa] = useState("");
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [empresas, setEmpresas] = useState<Array<{ id: string; name: string | null }>>([]);
  /** La moneda en que cobra el socio (la de su país): manda en los totales. */
  const [monedaDeCobro, setMonedaDeCobro] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await cobroAEmpresasService.facturas({
        status: filtro || undefined, tenantId: empresa || undefined, limit: POR_PAGINA,
      }));
    } catch (e: any) {
      setError(e?.message || t("facturasClientes.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [filtro, empresa, t]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Las empresas del socio, para el filtro (las mismas que factura).
  useEffect(() => {
    let vivo = true;
    cobroAEmpresasService.leer()
      .then((r) => {
        if (!vivo) return;
        setEmpresas((r.companies ?? []).map((c) => ({ id: c.tenantId, name: c.name })));
        setMonedaDeCobro(r.currency ?? null);
      })
      .catch(() => { /* sin lista, sin filtro por empresa */ });
    return () => { vivo = false; };
  }, []);

  const cargarMas = async () => {
    if (!datos) return;
    setMasCargando(true);
    try {
      const r = await cobroAEmpresasService.facturas({
        status: filtro || undefined, tenantId: empresa || undefined, limit: POR_PAGINA, offset: datos.rows.length,
      });
      setDatos({ ...datos, rows: [...datos.rows, ...r.rows] });
    } catch { /* se puede reintentar */ } finally {
      setMasCargando(false);
    }
  };

  const monedas = Object.keys(datos?.totalsByCurrency ?? {});
  const moneda = monedaDeCobro ?? monedas[0] ?? "USD";
  const tot = datos?.totalsByCurrency?.[moneda] ?? { porCobrarCents: 0, cobrado30Cents: 0, cobradoTotalCents: 0 };
  const otras = monedas.filter((m) => m !== moneda);

  return (
    <div className="facturacion">
      <div className="resumen">
        <section className={`saldo-ficha${tot.porCobrarCents > 0 ? " saldo-ficha--aviso" : ""}`}>
          <span className="saldo-ficha__etiqueta">{t("facturasClientes.porCobrar")}</span>
          <span className="saldo-ficha__valor">{precio(tot.porCobrarCents, moneda)}</span>
          <span className="saldo-ficha__nota">{t("facturasClientes.porCobrarNota")}</span>
        </section>
        <section className="saldo-ficha">
          <span className="saldo-ficha__etiqueta">{t("facturasClientes.cobrado30")}</span>
          <span className="saldo-ficha__valor">{precio(tot.cobrado30Cents, moneda)}</span>
          <span className="saldo-ficha__nota">{t("facturasClientes.cobrado30Nota")}</span>
        </section>
        <section className="saldo-ficha">
          <span className="saldo-ficha__etiqueta">{t("facturasClientes.cobradoTotal")}</span>
          <span className="saldo-ficha__valor">{precio(tot.cobradoTotalCents, moneda)}</span>
          {otras.length > 0 && (
            <span className="saldo-ficha__nota">
              {otras.map((m) => `${precio(datos!.totalsByCurrency[m].cobradoTotalCents, m, true)} ${m}`).join(" · ")}
            </span>
          )}
        </section>
      </div>

      <section className="bloque" aria-labelledby="facturas-clientes">
        <header className="bloque__cabecera facturas-clientes__cabecera">
          <h2 id="facturas-clientes" className="bloque__titulo">{t("facturasClientes.titulo")}</h2>
          <div className="facturas-clientes__filtros">
            <div className="pestanas pestanas--pequenas" role="group" aria-label={t("facturasClientes.filtroEstado")}>
              {([["", "facturasClientes.todas"], ["open", "facturasClientes.pendientes"], ["paid", "facturasClientes.pagadas"]] as const).map(([v, texto]) => (
                <button
                  key={v || "todas"}
                  type="button"
                  aria-pressed={filtro === v}
                  className={`pestanas__boton${filtro === v ? " pestanas__boton--activa" : ""}`}
                  onClick={() => { setFiltro(v); setAbierta(null); }}
                >
                  {t(texto)}
                </button>
              ))}
            </div>
            {empresas.length > 1 && (
              <Selector
                compacto
                etiquetaOculta={t("facturasClientes.filtroEmpresa")}
                value={empresa}
                onChange={(e) => { setEmpresa(e.target.value); setAbierta(null); }}
              >
                <option value="">{t("facturasClientes.todasLasEmpresas")}</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.name || t("empresas.sinNombre")}</option>)}
              </Selector>
            )}
          </div>
        </header>

        <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
          {!datos || datos.rows.length === 0 ? (
            <div className="bloque__vacio facturas-clientes__vacio">
              <p>{t(filtro || empresa ? "facturasClientes.vacioFiltro" : "facturasClientes.vacio")}</p>
              {!filtro && !empresa && (
                <Link to="/company-billing" className="bloque__enlace">
                  {t("facturasClientes.configurar")} <Icono nombre="flecha" tamano={14} />
                </Link>
              )}
            </div>
          ) : (
            <div className="facturas facturas--clientes" role="table" aria-label={t("facturasClientes.titulo")}>
              <div className="facturas__fila facturas__fila--cabecera" role="row">
                <span role="columnheader">{t("facturasClientes.colNumero")}</span>
                <span role="columnheader">{t("facturasClientes.colCliente")}</span>
                <span role="columnheader">{t("facturasClientes.colConcepto")}</span>
                <span role="columnheader">{t("facturasClientes.colEmitida")}</span>
                <span role="columnheader" className="facturas__derecha">{t("facturasClientes.colImporte")}</span>
                <span role="columnheader" className="facturas__derecha">{t("facturasClientes.colEstado")}</span>
              </div>
              {datos.rows.map((f) => (
                <div key={f.id} className="facturas__grupo">
                  <button
                    type="button"
                    role="row"
                    className={`facturas__fila${f.id === abierta ? " facturas__fila--abierta" : ""}`}
                    aria-expanded={f.id === abierta}
                    onClick={() => setAbierta((a) => (a === f.id ? null : f.id))}
                  >
                    <span role="cell" className="facturas__numero">{f.number}</span>
                    <span role="cell" className="facturas-clientes__cliente">{f.company.name || t("empresas.sinNombre")}</span>
                    <span role="cell">{CONCEPTO[f.kind] ? t(CONCEPTO[f.kind]) : f.kind}</span>
                    <span role="cell">{fechaCorta(f.issuedAt)}</span>
                    <span role="cell" className="facturas__derecha facturas__importe">{dinero(f.totalCents, f.currency)}</span>
                    <span role="cell" className="facturas__derecha">
                      <Pildora tono={ESTADO[f.status]?.tono ?? "neutro"}>
                        {ESTADO[f.status] ? t(ESTADO[f.status].texto) : f.status}
                      </Pildora>
                    </span>
                  </button>
                  {f.id === abierta && <Detalle f={f} />}
                </div>
              ))}
              {datos.rows.length < datos.count && (
                <div className="facturas-clientes__mas">
                  <Boton variante="suave" cargando={masCargando} onClick={cargarMas}>
                    {t("facturasClientes.verMas", { n: datos.count - datos.rows.length })}
                  </Boton>
                </div>
              )}
            </div>
          )}
        </EstadoDeDatos>
        <p className="facturas-clientes__nota">{t("facturasClientes.notaFiscal")}</p>
      </section>
    </div>
  );
}

function Detalle({ f }: { f: FacturaACliente }) {
  const t = useT();
  const saldo = f.totalCents - f.amountPaidCents;
  return (
    <div className="facturas__detalle">
      <p className="facturas__meta">
        {t("facturasClientes.metaEmitida", { f: fechaCorta(f.issuedAt) })}
        {f.paidAt
          ? ` · ${t("facturasClientes.metaPagada", { f: fechaCorta(f.paidAt) })}`
          : f.dueAt ? ` · ${t("facturasClientes.metaVence", { f: fechaCorta(f.dueAt) })}` : ""}
        {f.attempts > 0 && f.status !== "paid" ? ` · ${t("facturasClientes.metaIntentos", { n: f.attempts })}` : ""}
      </p>
      {f.lastError && (
        <p className="facturas-clientes__fallo" role="note">
          {t("facturasClientes.ultimoFallo", { m: f.lastError })}
        </p>
      )}
      <ul className="lineas">
        {f.lines.map((l, i) => (
          <li key={i} className="linea">
            <div className="linea__texto">
              <span className="linea__concepto">
                {l.kind && LINEA[l.kind] ? t(LINEA[l.kind]) : (l.description || "—")}
              </span>
              {l.description && (
                <span className="linea__detalle">
                  {l.description}
                  {l.quantity > 1 ? ` · ${l.quantity} × ${dinero(l.unitAmountCents, f.currency)}` : ""}
                </span>
              )}
            </div>
            <span className="linea__importe">{dinero(l.amountCents, f.currency)}</span>
          </li>
        ))}
      </ul>
      <div className="totales">
        <div className="totales__fila totales__fila--fuerte">
          <span>{t("facturasClientes.total")}</span>
          <span>{dinero(f.totalCents, f.currency)}</span>
        </div>
        <div className="totales__fila">
          <span>{t("facturasClientes.pagado")}</span>
          <span>{dinero(f.amountPaidCents, f.currency)}</span>
        </div>
        {f.status === "open" && saldo > 0 && (
          <div className="totales__fila">
            <span>{t("facturasClientes.saldo")}</span>
            <span>{dinero(saldo, f.currency)}</span>
          </div>
        )}
        {f.refundedCents > 0 && (
          <div className="totales__fila">
            <span>{t("facturasClientes.reembolsado")}</span>
            <span>{dinero(f.refundedCents, f.currency)}</span>
          </div>
        )}
      </div>
      <div className="facturas__acciones">
        <Link to={`/companies/${f.company.id}`} className="bloque__enlace">
          {t("facturasClientes.verEmpresa")} <Icono nombre="flecha" tamano={14} />
        </Link>
      </div>
    </div>
  );
}

export default FacturasAClientes;
