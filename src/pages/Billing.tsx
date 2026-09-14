import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cifra, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera, TodaviaNo,
  type Tono,
} from "@/components/ui/kit";
import {
  billingService,
  type FacturaDetallada, type FacturaEnLista, type LineaDeFactura,
  type TerminosVigentes, type TotalPorMoneda,
} from "@/services/resellerService";
import "./Billing.css";

/**
 * Lo que CGuardPro le cobra al socio.
 *
 * ── SÓLO LECTURA, Y NO POR JERARQUÍA ──────────────────────────────────────
 * Aquí no hay ni un botón que cambie una cifra. Una factura es una reclamación
 * de una parte sobre la otra, y la parte a la que se le reclama no puede
 * editarla: si pudiera, el documento no serviría de respaldo para ninguna de las
 * dos. Lo que sí hay es todo el detalle — de dónde sale cada importe y sobre qué
 * recuento se calculó— para que no haga falta fiarse de nadie.
 *
 * ── CONSUMO Y FACTURACIÓN CONTESTAN PREGUNTAS DISTINTAS ───────────────────
 * Consumo: «¿cuántos usuarios se contaron y por qué ésos?». Facturación: «¿qué
 * me cobraron por eso?». Se enlazan pero no se mezclan, y aquí no se vuelve a
 * contar nada: cada línea de regalías enseña el recuento CONGELADO del que
 * salió.
 */

const ESTADO: Record<string, { texto: string; tono: Tono }> = {
  draft: { texto: "Borrador", tono: "neutro" },
  open: { texto: "Pendiente de pago", tono: "aviso" },
  paid: { texto: "Pagada", tono: "ok" },
  void: { texto: "Anulada", tono: "peligro" },
  uncollectible: { texto: "Incobrable", tono: "peligro" },
};

const CLASE: Record<string, string> = {
  setup_fee: "Cuota única de alta",
  monthly_subscription: "Suscripción mensual de marca blanca",
  royalty: "Regalías",
  adjustment: "Ajuste",
  credit: "Crédito",
  tax: "Impuesto",
};

const MOTIVO: Record<string, string> = {
  invited: "invitados sin aceptar",
  pending: "pendientes de activar",
  archived: "de baja o inactivos",
  deletedMembership: "eliminados",
  orphanUser: "sin cuenta asociada",
  demoSeed: "datos de ejemplo de la plataforma",
  policy: "fuera de la modalidad contratada",
};

const MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mes(label: string | null | undefined): string {
  if (!label) return "—";
  const m = /^(\d{4})-(\d{2})$/.exec(label);
  return m ? `${MES[Number(m[2]) - 1]} de ${m[1]}` : label;
}

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Centavos enteros → texto. SÓLO para mostrar.
 *
 * Nunca al revés: esta pantalla no manda importes a ninguna parte, así que no
 * existe el camino de vuelta por el que un texto con formato se convertiría en
 * dinero.
 */
function dinero(cents: number, moneda: string): string {
  const signo = cents < 0 ? "−" : "";
  const abs = Math.abs(Math.trunc(cents));
  return `${signo}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")} ${moneda}`;
}

export function Billing() {
  const [facturas, setFacturas] = useState<FacturaEnLista[]>([]);
  const [terminos, setTerminos] = useState<TerminosVigentes | null>(null);
  const [totales, setTotales] = useState<TotalPorMoneda[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<FacturaDetallada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await billingService.list({ limit: 24 });
      setFacturas(r.invoices ?? []);
      setTerminos(r.contract ?? null);
      setTotales(r.totalsByCurrency ?? []);
      setAbierta(r.invoices?.[0]?.id ?? null);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar tu facturación.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    let vivo = true;
    if (!abierta) { setDetalle(null); return; }
    billingService.detail(abierta)
      .then((d) => { if (vivo) setDetalle(d); })
      .catch(() => { if (vivo) setDetalle(null); });
    return () => { vivo = false; };
  }, [abierta]);

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">Facturación</h1>
          <p className="cabecera__sub">
            Lo que CGuardPro te factura, y de dónde sale cada importe.
          </p>
        </div>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && facturas.length === 0}
        etiquetaVacio="Todavía no tienes ninguna factura emitida."
        onReintentar={cargar}
      >
        <div className="facturacion">
          {totales.map((t) => (
            <div className="facturacion__cifras" key={t.currency}>
              <Cifra
                etiqueta={`Facturado (${t.currency})`}
                valor={dinero(t.billedCents, t.currency)}
                nota={`${t.invoiceCount} factura${t.invoiceCount === 1 ? "" : "s"}`}
              />
              <Cifra etiqueta={`Cobrado (${t.currency})`} valor={dinero(t.paidCents, t.currency)} />
              <Cifra
                etiqueta={`Pendiente (${t.currency})`}
                valor={dinero(t.outstandingCents, t.currency)}
              />
            </div>
          ))}

          {totales.length > 1 && (
            <p className="facturacion__nota">
              Los importes se muestran por moneda y no se suman entre sí: no hay
              conversión de divisa.
            </p>
          )}

          {terminos && <Terminos terminos={terminos} />}

          <nav className="facturacion__lista" aria-label="Tus facturas">
            {facturas.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`factura-fila${f.id === abierta ? " factura-fila--abierta" : ""}`}
                onClick={() => setAbierta(f.id)}
                aria-current={f.id === abierta}
              >
                <span className="factura-fila__numero">{f.number}</span>
                <span className="factura-fila__periodo">{mes(f.periodLabel)}</span>
                <span className="factura-fila__total">{dinero(f.totalCents, f.currency)}</span>
                <Pildora tono={ESTADO[f.status]?.tono ?? "neutro"}>
                  {ESTADO[f.status]?.texto ?? f.status}
                </Pildora>
              </button>
            ))}
          </nav>

          {detalle && <Detalle factura={detalle} />}
        </div>
      </EstadoDeDatos>
    </>
  );
}

