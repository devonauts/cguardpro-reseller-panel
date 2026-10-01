import { useCallback, useEffect, useState } from "react";

import { Boton, Campo, CampoCopiable, Confirmar, Estado, EstadoDeDatos, Panel, Pildora } from "@/components/cristal";
import { Pagina, Tabla, TablaCelda, TablaFila } from "@/components/panel";
import { GuiaDns } from "@/components/dominios/GuiaDns";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { useIdioma } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { hostRelativo } from "@/lib/nombreDns";
import { correoService, type CorreoDelSocio, type RegistroDeCorreo } from "@/services/resellerService";
/* La guía por proveedor trae sus estilos en la hoja de Dominios. */
import "./Dominios.scss";
import "./Correo.scss";

/**
 * Desde qué dirección reciben los clientes del socio sus correos.
 *
 * Sin dominio propio salen de `notificaciones@<socio>.mainconnector.com`, que ya
 * está autenticado y no nombra a la plataforma. Con el suyo, tras pegar tres
 * CNAME en su DNS, salen de `notificaciones@<su dominio>`. Se comprueba una vez
 * al añadirlo y, después, sólo cuando el socio pulsa «Verificar ahora»: no hay
 * comprobación automática, así que el botón manda mientras no esté verificado.
 */

/** El dominio neutro, por si el socio quita el suyo ya verificado. */
const DOMINIO_NEUTRO = "mainconnector.com";

const ESTADO: Record<string, { tono: "ok" | "aviso" | "peligro"; texto: Clave; ayuda: Clave }> = {
  pending: { tono: "aviso", texto: "correo.pendiente", ayuda: "correo.pendienteAyuda" },
  verified: { tono: "ok", texto: "correo.verificado", ayuda: "correo.verificadoAyuda" },
  failed: { tono: "peligro", texto: "correo.fallo", ayuda: "correo.falloAyuda" },
};

/** «hace 5 min», «ayer»… en el idioma del panel. */
function haceCuanto(iso: string, idioma: string): string {
  const seg = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: "auto" });
  const abs = Math.abs(seg);
  if (abs < 45) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), "hour");
  return rtf.format(Math.round(seg / 86400), "day");
}

function Validez({ valido }: { valido: boolean | null }) {
  const { t } = useIdioma();
  if (valido === true) return <Pildora tono="ok">{t("correo.registroBien")}</Pildora>;
  if (valido === false) return <Pildora tono="peligro">{t("correo.registroMal")}</Pildora>;
  return <Pildora tono="neutro">{t("correo.registroSinComprobar")}</Pildora>;
}

function Registros({ registros, dominio }: { registros: RegistroDeCorreo[]; dominio: string }) {
  const { t } = useIdioma();
  const columnas = [t("dominios.dnsTipo"), t("dominios.dnsHost"), t("dominios.dnsValor"), t("dominios.estadoEtiqueta")];
  return (
    <Tabla columnas={columnas} etiqueta={t("correo.registrosTitulo")}>
      {registros.map((r) => (
        <TablaFila key={r.clave}>
          <TablaCelda etiqueta={columnas[0]} principal>
            <span className="correo__tipo">{r.tipo}</span>
          </TablaCelda>
          <TablaCelda etiqueta={columnas[1]}>
            <CampoCopiable etiqueta={t("dominios.dnsHost")} valor={hostRelativo(r.host, dominio)} />
          </TablaCelda>
          <TablaCelda etiqueta={columnas[2]}>
            <CampoCopiable etiqueta={t("dominios.dnsDestino")} valor={r.valor} />
          </TablaCelda>
          <TablaCelda etiqueta={columnas[3]}>
            <Validez valido={r.valido} />
          </TablaCelda>
        </TablaFila>
      ))}
    </Tabla>
  );
}

