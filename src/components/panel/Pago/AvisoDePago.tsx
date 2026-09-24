import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Icono } from "@/components/cristal";
import { dinero, fechaCorta } from "@/lib/dinero";
import {
  billingService, type FacturaEnLista, type PagoDeFactura,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { PagarFactura } from "./PagarFactura";
import "./Pago.scss";

/** Otras pantallas (Facturación) escuchan esto para recargar tras un pago. */
export const EVENTO_PAGO = "socio:factura-pagada";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * «TIENES UN PAGO PENDIENTE»
 *
 * Sale arriba de TODAS las pantallas del panel mientras quede una factura
 * cerrada sin pagar, con el botón para pagarla ahí mismo. El socio lo ve el
 * mismo día que entra — no el día que vence, que es cuando lo cobraba el
 * barrido y cuando ya era tarde para no caer en mora.
 *
 * Se enseña la más ANTIGUA: es la que marca desde cuándo se debe, y pagar en
 * orden es lo que saca antes de la mora. Si hay más, se dice cuántas.
 *
 * Quien sólo puede VER la facturación ve el aviso pero no el botón: cargar la
 * tarjeta de la empresa exige `reseller.billing.manage`, igual que en el
 * servidor.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AvisoDePago() {
  const t = useT();
  const { puede, recargar } = useResellerAuth();
  const [pendientes, setPendientes] = useState<FacturaEnLista[]>([]);
  const [tieneTarjeta, setTieneTarjeta] = useState(false);
  const [hecho, setHecho] = useState<PagoDeFactura | null>(null);

  /* En Facturación el saldo ya sale en su ficha, con su botón: el aviso
     repetido encima diría lo mismo dos veces en la misma pantalla. */
  const enFacturacion = useLocation().pathname.startsWith("/billing");
  const ve = puede("reseller.billing.view") && !enFacturacion;
  const paga = puede("reseller.billing.manage");

  const cargar = useCallback(async () => {
    if (!ve) return;
    try {
      const [lista, tarjeta] = await Promise.all([
        /* The 24 NEWEST missed an older unpaid invoice on a long-lived
           account (and miscounted "+N more"). The server caps at 200. */
        billingService.list({ limit: 200 }),
        billingService.tarjeta().catch(() => null),
      ]);
      const vivas = (lista.invoices ?? [])
        .filter((f) => (f.status === "open" || f.status === "sent")
          && f.totalCents - f.amountPaidCents > 0)
        .sort((a, b) => String(a.dueAt ?? a.issuedAt ?? "")
          .localeCompare(String(b.dueAt ?? b.issuedAt ?? "")));
      setPendientes(vivas);
      setTieneTarjeta(!!tarjeta?.card?.hasCard);
    } catch {
      /* Si no se puede leer la facturación, el aviso no sale: mejor callar que
         inventarse una deuda. La pantalla de Facturación dirá lo que pasa. */
      setPendientes([]);
    }
  }, [ve]);

  useEffect(() => { cargar(); }, [cargar]);

  // The thank-you note is a moment, not a fixture for the rest of the session.
  useEffect(() => {
    if (!hecho) return undefined;
    const reloj = setTimeout(() => setHecho(null), 10000);
    return () => clearTimeout(reloj);
  }, [hecho]);

  const alPagar = async (r: PagoDeFactura) => {
    setHecho(r);
    window.dispatchEvent(new CustomEvent(EVENTO_PAGO));
    // El estado de la cuenta puede haber salido de la mora: se relee `/me`.
    if (r.restablecido) await recargar();
    await cargar();
  };

  if (hecho && pendientes.length === 0) {
    return (
      <div role="status" className="aviso-pago aviso-pago--hecho">
        <span className="aviso-pago__texto">
          <span className="aviso-pago__icono"><Icono nombre="visto" tamano={20} /></span>
          <span className="aviso-pago__lineas">
            <span className="aviso-pago__titulo">
              {t("pago.gracias", { importe: dinero(hecho.amountCents, hecho.currency) })}
            </span>
            <span className="aviso-pago__nota">
              {t(hecho.restablecido ? "pago.graciasRestablecida" : "pago.graciasNota")}
            </span>
          </span>
        </span>
      </div>
    );
  }

  const factura = pendientes[0];
  if (!factura) return null;

  const saldo = factura.totalCents - factura.amountPaidCents;
  const vencida = !!factura.dueAt && new Date(factura.dueAt).getTime() < Date.now();

  return (
    <section
      className={`aviso-pago${vencida ? " aviso-pago--vencido" : ""}`}
      aria-label={t("pago.titulo")}
    >
      <span className="aviso-pago__texto">
        <span className="aviso-pago__icono"><Icono nombre="tarjeta" tamano={20} /></span>
        <span className="aviso-pago__lineas">
          <span className="aviso-pago__titulo">
            {t("pago.pendiente", { importe: dinero(saldo, factura.currency) })}
          </span>
          <span className="aviso-pago__nota">
            {t("pago.factura", { numero: factura.number })}
            {factura.dueAt && ` · ${t(vencida ? "pago.vencio" : "pago.vence", {
              f: fechaCorta(factura.dueAt),
            })}`}
            {pendientes.length > 1 && ` · ${t("pago.masPendientes", { n: pendientes.length - 1 })}`}
          </span>
        </span>
      </span>

      {paga ? (
        <PagarFactura
          key={factura.id}
          invoiceId={factura.id}
          saldoCents={saldo}
          currency={factura.currency}
          tieneTarjeta={tieneTarjeta}
          onPagada={alPagar}
        />
      ) : (
        <span className="aviso-pago__nota">{t("pago.sinPermiso")}</span>
      )}
    </section>
  );
}

export default AvisoDePago;
