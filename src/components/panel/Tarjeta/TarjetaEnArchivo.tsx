import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";

import { Boton, Icono, Panel } from "@/components/cristal";
import { billingService, type TarjetaDelSocio } from "@/services/resellerService";
import { useIdioma } from "@/i18n/IdiomaProvider";
import "./TarjetaEnArchivo.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA TARJETA CON LA QUE SE TE COBRA
 *
 * ── EL NÚMERO NO PASA POR AQUÍ ────────────────────────────────────────────
 * Lo recoge Stripe dentro de su propio iframe, servido desde su dominio. Este
 * componente nunca ve un dígito: monta el hueco, y lo que recibe de vuelta es
 * una referencia (`pm_…`) que el servidor confirma contra Stripe. Por eso el
 * formulario no tiene ningún `<input>` de tarjeta — si lo tuviera, el número
 * pasaría por nuestro JavaScript y eso cambia de arriba abajo lo que hay que
 * cumplir para guardarlo.
 *
 * ── LA CLAVE PÚBLICA LA DA EL SERVIDOR ────────────────────────────────────
 * No está escrita aquí ni en un `.env` del paquete: viene con el permiso de
 * guardado. Así el panel sigue al modo que tenga la plataforma —prueba o
 * producción— sin recompilarse, y no hay una segunda copia que se quede
 * desfasada el día que se rote.
 *
 * ── VALIDADA NO SE QUITA, Y SE DICE ANTES ─────────────────────────────────
 * La regla la impone el servidor. Aquí no se esconde el botón de quitar y ya:
 * se explica, porque un botón que desaparece sin motivo se lee como un fallo y
 * acaba en una consulta a soporte.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Una marca conocida se enseña con su nombre propio; el resto, tal cual. */