export function Correo() {
  const { puede } = useResellerAuth();
  const { t, idioma } = useIdioma();
  const gestiona = puede("reseller.domain.manage");

  const [datos, setDatos] = useState<CorreoDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await correoService.ver());
    } catch (e: any) {
      setError(e?.message || t("correo.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  /* Las tres acciones devuelven la vista entera: se pinta tal cual, sin recargar. */
  const accion = async (fn: () => Promise<CorreoDelSocio>, exito?: string) => {
    setEnviando(true);
    setAviso(null);
    try {
      setDatos(await fn());
      if (exito) setAviso(exito);
      return true;
    } catch (e: any) {
      setAviso(e?.message || t("comun.noSePudoAccion"));
      return false;
    } finally {
      setEnviando(false);
    }
  };

  const usar = async (e: React.FormEvent) => {
    e.preventDefault();
    const dominio = nuevo.trim();
    if (!dominio) return;
    if (await accion(() => correoService.usarDominio(dominio), t("correo.anadido"))) setNuevo("");
  };

  const dominio = datos?.dominio ?? null;
  const verificado = datos?.estado === "verified";
  const est = ESTADO[datos?.estado ?? "pending"] ?? ESTADO.pending;
  const primero = datos?.registros?.[0] ?? null;
  /* Si ya sale desde el suyo, quitarlo lo devuelve al dominio neutro. */
  const neutro = verificado ? DOMINIO_NEUTRO : (datos?.remitenteActual ?? DOMINIO_NEUTRO);

  return (
    <Pagina titulo={t("correo.titulo")} nota={t("correo.sub")}>
      {aviso && <p className="correo__aviso">{aviso}</p>}

      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {datos && (
          <Panel titulo={t("correo.remitenteTitulo")}>
            <p className="correo__cabecera">
              {t("correo.remitenteAntes")} <strong className="correo__direccion">{datos.remitenteActual}</strong>
              {t("correo.remitenteDespues")}
            </p>

            {!dominio && gestiona && (
              <form className="correo__alta" onSubmit={usar}>
                <Campo
                  id="dominio-de-correo"
                  etiqueta={t("correo.campoDominio")}
                  placeholder={t("correo.ejemplo")}
                  value={nuevo}
                  onChange={(e) => setNuevo(e.target.value)}
                  disabled={enviando}
                />
                <Boton type="submit" disabled={enviando || !nuevo.trim()}>
                  {t("correo.usar")}
                </Boton>
              </form>
            )}

            {!dominio && !gestiona && <p className="correo__vacio">{t("correo.sinDominio")}</p>}

            {dominio && (
              <div className="correo__dominio">
                <div className="correo__fila">
                  <span className="correo__rotulo">{t("correo.tuDominio")}</span>
                  <span className="correo__direccion">{dominio}</span>
                </div>

                <Estado
                  etiqueta={t("dominios.estadoEtiqueta")}
                  tono={est.tono}
                  texto={t(est.texto)}
                  explicacion={t(est.ayuda)}
                />

                {verificado && datos.remitenteConDominioPropio && (
                  <p className="correo__exito">
                    {t("correo.salenDesde")} <strong className="correo__direccion">{datos.remitenteConDominioPropio}</strong>
                  </p>
                )}

                {datos.motivo && !verificado && <p className="correo__fallo">{datos.motivo}</p>}

                {datos.comprobadoEn && (
                  <p className="correo__meta">
                    {t("correo.comprobado", { f: haceCuanto(datos.comprobadoEn, idioma) })}
                  </p>
                )}

                {datos.registros.length > 0 && (
                  <section className="correo__registros">
                    <h4 className="correo__subtitulo">{t("correo.registrosTitulo")}</h4>
                    {!verificado && <p className="correo__intro">{t("correo.registrosIntro")}</p>}
                    <Registros registros={datos.registros} dominio={dominio} />
                    {!verificado && (
                      <>
                        <p className="correo__intro">{t("dominios.dnsHostAyuda", { dominio })}</p>
                        {primero && (
                          <GuiaDns host={hostRelativo(primero.host, dominio)} destino={primero.valor} dominio={dominio} />
                        )}
                        <p className="correo__intro">{t("correo.registrosPie")}</p>
                      </>
                    )}
                  </section>
                )}

                {gestiona && (
                  <div className="correo__acciones">
                    <Boton
                      variante={verificado ? "suave" : "primario"}
                      type="button"
                      disabled={enviando}
                      onClick={() => accion(() => correoService.verificar())}
                    >
                      {t("correo.verificar")}
                    </Boton>
                    <Confirmar
                      variante="peligro"
                      disabled={enviando}
                      pregunta={t("correo.quitarPregunta", { remitente: neutro })}
                      onConfirmar={async () => { await accion(() => correoService.quitar(), t("correo.quitado")); }}
                    >
                      {t("correo.quitar")}
                    </Confirmar>
                  </div>
                )}
              </div>
            )}
          </Panel>
        )}
      </EstadoDeDatos>
    </Pagina>
  );
}

export default Correo;
