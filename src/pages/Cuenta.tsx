import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EstadoDeDatos, Tarjeta, TarjetaCabecera, Dato, Pildora } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { portalService, type CuentaDelSocio } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { nombreDeRol } from "@/lib/rolDeSocio";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { CambiarContrasena } from "@/components/cuenta/CambiarContrasena";
import "./Cuenta.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * TU CUENTA — Y POR QUÉ ESTA PANTALLA NO GUARDA NADA
 *
 * Se auditó qué puede cambiar un socio de sí mismo. Hoy la respuesta es: nada
 * que no viva ya en otra pantalla.
 *
 *   · correo, teléfono y web de soporte, y el lema → son de la MARCA, que tiene
 *     su propia pantalla con borrador y publicación. Duplicarlos aquí daría dos
 *     sitios donde editar lo mismo, y dos respuestas el día que no coincidan.
 *   · razón social y nombre comercial → los fija CGuardPro al dar de alta al
 *     socio; el asistente de alta los enseña y no declara ni un campo editable.
 *   · cupo, derechos, atribución y estado → los licencia CGuardPro.
 *
 * Así que esto es un resumen de sólo lectura que además DICE dónde se cambia
 * cada cosa. Inventar columnas para tener algo que guardar habría sido peor
 * que una pantalla honesta que no guarda nada.
 * ════════════════════════════════════════════════════════════════════════════
 */

const ESTADO: Record<string, { texto: Clave; tono: "ok" | "aviso" | "peligro" | "neutro" }> = {
  pending: { texto: "cuenta.estadoPending", tono: "neutro" },
  onboarding: { texto: "cuenta.estadoOnboarding", tono: "neutro" },
  active: { texto: "cuenta.estadoActive", tono: "ok" },
  past_due: { texto: "cuenta.estadoPastDue", tono: "aviso" },
  restricted: { texto: "cuenta.estadoRestricted", tono: "aviso" },
  suspended: { texto: "cuenta.estadoSuspended", tono: "peligro" },
  terminated_pending_resolution: { texto: "cuenta.estadoTerminatedPending", tono: "peligro" },
  terminated: { texto: "cuenta.estadoTerminated", tono: "peligro" },
};

export function Cuenta() {
  const t = useT();
  const [c, setC] = useState<CuentaDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* The account summary needs settings.manage; billing, support, read-only
     and account managers got a 403 page instead of their own session. They
     now see their session (from /me) and can change their password. */
  const { puede, me } = useResellerAuth();
  const veCuenta = puede("reseller.settings.manage");

  const cargar = useCallback(async () => {
    if (!veCuenta) { setCargando(false); return; }
    setCargando(true);
    setError(null);
    try {
      setC(await portalService.cuenta());
    } catch (e: any) {
      setError(e?.message || t("cuenta.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t, veCuenta]);

  useEffect(() => { cargar(); }, [cargar]);

  const estado = c?.account.status ? ESTADO[c.account.status] : null;

  return (
    <Pagina titulo={t("cuenta.titulo")} nota={t("cuenta.nota")}>

      {!veCuenta && me && (
        <Tarjeta>
          <TarjetaCabecera titulo={t("cuenta.tuSesion")} />
          <div className="cuenta__rejilla">
            <Dato etiqueta={t("cuenta.persona")} valor={me.user.fullName || me.user.email || "—"} />
            <Dato etiqueta={t("cuenta.correo")} valor={me.user.email || "—"} />
            <Dato etiqueta={t("cuenta.rol")} valor={me.membership?.role ? nombreDeRol(me.membership.role) : "—"} />
          </div>
        </Tarjeta>
      )}

      {veCuenta && (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !c}
        etiquetaVacio={t("cuenta.vacio")}
        onReintentar={cargar}
      >
        {c && (
          <>
            <Tarjeta>
              <TarjetaCabecera
                titulo={t("cuenta.identidad")}
                nota={estado ? <Pildora tono={estado.tono}>{t(estado.texto)}</Pildora> : undefined}
              />
              <div className="cuenta__rejilla">
                <Dato etiqueta={t("cuenta.codigo")} valor={c.account.publicId || "—"} />
                <Dato etiqueta={t("cuenta.nombreComercial")} valor={c.account.displayName || "—"} />
                <Dato etiqueta={t("cuenta.razonSocial")} valor={c.account.legalName || "—"} />
                <Dato etiqueta={t("cuenta.pais")} valor={c.account.country || "—"} />
              </div>
              <p className="cuenta__nota">{t("cuenta.notaIdentidad")}</p>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo={t("cuenta.facturacionTitulo")} />
              <div className="cuenta__rejilla">
                <Dato etiqueta={t("cuenta.correoFacturacion")} valor={c.billing.billingEmail || "—"} />
              </div>
              <p className="cuenta__nota">{t("cuenta.notaFacturacion")}</p>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo={t("cuenta.tuSesion")} />
              <div className="cuenta__rejilla">
                <Dato
                  etiqueta={t("cuenta.persona")}
                  valor={c.session.fullName || c.session.email || "—"}
                />
                <Dato etiqueta={t("cuenta.correo")} valor={c.session.email || "—"} />
                <Dato
                  etiqueta={t("cuenta.rol")}
                  /* El MISMO nombre que en Equipo: esta pantalla tenía su
                     propia tabla, y una de las dos iba a quedarse vieja. */
                  valor={c.session.role ? nombreDeRol(c.session.role) : "—"}
                />
              </div>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo={t("cuenta.dondeSeCambia")} />
              <ul className="cuenta__enlaces">
                <li>
                  <Link to="/branding">{t("nav.marca")}</Link>
                  <span>{t("cuenta.enlaceMarca")}</span>
                </li>
                <li>
                  <Link to="/contract">{t("nav.contrato")}</Link>
                  <span>{t("cuenta.enlaceContrato")}</span>
                </li>
                <li>
                  <Link to="/entitlements">{t("nav.derechos")}</Link>
                  <span>{t("cuenta.enlaceDerechos")}</span>
                </li>
              </ul>
            </Tarjeta>
          </>
        )}
      </EstadoDeDatos>
      )}

      <CambiarContrasena />
    </Pagina>
  );
}

export default Cuenta;
