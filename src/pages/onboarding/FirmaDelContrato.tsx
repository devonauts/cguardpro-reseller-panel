import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boton, Campo, EstadoDeDatos } from "@/components/cristal";
import { LienzoDeFirma } from "@/components/firma/LienzoDeFirma";
import { contratoService, type ContratoDelSocio } from "@/services/resellerService";
import { fechaYHora } from "@/lib/dinero";
import { useT } from "@/i18n/IdiomaProvider";
import { idioma } from "@/i18n/idioma";
import "./FirmaDelContrato.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE PARTNER SIGNS THE WHITE LABEL RESELLER AGREEMENT
 *
 * DocuSign-style: every clause and schedule carries its own initials box, a
 * sticky bar counts what is left and jumps to the next pending one, and the
 * signature block at the end is only enabled once all 37 are initialed.
 *
 * The text comes from the server already filled with THIS partner's contract
 * and application, in both languages; English prevails (clause 31.9), so the
 * switch is always visible. The signature is drawn, a photo is taken on the
 * spot, the device location is shared, and the partner accepts — in plain
 * words — everything that is kept as evidence.
 * ════════════════════════════════════════════════════════════════════════════
 */

type Lengua = "es" | "en";

function inicialesSugeridas(nombre: string | null | undefined): string {
  return String(nombre || "")
    .split(/\s+/).filter(Boolean).slice(0, 3)
    .map((p) => p[0]?.toUpperCase() ?? "").join("");
}

interface Ubicacion { latitude: number; longitude: number; accuracy: number }

