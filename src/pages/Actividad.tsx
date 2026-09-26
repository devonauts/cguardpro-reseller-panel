import { useCallback, useEffect, useState } from "react";

import { Boton, EstadoDeDatos, Tarjeta, TarjetaCabecera, Pildora } from "@/components/cristal";
import { Pagina } from "@/components/panel";
import { fechaYHora } from "@/lib/dinero";
import { fraseDeActividad, motivoDeActividad, quienDeActividad } from "@/lib/fraseDeActividad";
import { portalService, type ActividadDelSocio, type LineaDeActividad } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./Actividad.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ACTIVIDAD — EL HISTORIAL ADMINISTRATIVO DE LA CUENTA
 *
 * ── LO QUE ESTO NO ES ─────────────────────────────────────────────────────
 * No es actividad operativa. Aquí no hay un vigilante fichando, ni una ronda,
 * ni un incidente, ni un pánico: eso ocurre DENTRO de las empresas y un socio
 * no tiene autoridad operativa sobre ninguna. La propiedad comercial no da
 * acceso a la operación, y esta pantalla es donde más fácil sería confundirlo
 * — por eso lo dice en la cabecera y no sólo en un comentario.
 *
 * Lo que sí hay: qué se cambió en la marca, qué empresa se dio de alta, qué
 * decidió CGuardPro sobre el ciclo de vida de la cuenta.
 *
 * ── UNA FRASE, NO UNA FICHA TÉCNICA ────────────────────────────────────────
 * Cada línea dice qué pasó en palabras de persona («Se añadió el dominio
 * admin.tuempresa.com»), quién lo hizo y cuándo. Antes enseñaba el
 * identificador de la acción, el tipo de objeto en código y una lista de
 * «Campos: brandHue» — nada que un distribuidor pueda leer. La frase la arma
 * `lib/fraseDeActividad`, que nunca pinta un identificador.
 *
 * ── SE PAGINA ─────────────────────────────────────────────────────────────
 * Este registro crece con cada acción. Una pantalla que se lo traiga entero
 * funciona el primer mes y se cae el segundo.
 * ════════════════════════════════════════════════════════════════════════════
 */

export function Actividad() {
  const t = useT();
  const [datos, setDatos] = useState<ActividadDelSocio | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (p: number) => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await portalService.actividad(p, 25));
    } catch (e: any) {
      setError(e?.message || t("actividad.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(pagina); }, [cargar, pagina]);

  const filas: LineaDeActividad[] = datos?.rows ?? [];
  const total = datos?.totalPages ?? 1;

  return (
    <Pagina titulo={t("actividad.titulo")} nota={t("actividad.nota")}>

      <Tarjeta>
        <TarjetaCabecera
          titulo={t("actividad.historial")}
          nota={datos
            ? t(datos.count === 1 ? "actividad.registroUno" : "actividad.registrosVarios",
                { n: datos.count })
            : undefined}
        />
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!cargando && !error && filas.length === 0}
          etiquetaVacio={t("actividad.vacio")}
          onReintentar={() => cargar(pagina)}
        >
          <ul className="actividad__lista">
            {filas.map((f) => (
              <li key={f.id} className="actividad__fila">
                <div className="actividad__cab">
                  <span className="actividad__accion">{fraseDeActividad(f)}</span>
                  {f.statusCode && f.statusCode >= 400 && (
                    <Pildora tono="peligro">{t("actividad.error")}</Pildora>
                  )}
                </div>
                {motivoDeActividad(f) && (
                  <p className="actividad__motivo">
                    {t("actividad.motivo", { motivo: motivoDeActividad(f)! })}
                  </p>
                )}
                <div className="actividad__meta">
                  <span>{fechaYHora(f.at)}</span>
                  <span>· {quienDeActividad(f)}</span>
                </div>
              </li>
            ))}
          </ul>

          {total > 1 && (
            <nav className="actividad__paginas" aria-label={t("actividad.paginas")}>
              <Boton
                variante="suave"
                disabled={pagina === 0 || cargando}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                {t("comun.anterior")}
              </Boton>
              <span className="actividad__contador">
                {t("actividad.paginaDe", { a: pagina + 1, b: total })}
              </span>
              <Boton
                variante="suave"
                disabled={pagina + 1 >= total || cargando}
                onClick={() => setPagina((p) => p + 1)}
              >
                {t("comun.siguiente")}
              </Boton>
            </nav>
          )}
        </EstadoDeDatos>
      </Tarjeta>
    </Pagina>
  );
}

export default Actividad;
