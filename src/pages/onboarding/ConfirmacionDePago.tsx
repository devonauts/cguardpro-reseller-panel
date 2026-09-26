import { useState } from "react";
import { Boton, Icono } from "@/components/cristal";
import { fechaYHora, precio } from "@/lib/dinero";
import type { PagoDeFactura } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * «PAGO RECIBIDO» — ENTRE PAGAR EL ALTA Y EMPEZAR LOS PASOS
 *
 * Antes, al terminar el pago, la pantalla saltaba sola a los pasos del alta y
 * el socio no llegaba a ver que se le había cobrado. Decisión del dueño
 * (2026-09-26): una confirmación con su botón «OK», y de ahí a los pasos.
 *
 * Sólo lo que le sirve al socio: cuánto, cuándo (en la hora de la plataforma,
 * como el recibo) y que el recibo le llega por correo. Nada del procesador de
 * pagos: la referencia de Stripe es interna.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ConfirmacionDePago({ pago, pagadoEn, onContinuar }: {
  pago: PagoDeFactura;
  pagadoEn: string;
  onContinuar: () => Promise<void> | void;
}) {
  const t = useT();
  const [siguiendo, setSiguiendo] = useState(false);

  return (
    <>
      <header className="alta__cabecera">
        <p className="alta__contador">{t("pagado.rotulo")}</p>
        <h1 className="alta__titulo">{t("pagado.titulo")}</h1>
      </header>

      <div className="alta__cuerpo activar">
        <div className="activar__importe">
          <span className="activar__cifra">{precio(pago.amountCents, pago.currency)}</span>
          <span className="activar__unidad">{t("pagado.unidad")}</span>
        </div>

        <ul className="activar__lista">
          <li><Icono nombre="visto" tamano={15} />{t("pagado.cuando", { fecha: fechaYHora(pagadoEn) })}</li>
          <li><Icono nombre="visto" tamano={15} />{t("pagado.recibo")}</li>
          <li><Icono nombre="visto" tamano={15} />{t("pagado.siguiente")}</li>
        </ul>

        <Boton
          bloque
          cargando={siguiendo}
          onClick={async () => {
            setSiguiendo(true);
            try {
              await onContinuar();
            } finally {
              setSiguiendo(false);
            }
          }}
        >
          {t("pagado.ok")}
        </Boton>
      </div>
    </>
  );
}

export default ConfirmacionDePago;
