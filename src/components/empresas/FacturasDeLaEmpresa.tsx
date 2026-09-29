import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Pildora, Tarjeta, TarjetaCabecera, Icono, type Tono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { dinero, fechaCorta } from "@/lib/dinero";
import { cobroAEmpresasService, type FacturaACliente } from "@/services/resellerService";

/**
 * Las últimas facturas que el socio le ha emitido a ESTA empresa, con su PDF.
 * La lista completa (y los filtros) están en Ingresos, que se abre ya filtrado.
 */
const ESTADO: Record<string, { texto: Clave; tono: Tono }> = {
  open: { texto: "ingresos.estadoOpen", tono: "aviso" },
  paid: { texto: "ingresos.estadoPaid", tono: "ok" },
  void: { texto: "ingresos.estadoVoid", tono: "neutro" },
  refunded: { texto: "ingresos.estadoRefunded", tono: "neutro" },
};
const CONCEPTO: Record<string, Clave> = {
  inicio: "ingresos.conceptoInicio",
  renovacion: "ingresos.conceptoRenovacion",
  asientos: "ingresos.conceptoAsientos",
};

export function FacturasDeLaEmpresa({ tenantId, filas, total }: {
  tenantId: string; filas: FacturaACliente[] | null; total: number;
}) {
  const t = useT();
  const [bajando, setBajando] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  useEffect(() => { setFallo(null); }, [tenantId]);

  const descargar = async (f: FacturaACliente) => {
    setBajando(f.id);
    setFallo(null);
    try {
      await cobroAEmpresasService.descargarFactura(f.id, f.folio);
    } catch (e: any) {
      setFallo(e?.message || t("ingresos.noDescargo"));
    } finally {
      setBajando(null);
    }
  };

  return (
    <Tarjeta>
      <div className="ficha__cabecera-con-accion">
        <TarjetaCabecera titulo={t("fichaEmpresa.facturas")} />
        {total > 0 && (
          <Link to={`/revenue?empresa=${encodeURIComponent(tenantId)}`} className="bloque__enlace">
            {t("fichaEmpresa.verTodasFacturas", { n: total })} <Icono nombre="flecha" tamano={14} />
          </Link>
        )}
      </div>
      {filas === null ? (
        <div className="ficha__esqueleto" aria-hidden="true" />
      ) : filas.length === 0 ? (
        <p className="ficha__nota">{t("fichaEmpresa.sinFacturas")}</p>
      ) : (
        <ul className="ficha-facturas">
          {filas.map((f) => (
            <li key={f.id} className="ficha-facturas__fila">
              <Link to={`/revenue/${f.id}`} className="ficha-facturas__principal">
                <span className="ficha-facturas__folio">{f.folio}</span>
                <span className="ficha-facturas__meta">
                  {CONCEPTO[f.kind] ? t(CONCEPTO[f.kind]) : f.kind} · {fechaCorta(f.issuedAt)}
                </span>
              </Link>
              <span className="ficha-facturas__importe">{dinero(f.totalCents, f.currency)}</span>
              <Pildora tono={ESTADO[f.status]?.tono ?? "neutro"}>
                {ESTADO[f.status] ? t(ESTADO[f.status].texto) : f.status}
              </Pildora>
              <button
                type="button"
                className="ficha-facturas__pdf"
                onClick={() => descargar(f)}
                disabled={bajando === f.id}
                aria-label={t("fichaEmpresa.descargarFactura", { f: f.folio })}
                title={t("ingresos.descargarPdf")}
              >
                {bajando === f.id ? "…" : "PDF"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {fallo && <p role="alert" className="ficha__error">{fallo}</p>}
    </Tarjeta>
  );
}

export default FacturasDeLaEmpresa;
