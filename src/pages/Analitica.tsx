import { FormEvent, useCallback, useEffect, useState } from "react";

import { Boton, Campo, EstadoDeDatos, Panel } from "@/components/cristal";
import { analiticaService } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import "./Analitica.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA MEDICIÓN DEL SOCIO
 *
 * Su GA4 y su GTM, para medir SU embudo en SU anfitrión: quién se registra y
 * quién acaba pagando un plan. Nuestra analítica no le sirve — no la ve, y
 * mezcla su tráfico con el de todos los demás.
 *
 * ── SE PIDE UN IDENTIFICADOR, NO UNA ETIQUETA ─────────────────────────────
 * El campo dice la FORMA que se espera (`G-…`, `GTM-…`) y el servidor la
 * comprueba. Aceptar el fragmento que Google da para copiar y pegar sería
 * dejar que un socio inyecte el código que quiera en un anfitrión que sirve
 * CGuardPro y por el que pasan las sesiones de sus clientes.
 *
 * ── SE DICE DÓNDE SE APLICA ───────────────────────────────────────────────
 * En su anfitrión, no en este panel. Sin decirlo, lo razonable es suponer lo
 * contrario —«lo pongo aquí, luego mide aquí»— y el socio acabaría preguntando
 * por qué no ve sus propias visitas.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function Analitica() {
  const t = useT();
  const [ga4, setGa4] = useState("");
  const [gtm, setGtm] = useState("");
  const [donde, setDonde] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Save errors stay next to the form; only a failed LOAD replaces the page
  // (a 400 used to wipe the form and what the partner had typed).
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);
  const { puede } = useResellerAuth();
  const edita = puede("reseller.settings.manage");
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await analiticaService.leer();
      setGa4(r.analytics.ga4MeasurementId ?? "");
      setGtm(r.analytics.gtmContainerId ?? "");
      setDonde(r.appliesTo);
    } catch (e: any) {
      setError(e?.message || t("analitica.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setErrorAlGuardar(null);
    setAviso(null);
    try {
      const r = await analiticaService.guardar({
        ga4MeasurementId: ga4.trim(),
        gtmContainerId: gtm.trim(),
      });
      setGa4(r.analytics.ga4MeasurementId ?? "");
      setGtm(r.analytics.gtmContainerId ?? "");
      setAviso(t("analitica.guardada"));
    } catch (e: any) {
      // El 400 del servidor explica QUÉ identificador no tiene la forma buena.
      setErrorAlGuardar(e?.message || t("analitica.noGuardo"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("analitica.titulo")}</h1>
          <p className="cabecera__sub">{t("analitica.sub")}</p>
        </div>
      </header>

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        <Panel titulo={t("analitica.google")} nota={t("analitica.googleNota")}>
          <form className="analitica" onSubmit={guardar} noValidate>
            <Campo
              etiqueta={t("analitica.ga4")}
              ayuda={t("analitica.ga4Ayuda")}
              placeholder="G-XXXXXXXXXX"
              value={ga4}
              disabled={!edita}
              onChange={(e) => setGa4(e.target.value)}
            />
            <Campo
              etiqueta={t("analitica.gtm")}
              ayuda={t("analitica.gtmAyuda")}
              placeholder="GTM-XXXXXXX"
              value={gtm}
              disabled={!edita}
              onChange={(e) => setGtm(e.target.value)}
            />

            {/* Dónde se aplica, con el anfitrión por su nombre. */}
            {donde && <p className="analitica__donde">{t("analitica.donde", { host: donde })}</p>}

            <p className="analitica__eventos">{t("analitica.eventos")}</p>

            {errorAlGuardar && <p role="alert" className="analitica__error">{errorAlGuardar}</p>}
            {!edita && <p className="analitica__eventos">{t("analitica.soloLectura")}</p>}
            {aviso && <p role="status" className="analitica__aviso">{aviso}</p>}

            {edita && (
              <div className="analitica__pie">
                <Boton type="submit" cargando={guardando}>{t("comun.guardar")}</Boton>
              </div>
            )}
          </form>
        </Panel>
      </EstadoDeDatos>
    </>
  );
}

export default Analitica;
