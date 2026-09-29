import { useState } from "react";
import { Link } from "react-router-dom";

import { Boton, Dato, Tarjeta, TarjetaCabecera, Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { fechaCorta, precio } from "@/lib/dinero";
import { cobroAEmpresasService, type CobroAEmpresas, type EmpresaCobrada } from "@/services/resellerService";

/**
 * EL COBRO DE ESTA EMPRESA, en su ficha: precio, tarjeta, prueba y —lo que el
 * socio pedía— EXTENDER LA PRUEBA sin salir de aquí (+7 / +14 / +30 días o
 * una fecha). Si la empresa estaba pausada porque se le acabó la prueba sin
 * tarjeta, al extender vuelve a entrar a su CRM al momento (lo hace el
 * servidor). Una empresa que ya empezó a pagar no tiene prueba que extender.
 */
export function CobroDeLaEmpresa({ empresa, datos, gestiona, onCambio }: {
  empresa: EmpresaCobrada; datos: CobroAEmpresas; gestiona: boolean; onCambio: () => void;
}) {
  const t = useT();
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const moneda = datos.pricing?.currency ?? datos.currency ?? "USD";
  const porUsuario = empresa.override?.perUserCents ?? datos.pricing?.perUserCents ?? null;
  const alta = empresa.override?.setupFeeCents ?? datos.pricing?.setupFeeCents ?? null;
  const especial = empresa.override?.perUserCents != null || empresa.override?.setupFeeCents != null;
  const sePuedeExtender = gestiona && !empresa.anchorAt && empresa.status !== "exempt";

  const extender = async (nueva: Date) => {
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await cobroAEmpresasService.ajustarEmpresa(empresa.tenantId, { trialEndsAt: nueva.toISOString() });
      setAviso(t("fichaEmpresa.pruebaExtendida", { f: fechaCorta(nueva.toISOString()) }));
      setFecha("");
      onCambio();
    } catch (e: any) {
      setError(e?.message || t("fichaEmpresa.noExtendio"));
    } finally {
      setEnviando(false);
    }
  };

  /* Se suma a la fecha de fin que tenga (o a hoy, si ya pasó). */
  const sumar = (dias: number) => {
    const base = empresa.trialEndsAt && new Date(empresa.trialEndsAt).getTime() > Date.now()
      ? new Date(empresa.trialEndsAt) : new Date();
    void extender(new Date(base.getTime() + dias * 86400000));
  };

  return (
    <Tarjeta>
      <div className="ficha__cabecera-con-accion">
        <TarjetaCabecera titulo={t("fichaEmpresa.cobro")} />
        <Link to="/company-billing" className="bloque__enlace">
          {t("nav.cobrosYFacturas")} <Icono nombre="flecha" tamano={14} />
        </Link>
      </div>
      <dl className="ficha__datos ficha__datos--lista">
        <Dato
          etiqueta={t("fichaEmpresa.precioPorUsuario")}
          valor={porUsuario != null ? `${precio(porUsuario, moneda)}${especial ? ` · ${t("fichaEmpresa.precioEspecial")}` : ""}` : "—"}
        />
        <Dato etiqueta={t("fichaEmpresa.implementacion")} valor={alta != null ? precio(alta, moneda) : "—"} />
        <Dato
          etiqueta={empresa.anchorAt ? t("fichaEmpresa.renovacion") : t("fichaEmpresa.finDePrueba")}
          valor={empresa.anchorAt
            ? t("cobros.renuevaDia", { d: Number(empresa.anchorAt.slice(8, 10)) })
            : empresa.trialEndsAt ? fechaCorta(empresa.trialEndsAt) : "—"}
        />
      </dl>

      {sePuedeExtender && (
        <div className="ficha-prueba">
          <span className="ficha-prueba__titulo">{t("fichaEmpresa.extenderPrueba")}</span>
          <div className="ficha-prueba__botones">
            {[7, 14, 30].map((d) => (
              <Boton key={d} variante="suave" disabled={enviando} onClick={() => sumar(d)}>
                {t("fichaEmpresa.masDias", { n: d })}
              </Boton>
            ))}
          </div>
          <div className="ficha-prueba__fecha">
            <input
              type="date"
              value={fecha}
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              onChange={(e) => setFecha(e.target.value)}
              aria-label={t("fichaEmpresa.nuevaFecha")}
            />
            <Boton
              variante="suave"
              disabled={!fecha || enviando}
              cargando={enviando}
              onClick={() => extender(new Date(`${fecha}T23:59:00`))}
            >
              {t("fichaEmpresa.fijarFecha")}
            </Boton>
          </div>
          {empresa.status === "paused" && <p className="ficha__nota">{t("fichaEmpresa.extenderReactiva")}</p>}
        </div>
      )}
      {error && <p role="alert" className="ficha__error">{error}</p>}
      {aviso && <p role="status" className="ficha__ok">{aviso}</p>}
    </Tarjeta>
  );
}

export default CobroDeLaEmpresa;
