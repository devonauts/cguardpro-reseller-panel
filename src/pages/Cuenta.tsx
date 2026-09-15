import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EstadoDeDatos, Tarjeta, TarjetaCabecera, Dato, Pildora } from "@/components/ui/kit";
import { portalService, type CuentaDelSocio } from "@/services/resellerService";
import "./Cuenta.css";

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

const ESTADO: Record<string, { texto: string; tono: "ok" | "aviso" | "peligro" | "neutro" }> = {
  pending: { texto: "Pendiente", tono: "neutro" },
  onboarding: { texto: "En alta", tono: "neutro" },
  active: { texto: "Activa", tono: "ok" },
  past_due: { texto: "Pago vencido", tono: "aviso" },
  restricted: { texto: "Restringida", tono: "aviso" },
  suspended: { texto: "Suspendida", tono: "peligro" },
  terminated_pending_resolution: { texto: "En cierre", tono: "peligro" },
  terminated: { texto: "Cerrada", tono: "peligro" },
};

const ROL: Record<string, string> = {
  "reseller:owner": "Propietario",
  "reseller:admin": "Administrador",
  "reseller:billing": "Facturación",
  "reseller:account_manager": "Gestor de cuentas",
  "reseller:support": "Soporte",
  "reseller:readonly": "Sólo lectura",
};

export function Cuenta() {
  const [c, setC] = useState<CuentaDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setC(await portalService.cuenta());
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar tu cuenta.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const estado = c?.account.status ? ESTADO[c.account.status] : null;

  return (
    <section className="pagina">
      <header className="pagina__cabecera">
        <h1>Tu cuenta</h1>
        <p className="pagina__nota">
          Los datos de tu empresa como distribuidor. Lo editable vive en las
          pantallas que se indican abajo.
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !c}
        etiquetaVacio="No se pudo leer tu cuenta."
        onReintentar={cargar}
      >
        {c && (
          <>
            <Tarjeta>
              <TarjetaCabecera
                titulo="Identidad"
                nota={estado ? <Pildora tono={estado.tono}>{estado.texto}</Pildora> : undefined}
              />
              <div className="cuenta__rejilla">
                <Dato etiqueta="Código" valor={c.account.publicId || "—"} />
                <Dato etiqueta="Nombre comercial" valor={c.account.displayName || "—"} />
                <Dato etiqueta="Razón social" valor={c.account.legalName || "—"} />
                <Dato etiqueta="País" valor={c.account.country || "—"} />
              </div>
              <p className="cuenta__nota">
                Estos datos los fija CGuard Pro. Si alguno no es correcto, escríbenos.
              </p>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo="Facturación" />
              <div className="cuenta__rejilla">
                <Dato etiqueta="Correo de facturación" valor={c.billing.billingEmail || "—"} />
              </div>
              <p className="cuenta__nota">
                Es la dirección a la que CGuard Pro te envía tus facturas.
              </p>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo="Tu sesión" />
              <div className="cuenta__rejilla">
                <Dato etiqueta="Persona" valor={c.session.fullName || c.session.email || "—"} />
                <Dato etiqueta="Correo" valor={c.session.email || "—"} />
                <Dato
                  etiqueta="Rol"
                  valor={c.session.role ? (ROL[c.session.role] || c.session.role) : "—"}
                />
              </div>
            </Tarjeta>

            <Tarjeta>
              <TarjetaCabecera titulo="Dónde se cambia cada cosa" />
              <ul className="cuenta__enlaces">
                <li>
                  <Link to="/branding">Tu marca</Link>
                  <span>
                    Logotipos, color, nombre de plataforma, lema y datos de soporte.
                  </span>
                </li>
                <li>
                  <Link to="/contract">Tu contrato</Link>
                  <span>Las condiciones comerciales. Las fija CGuard Pro.</span>
                </li>
                <li>
                  <Link to="/entitlements">Plan y derechos</Link>
                  <span>Módulos incluidos y límite de empresas. Los licencia CGuard Pro.</span>
                </li>
              </ul>
            </Tarjeta>
          </>
        )}
      </EstadoDeDatos>
    </section>
  );
}

export default Cuenta;
