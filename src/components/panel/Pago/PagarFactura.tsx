import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";

import { Boton } from "@/components/cristal";
import { estiloDelCampo } from "@/components/panel/Tarjeta";
import { precio } from "@/lib/dinero";
import { billingService, type PagoDeFactura } from "@/services/resellerService";
import { useIdioma } from "@/i18n/IdiomaProvider";
import "./Pago.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PAGAR UNA FACTURA, AQUÍ Y AHORA
 *
 * Tres caminos, y el servidor decide cuál:
 *
 *   · Tarjeta guardada y el banco no pide nada → cobrada en el acto.
 *   · Tarjeta guardada y el banco pide 3-D Secure → Stripe abre su ventana de
 *     verificación y, al volver, se pide al servidor que lo compruebe.
 *   · Sin tarjeta (o «pagar con otra») → se monta el campo de Stripe aquí
 *     mismo; la tarjeta paga y se queda guardada para los próximos cobros.
 *
 * El importe NO sale de aquí: se enseña el saldo que ya calculó el servidor, y
 * la petición sólo dice qué factura. El número de la tarjeta tampoco pasa por
 * aquí — lo recoge Stripe en su propio iframe.
 *
 * «Pagado» lo dice SIEMPRE el servidor tras mirar en Stripe. Que Stripe.js
 * devuelva éxito en el navegador no basta: es la palabra del cliente.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function PagarFactura({
  invoiceId, saldoCents, currency, tieneTarjeta, onPagada, pagarCon, confirmarCon, etiqueta,
}: {
  invoiceId: string;
  saldoCents: number;
  currency: string;
  /** Si hay tarjeta guardada, se ofrece también pagar con otra. */
  tieneTarjeta: boolean;
  onPagada: (r: PagoDeFactura) => void;
  /** Otro cobro con el mismo flujo (la activación). Por defecto, la factura. */
  pagarCon?: (opciones: { otraTarjeta?: boolean }) => Promise<PagoDeFactura>;
  confirmarCon?: (paymentIntentId: string) => Promise<PagoDeFactura>;
  /** El texto del botón; por defecto «Pagar {importe} ahora». */
  etiqueta?: string;
}) {
  const { t, idioma } = useIdioma();
  const [trabajando, setTrabajando] = useState(false);
  const [conCampo, setConCampo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeRef = useRef<Stripe | null>(null);
  const campoRef = useRef<StripeCardElement | null>(null);
  const hueco = useRef<HTMLDivElement | null>(null);
  const secreto = useRef<string | null>(null);

  const cerrarCampo = useCallback(() => {
    try { campoRef.current?.unmount(); } catch { /* ya estaba fuera */ }
    campoRef.current = null;
    secreto.current = null;
    setConCampo(false);
  }, []);

  useEffect(() => cerrarCampo, [cerrarCampo]);

  const importe = precio(saldoCents, currency);

  /** El servidor comprueba en Stripe y, si está cobrado, lo anota. */
  const confirmar = async (paymentIntentId: string) => {
    const r = confirmarCon
      ? await confirmarCon(paymentIntentId)
      : await billingService.confirmarPago(invoiceId, paymentIntentId);
    if (r.estado === "pagada") {
      cerrarCampo();
      onPagada(r);
    } else {
      setError(r.motivo || t("pago.noSeCobro"));
    }
  };

  /** Monta el campo de Stripe con el secreto de un cargo ya preparado. */
  const montarCampo = async (r: PagoDeFactura) => {
    const stripe = await loadStripe(String(r.publishableKey || ""));
    if (!stripe) throw new Error(t("tarjeta.noStripe"));
    stripeRef.current = stripe;
    secreto.current = String(r.clientSecret);
    const campo = stripe.elements({ locale: idioma }).create("card", {
      hidePostalCode: true,
      style: { base: estiloDelCampo() },
    });
    campo.on("change", (e) => setError(e.error?.message ?? null));
    campoRef.current = campo;
    /* Mounted by the effect below, once the box exists. A requestAnimationFrame
       here raced React's commit: the box was not rendered yet, the field never
       mounted, the card input stayed empty and paying failed with "could not
       retrieve data from the specified Element". */
    setConCampo(true);
  };

  useEffect(() => {
    const campo = campoRef.current;
    if (!conCampo || !campo || !hueco.current) return;
    try { campo.mount(hueco.current); } catch { /* already mounted */ }
  }, [conCampo]);

  const pagar = async (otraTarjeta = false) => {
    if (trabajando) return;
    setTrabajando(true);
    setError(null);
    try {
      const r = pagarCon
        ? await pagarCon({ otraTarjeta })
        : await billingService.pagar(invoiceId, { otraTarjeta });

      if (r.estado === "pagada") {
        onPagada(r);
      } else if (r.estado === "requiere_accion" && r.clientSecret) {
        /* El banco quiere verificar al titular. Stripe abre su ventana; lo que
           devuelve no se da por bueno hasta que el servidor lo mira. */
        const stripe = await loadStripe(String(r.publishableKey || ""));
        if (!stripe) throw new Error(t("tarjeta.noStripe"));
        const v = await stripe.confirmCardPayment(r.clientSecret);
        if (v.error) setError(v.error.message || t("pago.noSeCobro"));
        else if (v.paymentIntent) await confirmar(v.paymentIntent.id);
      } else if (r.estado === "requiere_tarjeta" && r.clientSecret) {
        await montarCampo(r);
      } else {
        setError(r.motivo || t("pago.noSeCobro"));
      }
    } catch (e: any) {
      setError(e?.message || t("pago.noSeCobro"));
    } finally {
      setTrabajando(false);
    }
  };

  /** Paga con la tarjeta recién escrita en el campo de Stripe. */
  const pagarConCampo = async () => {
    if (!stripeRef.current || !campoRef.current || !secreto.current || trabajando) return;
    setTrabajando(true);
    setError(null);
    try {
      const v = await stripeRef.current.confirmCardPayment(secreto.current, {
        payment_method: { card: campoRef.current },
      });
      if (v.error) setError(v.error.message || t("pago.noSeCobro"));
      else if (v.paymentIntent) await confirmar(v.paymentIntent.id);
    } catch (e: any) {
      setError(e?.message || t("pago.noSeCobro"));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="pago">
      {!conCampo ? (
        <div className="pago__botones">
          <Boton onClick={() => pagar(false)} cargando={trabajando}>
            {etiqueta ?? t("pago.pagarImporte", { importe })}
          </Boton>
          {tieneTarjeta && (
            <Boton variante="fantasma" onClick={() => pagar(true)} disabled={trabajando}>
              {t("pago.otraTarjeta")}
            </Boton>
          )}
        </div>
      ) : (
        <div className="pago__formulario">
          {/* Aquí dentro monta Stripe su campo. El número no toca este árbol. */}
          <div className="tarjeta__campo" ref={hueco} />
          <p className="pago__apunte">{t("pago.seGuarda")}</p>
          <div className="pago__botones">
            <Boton variante="fantasma" onClick={cerrarCampo} disabled={trabajando}>
              {t("comun.cancelar")}
            </Boton>
            <Boton onClick={pagarConCampo} cargando={trabajando}>
              {etiqueta ?? t("pago.pagarImporte", { importe })}
            </Boton>
          </div>
        </div>
      )}
      {error && <p role="alert" className="pago__error">{error}</p>}
    </div>
  );
}

export default PagarFactura;
