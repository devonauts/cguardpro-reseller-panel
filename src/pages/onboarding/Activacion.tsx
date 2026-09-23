import { Icono } from "@/components/cristal";
import { PagarFactura } from "@/components/panel/Pago";
import { precio } from "@/lib/dinero";
import {
  activacionService, type EstadoDeActivacion, type PagoDeFactura,
} from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * «ACTIVA TU CUENTA» — LO PRIMERO QUE VE UN SOCIO NUEVO
 *
 * El socio no tiene prueba: entra y paga la cuota de alta de su contrato. Hasta
 * entonces el servidor no le abre ni el asistente ni la marca, así que esta es
 * la única pantalla que tiene sentido enseñarle.
 *
 * El importe sale del contrato (el servidor lo manda); el número de la tarjeta
 * lo recoge Stripe en su propio campo. Pagar deja la tarjeta guardada para los
 * cobros siguientes y fija el día de aniversario: eso se dice ANTES de pagar.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function Activacion({
  estado, onPagada,
}: { estado: EstadoDeActivacion; onPagada: (r: PagoDeFactura) => void }) {
  const t = useT();
  const importe = precio(estado.amountCents, estado.currency);
  const hoy = new Date().getDate();

  return (
    <>
      <header className="alta__cabecera">
        <p className="alta__contador">{t("activar.rotulo")}</p>
        <h1 className="alta__titulo">{t("activar.titulo")}</h1>
      </header>

      <div className="alta__cuerpo activar">
        <p className="alta__texto">{t("activar.sub")}</p>

        <div className="activar__importe">
          <span className="activar__cifra">{importe}</span>
          <span className="activar__unidad">{t("activar.unaVez")}</span>
        </div>

        <ul className="activar__lista">
          <li><Icono nombre="visto" tamano={15} />{t("activar.incluye1")}</li>
          <li><Icono nombre="visto" tamano={15} />{t("activar.incluye2")}</li>
          <li><Icono nombre="visto" tamano={15} />{t("activar.incluye3", { d: hoy })}</li>
        </ul>

        {estado.hasContract ? (
          <PagarFactura
            invoiceId="activacion"
            saldoCents={estado.amountCents}
            currency={estado.currency}
            tieneTarjeta={estado.hasCard}
            onPagada={onPagada}
            pagarCon={activacionService.pagar}
            confirmarCon={activacionService.confirmar}
            etiqueta={t("activar.boton", { importe })}
          />
        ) : (
          <p className="alta__apunte">{t("activar.sinContrato")}</p>
        )}

        <p className="alta__apunte">{t("activar.seguro")}</p>
      </div>
    </>
  );
}

export default Activacion;