export function FirmaDelContrato({ onFirmado }: { onFirmado: () => void }) {
  const t = useT();
  const [c, setC] = useState<ContratoDelSocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lengua, setLengua] = useState<Lengua>(idioma() === "en" ? "en" : "es");
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [errorDeBloque, setErrorDeBloque] = useState<{ id: string; msg: string } | null>(null);

  // Signature block
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [licencia, setLicencia] = useState("");
  const [firma, setFirma] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaFoto, setVistaFoto] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [consiento, setConsiento] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  /** The initials field of each clause: where "Next pending" lands. */
  const anclas = useRef<Record<string, HTMLElement | null>>({});
  const entradaFoto = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await contratoService.ver();
      setC(r);
      // Everything already known comes filled in; the partner only corrects.
      const sug = r.signerDefaults;
      const adm = r.values?.scheduleB.authorizedAdmin;
      setNombre((n) => n || sug?.name || adm?.name || "");
      setCargo((x) => x || sug?.title || "");
      setDireccion((d) => d || sug?.address || r.values?.reseller.address || "");
      setLicencia((x) => x || sug?.licence || "");
    } catch (e: any) {
      setError(e?.message || t("firma.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => () => { if (vistaFoto) URL.revokeObjectURL(vistaFoto); }, [vistaFoto]);

  const bloques = (lengua === "en" ? c?.en : c?.es) ?? [];
  const aIniciar = c?.blocksToInitial ?? [];
  const iniciales = c?.initials ?? {};
  const hechas = aIniciar.filter((id) => iniciales[id]).length;
  const pendientes = aIniciar.filter((id) => !iniciales[id]);
  const sugeridas = useMemo(
    () => inicialesSugeridas(c?.signerDefaults?.name || c?.values?.scheduleB.authorizedAdmin.name),
    [c],
  );

  const [destacada, setDestacada] = useState<string | null>(null);

  /**
   * To the exact spot where the initials go — not the top of a long clause —
   * centred on screen, with the field focused and briefly highlighted. Scrolls
   * whichever container actually scrolls (the page or the wizard's panel).
   */
  const irA = (id: string | undefined) => {
    if (!id) return;
    const el = anclas.current[id] ?? refs.current[id];
    if (!el) return;
    let p: HTMLElement | null = el.parentElement;
    while (p && !(/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)) {
      p = p.parentElement;
    }
    const pagina = (document.scrollingElement as HTMLElement) || document.documentElement;
    const caja = p ?? pagina;
    const arriba = caja === pagina ? 0 : caja.getBoundingClientRect().top;
    const r = el.getBoundingClientRect();
    const alto = caja === pagina ? window.innerHeight : caja.clientHeight;
    caja.scrollTo({ top: caja.scrollTop + r.top - arriba - alto / 2 + r.height / 2, behavior: "smooth" });
    setDestacada(id);
    window.setTimeout(() => {
      const campo = el.querySelector<HTMLInputElement>("input, canvas, button");
      if (campo instanceof HTMLInputElement) { campo.focus({ preventScroll: true }); campo.select(); }
    }, 450);
    window.setTimeout(() => setDestacada((d) => (d === id ? null : d)), 1800);
  };

  const iniciar = async (id: string) => {
    const texto = (borrador[id] ?? sugeridas).trim();
    setErrorDeBloque(null);
    setOcupado(id);
    try {
      const r = await contratoService.iniciales(id, texto);
      setC((prev) => (prev ? {
        ...prev, initials: { ...(prev.initials ?? {}), [id]: { initials: r.initials, at: new Date().toISOString() } },
      } : prev));
      // Remember what they typed as the default for the next clause.
      setBorrador((b) => ({ ...b, __ultimo: r.initials }));
      if (r.next) window.setTimeout(() => irA(r.next!), 150);
      else window.setTimeout(() => irA("__firma"), 150);
    } catch (e: any) {
      setErrorDeBloque({ id, msg: e?.message || t("firma.inicialesFallo") });
    } finally {
      setOcupado(null);
    }
  };

  const pedirUbicacion = () => {
    setErrorUbicacion(null);
    if (!navigator.geolocation) { setErrorUbicacion(t("firma.ubicacionNoDisponible")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setUbicacion({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => setErrorUbicacion(t("firma.ubicacionDenegada")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    setFoto(f);
    setVistaFoto(f ? URL.createObjectURL(f) : null);
  };

  const listoParaFirmar = pendientes.length === 0 && !!nombre.trim() && !!cargo.trim() && !!licencia.trim()
    && !!firma && !!foto && !!ubicacion && consiento;

  const firmar = async () => {
    if (!listoParaFirmar || firmando) return;
    setErrorFirma(null);
    setFirmando(true);
    try {
      const datos = new FormData();
      datos.append("name", nombre.trim());
      datos.append("title", cargo.trim());
      datos.append("address", direccion.trim());
      datos.append("licence", licencia.trim());
      datos.append("signature", firma!);
      datos.append("latitude", String(ubicacion!.latitude));
      datos.append("longitude", String(ubicacion!.longitude));
      datos.append("accuracy", String(Math.round(ubicacion!.accuracy)));
      datos.append("consent", "true");
      datos.append("photo", foto!);
      await contratoService.firmar(datos);
      onFirmado();
    } catch (e: any) {
      setErrorFirma(e?.message || t("firma.firmaFallo"));
    } finally {
      setFirmando(false);
    }
  };

  return (
    <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
      {c && !c.available && (
        <div className="contrato__aviso" role="status">{t("firma.noDisponible")}</div>
      )}
      {c?.available && (
        <div className="contrato">
          <header className="contrato__cabecera">
            <p className="contrato__rotulo">{t("firma.rotulo")}</p>
            <h1 className="contrato__titulo">{t("firma.titulo")}</h1>
            <p className="contrato__sub">{t("firma.sub")}</p>
          </header>

          {/* ── The sticky progress bar ─────────────────────────────── */}
          <div className="contrato__barra">
            <span className="contrato__progreso">
              {t("firma.progreso", { a: hechas, b: aIniciar.length })}
            </span>
            <div className="contrato__lenguas" role="group" aria-label={t("firma.idioma")}>
              {(["es", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`contrato__lengua${lengua === l ? " contrato__lengua--activa" : ""}`}
                  aria-pressed={lengua === l}
                  onClick={() => setLengua(l)}
                >
                  {t(l === "es" ? "firma.lenguaEs" : "firma.lenguaEn")}
                </button>
              ))}
            </div>
            <Boton variante="suave" onClick={() => irA(pendientes[0] ?? "__firma")}>
              {t(pendientes.length ? "firma.siguiente" : "firma.irAFirmar")}
            </Boton>
          </div>
          <p className="contrato__prevalece">{t("firma.prevalece")}</p>

          {/* ── The clauses ─────────────────────────────────────────── */}
          {bloques.map((b) => {
            const lleva = aIniciar.includes(b.id);
            const puesta = iniciales[b.id];
            return (
              <section
                key={b.id}
                ref={(el) => { refs.current[b.id] = el; }}
                className={`clausula${puesta ? " clausula--firmada" : ""}`}
                aria-labelledby={`cl-${b.id}`}
              >
                {b.id !== "preambulo" && (
                  <h2 id={`cl-${b.id}`} className="clausula__titulo">
                    {b.tipo === "anexo"
                      ? `${lengua === "en" ? "Schedule" : "Anexo"} ${b.id} — ${b.titulo}`
                      : `${b.id}. ${b.titulo}`}
                  </h2>
                )}
                {b.parrafos.map((p, i) => <p key={i} className="clausula__texto">{p}</p>)}

                {lleva && (
                  <div
                    ref={(el) => { anclas.current[b.id] = el; }}
                    className={`clausula__iniciales${destacada === b.id ? " clausula__iniciales--destacada" : ""}`}
                  >
                    {puesta ? (
                      <span className="clausula__sello">
                        <strong>{puesta.initials}</strong>
                        <span>{t("firma.iniciadaEl", { f: fechaYHora(puesta.at) })}</span>
                      </span>
                    ) : (
                      <>
                        <Campo
                          etiqueta={t("firma.tusIniciales")}
                          value={borrador[b.id] ?? borrador.__ultimo ?? sugeridas}
                          maxLength={4}
                          autoCapitalize="characters"
                          onChange={(e) => setBorrador((x) => ({ ...x, [b.id]: e.target.value }))}
                          // Enter initials the clause and moves on: no mouse trip per clause.
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void iniciar(b.id); } }}
                        />
                        <Boton cargando={ocupado === b.id} onClick={() => iniciar(b.id)}>
                          {t("firma.ponerIniciales")}
                        </Boton>
                      </>
                    )}
                    {errorDeBloque?.id === b.id && <p role="alert" className="contrato__error">{errorDeBloque.msg}</p>}
                  </div>
                )}
              </section>
            );
          })}

          {/* ── Signatures ──────────────────────────────────────────── */}
          <section
            ref={(el) => { refs.current.__firma = el; }}
            className="firmas"
            aria-labelledby="cl-firmas"
          >
            <h2 id="cl-firmas" className="clausula__titulo">{t("firma.firmasTitulo")}</h2>

            <div className="firmas__cgp">
              <p className="firmas__parte">C GUARD PRO LLC</p>
              {c.cgpSigner?.image && <img className="firmas__imagen" src={c.cgpSigner.image} alt={t("firma.firmaDe", { n: c.cgpSigner.name })} />}
              <p className="firmas__dato">{c.cgpSigner?.name} · {c.cgpSigner?.title}</p>
              <p className="firmas__nota">{t("firma.cgpFirmo", { f: c.cgpSigner?.signedAt ? fechaYHora(c.cgpSigner.signedAt) : "—" })}</p>
            </div>

            <div className="firmas__socio">
              <p className="firmas__parte">{c.values?.reseller.legalName}</p>
              {pendientes.length > 0 && (
                <p className="contrato__aviso" role="status">{t("firma.faltanIniciales", { n: pendientes.length })}</p>
              )}
              <fieldset className="firmas__campos" disabled={pendientes.length > 0}>
                <Campo etiqueta={t("firma.nombre")} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                <Campo etiqueta={t("firma.cargo")} value={cargo} onChange={(e) => setCargo(e.target.value)} />
                <Campo etiqueta={t("firma.direccion")} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                <Campo
                  etiqueta={t("firma.licencia")}
                  ayuda={t("firma.licenciaAyuda")}
                  value={licencia}
                  onChange={(e) => setLicencia(e.target.value)}
                />

                <div className="firmas__paso">
                  <p className="firmas__etiqueta">{t("firma.dibuja")}</p>
                  <LienzoDeFirma onCambio={setFirma} />
                </div>

                <div className="firmas__paso">
                  <p className="firmas__etiqueta">{t("firma.foto")}</p>
                  <p className="firmas__nota">{t("firma.fotoAyuda")}</p>
                  {vistaFoto && <img className="firmas__foto" src={vistaFoto} alt={t("firma.fotoAlt")} />}
                  <input
                    ref={entradaFoto}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="sr-only"
                    aria-label={t("firma.foto")}
                    onChange={elegirFoto}
                  />
                  <Boton variante="suave" type="button" onClick={() => entradaFoto.current?.click()}>
                    {t(foto ? "firma.fotoOtra" : "firma.fotoTomar")}
                  </Boton>
                </div>

                <div className="firmas__paso">
                  <p className="firmas__etiqueta">{t("firma.ubicacion")}</p>
                  {ubicacion ? (
                    <p className="firmas__nota">
                      {t("firma.ubicacionLista", {
                        lat: ubicacion.latitude.toFixed(5), lng: ubicacion.longitude.toFixed(5), m: Math.round(ubicacion.accuracy),
                      })}
                    </p>
                  ) : (
                    <Boton variante="suave" type="button" onClick={pedirUbicacion}>{t("firma.ubicacionPedir")}</Boton>
                  )}
                  {errorUbicacion && <p role="alert" className="contrato__error">{errorUbicacion}</p>}
                </div>

                <label className="firmas__consentimiento">
                  <input type="checkbox" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} />
                  <span>{t("firma.consentimiento")}</span>
                </label>

                {errorFirma && <p role="alert" className="contrato__error">{errorFirma}</p>}
                <Boton onClick={firmar} cargando={firmando} disabled={!listoParaFirmar}>
                  {t("firma.firmar")}
                </Boton>
              </fieldset>
            </div>
          </section>
        </div>
      )}
    </EstadoDeDatos>
  );
}

export default FirmaDelContrato;
