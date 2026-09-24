import { useCallback, useEffect, useState } from "react";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Campo, Confirmar, Pildora, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { modulosDeEmpresaService, type ModuloDeEmpresa } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { dinero, fecha } from "@/lib/dinero";

/**
 * MÓDULOS ADICIONALES QUE EL SOCIO PUEDE ACTIVARLE A ESTA EMPRESA.
 *
 * Sólo salen los que la plataforma le ha habilitado revender (y los que la
 * empresa ya tiene). Activar uno es cosa del dueño de la cuenta porque cuesta
 * dinero: se le cobra al socio el porcentaje de la plataforma sobre el precio
 * que él declara, que no puede ser menor que el mínimo. Es un pago único: el
 * módulo queda para siempre en la empresa.
 */
export function ModulosDeLaEmpresa({ tenantId }: { tenantId: string }) {
  const t = useT();
  const { puede } = useResellerAuth();
  const puedeActivar = puede("reseller.billing.manage");
  const [filas, setFilas] = useState<ModuloDeEmpresa[] | null>(null);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFilas((await modulosDeEmpresaService.list(tenantId)).rows);
    } catch {
      setFilas([]);
    }
  }, [tenantId]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (!filas || !filas.length) return null;

  const activar = async (m: ModuloDeEmpresa) => {
    setError(null);
    setAviso(null);
    const cents = Math.round(Number((precios[m.key] || "").replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < m.minPriceCents) {
      setError(t("modulosEmpresa.precioBajo", { min: dinero(m.minPriceCents, m.currency) }));
      return;
    }
    setOcupado(m.key);
    try {
      const r = await modulosDeEmpresaService.activar(tenantId, m.key, cents);
      setAviso(
        r.charged
          ? t("modulosEmpresa.activadoCobrado", { m: m.name, r: dinero(r.royaltyCents, r.currency) })
          : t("modulosEmpresa.activadoPendiente", { m: m.name, n: r.invoiceNumber }),
      );
      await cargar();
    } catch (e: any) {
      setError(e?.message || t("modulosEmpresa.noSeActivo"));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Tarjeta>
      <TarjetaCabecera titulo={t("modulosEmpresa.titulo")} nota={t("modulosEmpresa.nota")} />
      <div className="ficha__datos">
        {filas.map((m) => {
          const tiene = m.status === "active" || m.status === "comp";
          const cents = Math.round(Number((precios[m.key] || "").replace(",", ".")) * 100);
          const regalia = Number.isFinite(cents) && cents > 0 ? Math.round((cents * m.platformPercent) / 100) : null;
          return (
            <div key={m.key} style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                {m.name}{" "}
                {tiene && <Pildora tono="ok">{t("modulosEmpresa.activo")}</Pildora>}
                {m.status === "revoked" && <Pildora tono="peligro">{t("modulosEmpresa.revocado")}</Pildora>}
              </p>
              {m.description && <p className="ficha__nota">{m.description}</p>}
              {tiene && m.purchasedAt && (
                <p className="ficha__nota">
                  {t("modulosEmpresa.desde", { f: fecha(m.purchasedAt) })}
                  {m.resellerPriceCents ? ` · ${t("modulosEmpresa.tuPrecio", { p: dinero(m.resellerPriceCents, m.currency) })}` : ""}
                </p>
              )}
              {m.canActivate && puedeActivar && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginTop: 8 }}>
                  <Campo
                    etiqueta={t("modulosEmpresa.precio")}
                    ayuda={
                      regalia != null
                        ? t("modulosEmpresa.teCobramos", { pc: String(m.platformPercent), r: dinero(regalia, m.currency) })
                        : t("modulosEmpresa.minimo", { min: dinero(m.minPriceCents, m.currency) })
                    }
                    inputMode="decimal"
                    value={precios[m.key] || ""}
                    onChange={(e) => setPrecios((p) => ({ ...p, [m.key]: e.target.value }))}
                  />
                  {/* One click charged the card for a permanent module: now it
                      first says what will be charged. */}
                  <Confirmar
                    variante="primario"
                    cargando={ocupado === m.key}
                    disabled={regalia == null}
                    pregunta={regalia != null
                      ? t("modulosEmpresa.confirmar", { m: m.name, r: dinero(regalia, m.currency) })
                      : ""}
                    textoConfirmar={t("modulosEmpresa.confirmarBoton")}
                    onConfirmar={() => activar(m)}
                  >
                    {t("modulosEmpresa.activar")}
                  </Confirmar>
                </div>
              )}
              {m.canActivate && !puedeActivar && (
                <p className="ficha__nota">{t("modulosEmpresa.soloDueno")}</p>
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="ficha__error">{error}</p>}
      {aviso && <p role="status" className="ficha__nota">{aviso}</p>}
    </Tarjeta>
  );
}

export default ModulosDeLaEmpresa;