function Terminos({ terminos }: { terminos: TerminosVigentes }) {
  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo={`Términos vigentes · contrato v${terminos.version}`}
        nota={`En vigor desde el ${terminos.effectiveFrom}`}
      />
      <ul className="terminos">
        <li>
          <span>Suscripción mensual</span>
          <strong>{dinero(terminos.monthlyFeeCents, terminos.currency)}</strong>
        </li>
        <li>
          <span>Regalías por usuario contabilizado</span>
          <strong>{dinero(terminos.royaltyPerUserCents, terminos.currency)}</strong>
        </li>
        <li>
          <span>Modalidad de conteo</span>
          <strong>{terminos.seatPolicy}</strong>
        </li>
      </ul>
      {/* No se estima la factura del mes en curso. Un número que nadie ha
          cerrado no se puede reclamar, y enseñarlo junto a los cerrados haría
          que se leyera igual que ellos. */}
      <p className="terminos__nota">
        Estos son los precios con los que se calculará el mes en curso. La
        factura aparece cuando el mes se cierra.
      </p>
    </Tarjeta>
  );
}

function Detalle({ factura }: { factura: FacturaDetallada }) {
  const base = factura.lines.filter((l) => !l.isAdjustment);
  const ajustes = factura.lines.filter((l) => l.isAdjustment);

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo={factura.number}
        nota={
          <>
            {mes(factura.period?.label)}
            {factura.contract && ` · contrato v${factura.contract.version}`}
            {factura.finalizedAt && ` · emitida el ${fecha(factura.issuedAt ?? factura.finalizedAt)}`}
            {factura.dueAt && ` · vence el ${fecha(factura.dueAt)}`}
          </>
        }
      />

      {factura.status === "void" && (
        <p className="factura__anulada">
          Esta factura está anulada: no hay que pagarla. Se conserva como registro
          de lo que se reclamó en su momento.
        </p>
      )}

      <ul className="lineas">
        {[...base, ...ajustes].map((l) => (
          <li key={l.id} className="linea">
            <div className="linea__texto">
              <span className="linea__concepto">
                {CLASE[l.kind] ?? l.kind}
                {l.tenantNameAtSnapshot && ` · ${l.tenantNameAtSnapshot}`}
              </span>
              {l.kind === "royalty" && (
                <span className="linea__detalle">
                  {l.quantity} usuarios × {dinero(l.unitAmountCents, factura.currency)}
                </span>
              )}
              {l.isAdjustment && l.description && (
                <span className="linea__detalle">{l.description}</span>
              )}
              {l.kind === "royalty" && <DeDondeSale linea={l} />}
            </div>
            <span className={`linea__importe${l.amountCents < 0 ? " linea__importe--credito" : ""}`}>
              {dinero(l.amountCents, factura.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="totales">
        <div className="totales__fila">
          <span>Subtotal</span>
          <span>{dinero(factura.subtotalCents, factura.currency)}</span>
        </div>
        {factura.adjustmentsCents !== 0 && (
          <div className="totales__fila">
            <span>Ajustes y créditos</span>
            <span>{dinero(factura.adjustmentsCents, factura.currency)}</span>
          </div>
        )}
        <div className="totales__fila totales__fila--fuerte">
          <span>Total</span>
          <span>{dinero(factura.totalCents, factura.currency)}</span>
        </div>
        {factura.amountPaidCents > 0 && (
          <div className="totales__fila">
            <span>Cobrado</span>
            <span>{dinero(factura.amountPaidCents, factura.currency)}</span>
          </div>
        )}
      </div>

      {factura.immutable ? (
        <div className="factura__acciones">
          {/* Un enlace normal a una ruta que responde con el PDF. Ni descarga
              por JavaScript ni blob en memoria: el navegador ya sabe hacer esto,
              y por aquí la sesión viaja como en cualquier otra petición. */}
          <a className="btn btn--suave" href={billingService.pdfUrl(factura.id)} target="_blank" rel="noreferrer">
            Descargar el PDF
          </a>
        </div>
      ) : (
        <TodaviaNo>
          Esta factura todavía es un borrador en revisión: el PDF se emite cuando
          queda cerrada, para que lo que descargues no pueda cambiar después.
        </TodaviaNo>
      )}
    </Tarjeta>
  );
}

/** De la línea al recuento: la resta entera, sin volver a contar nada. */
function DeDondeSale({ linea }: { linea: LineaDeFactura }) {
  const motivos = Object.entries(linea.excluded ?? {}).filter(([, n]) => n > 0);
  if (linea.sourceMemberships === null && !motivos.length) return null;

  return (
    <span className="linea__origen">
      {linea.sourceMemberships !== null && (
        <>
          {linea.sourceMemberships} cuentas en la empresa → <strong>{linea.quantity}</strong> contabilizadas
        </>
      )}
      {motivos.length > 0 && (
        <>
          {" "}({motivos.map(([k, n]) => `${n} ${MOTIVO[k] ?? k}`).join(", ")})
        </>
      )}
      {" · "}
      <Link to="/usage">ver el detalle en Consumo</Link>
    </span>
  );
}

export default Billing;