const MARCAS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function TarjetaEnArchivo() {
  const { t, idioma } = useIdioma();
  const [tarjeta, setTarjeta] = useState<TarjetaDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  /** Bumped when a Stripe field is created; the effect mounts it into the box. */
  const [campoNuevo, setCampoNuevo] = useState(0);

  /* Stripe y su campo viven en refs y no en estado: montarlos es un efecto
     secundario sobre el DOM, y meterlos en `useState` provocaría un re-render
     por cada paso del montaje sin que nada de eso se pinte. */
  const stripeRef = useRef<Stripe | null>(null);
  const campoRef = useRef<StripeCardElement | null>(null);
  const hueco = useRef<HTMLDivElement | null>(null);
  const secreto = useRef<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await billingService.tarjeta();
      setTarjeta(r.card);
    } catch (e: any) {
      setError(e?.message || t("tarjeta.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Desmonta el campo de Stripe. Se llama al cancelar y al terminar. */
  const cerrarFormulario = useCallback(() => {
    try { campoRef.current?.unmount(); } catch { /* ya estaba fuera */ }
    campoRef.current = null;
    secreto.current = null;
    setEditando(false);
  }, []);

  useEffect(() => cerrarFormulario, [cerrarFormulario]);

  /** Pide el permiso al servidor y monta el campo de Stripe. */
  const empezar = async () => {
    setError(null);
    setAviso(null);
    setEditando(true);
    try {
      const permiso = await billingService.intentoDeGuardado();
      secreto.current = permiso.clientSecret;

      const stripe = await loadStripe(permiso.publishableKey);
      if (!stripe) throw new Error(t("tarjeta.noStripe"));
      stripeRef.current = stripe;

      /* El idioma del campo lo pone Stripe, y por defecto lo saca del
         navegador: un socio con Chrome en inglés veía «Card number» dentro de
         un panel en español. Se le pasa el del PANEL, que es el que la persona
         eligió. */
      const elements = stripe.elements({ locale: idioma });
      const campo = elements.create("card", {
        hidePostalCode: true,
        /* El iframe de Stripe no hereda nuestras hojas: los colores se le pasan
           uno a uno. Salen de las fichas de diseño leídas del documento, para
           que el campo siga al panel y no haya una segunda paleta que se quede
           atrás el día que cambie la nuestra. */
        style: { base: estiloDelCampo() },
      });
      campo.on("change", (e) => setError(e.error?.message ?? null));

      /* Mounted by an effect once the box is rendered: a requestAnimationFrame
         could run before React committed it and the field never appeared. */
      campoRef.current = campo;
      setCampoNuevo((n) => n + 1);
    } catch (e: any) {
      setError(e?.message || t("tarjeta.noEmpezo"));
      setEditando(false);
    }
  };

  useEffect(() => {
    const campo = campoRef.current;
    if (!campoNuevo || !campo || !hueco.current) return;
    try { campo.mount(hueco.current); } catch { /* already mounted */ }
  }, [campoNuevo, editando]);

  const guardar = async () => {
    if (!stripeRef.current || !campoRef.current || !secreto.current || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      /* Stripe valida la tarjeta con el banco. Lo que vuelve es una referencia;
         el número ya se quedó en su lado. */
      const r = await stripeRef.current.confirmCardSetup(secreto.current, {
        payment_method: { card: campoRef.current },
      });

      if (r.error) {
        setError(r.error.message || t("tarjeta.noGuardo"));
        return;
      }

      const pm = r.setupIntent?.payment_method;
      if (!pm) {
        setError(t("tarjeta.noGuardo"));
        return;
      }

      const { card } = await billingService.confirmarTarjeta(String(pm));
      setTarjeta(card);
      setAviso(t("tarjeta.guardada"));
      cerrarFormulario();
    } catch (e: any) {
      setError(e?.message || t("tarjeta.noGuardo"));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    setError(null);
    try {
      await billingService.quitarTarjeta();
      await cargar();
      setAviso(t("tarjeta.quitada"));
    } catch (e: any) {
      // El 409 del servidor cuando ya está validada trae su propio motivo.
      setError(e?.message || t("tarjeta.noQuito"));
    }
  };

  const marca = tarjeta?.brand ? (MARCAS[tarjeta.brand] ?? tarjeta.brand) : null;

  return (
    <Panel
      titulo={t("tarjeta.titulo")}
      nota={t("tarjeta.sub")}
      acciones={
        !editando && (
          <Boton variante="suave" onClick={empezar} disabled={cargando}>
            {t(tarjeta?.hasCard ? "tarjeta.sustituir" : "tarjeta.anadir")}
          </Boton>
        )
      }
    >
      <div className="tarjeta">
        {tarjeta?.hasCard && !editando && (
          <div className="tarjeta__actual">
            <span className="tarjeta__icono"><Icono nombre="tarjeta" tamano={20} /></span>
            <span className="tarjeta__datos">
              <span className="tarjeta__marca">
                {marca} ···· {tarjeta.last4}
              </span>
              {tarjeta.expMonth && tarjeta.expYear && (
                <span className="tarjeta__caduca">
                  {t("tarjeta.caduca", {
                    mes: String(tarjeta.expMonth).padStart(2, "0"),
                    anio: String(tarjeta.expYear),
                  })}
                </span>
              )}
            </span>
          </div>
        )}

        {!tarjeta?.hasCard && !editando && !cargando && (
          <p className="tarjeta__texto">{t("tarjeta.sinTarjeta")}</p>
        )}

        {editando && (
          <div className="tarjeta__formulario">
            {/* Aquí dentro monta Stripe su campo. El número no toca este árbol. */}
            <div className="tarjeta__campo" ref={hueco} />
            <p className="tarjeta__apunte">{t("tarjeta.seguro")}</p>
            <div className="tarjeta__botones">
              <Boton variante="fantasma" onClick={cerrarFormulario} disabled={guardando}>
                {t("comun.cancelar")}
              </Boton>
              <Boton onClick={guardar} cargando={guardando}>
                {t("tarjeta.guardar")}
              </Boton>
            </div>
          </div>
        )}

        {error && <p role="alert" className="tarjeta__error">{error}</p>}
        {aviso && <p role="status" className="tarjeta__aviso">{aviso}</p>}

        {/* La regla, dicha antes de que alguien la busque. */}
        {tarjeta?.hasCard && tarjeta.locked && !editando && (
          <p className="tarjeta__apunte">{t("tarjeta.bloqueada")}</p>
        )}

        {tarjeta?.hasCard && !tarjeta.locked && !editando && (
          <button type="button" className="tarjeta__quitar" onClick={quitar}>
            {t("tarjeta.quitar")}
          </button>
        )}
      </div>
    </Panel>
  );
}

/**
 * Los colores del campo de Stripe, leídos de nuestras fichas.
 *
 * `getComputedStyle` sobre la raíz devuelve el valor ya resuelto de cada ficha.
 * Escribirlos a mano aquí crearía una segunda paleta —la del iframe— que se
 * quedaría vieja en cuanto alguien tocara `tokens.css`.
 */
export function estiloDelCampo(): Record<string, string> {
  const raiz = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement)
    : null;
  const ficha = (nombre: string, respaldo: string) =>
    (raiz?.getPropertyValue(nombre) || "").trim() || respaldo;

  return {
    color: ficha("--text-primary", "#f5f5f5"),
    fontFamily: ficha("--font", "Inter, system-ui, sans-serif"),
    fontSize: "14px",
    "::placeholder": { color: ficha("--text-muted", "#9b9b9b") } as unknown as string,
  };
}

export default TarjetaEnArchivo;
