import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { Boton, Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { escuchar } from "@/lib/tiempoReal";
import { urlDeArchivo } from "@/services/api";
import { novedadesService, type NovedadDelServidor } from "@/services/resellerService";
import { guardarTema, leerTema } from "@/tema/tema";
import planeta from "@/assets/planeta-720.webp";
import cielo from "@/assets/cielo-900.webp";
import { marcarVista, pendiente } from "./registro";
import "./Novedades.scss";

/**
 * La tarjeta de «qué hay de nuevo»: un anillo que señala dónde está la novedad
 * y, al lado, qué es y un botón para probarla YA. Una vez por persona; se
 * cierra con la X, «Ahora no» o Escape.
 *
 * ── DE DÓNDE SALEN (2026-09-30) ───────────────────────────────────────────
 *   1. Del SUPERADMIN: «Avisos a las empresas» con la audiencia «Panel de
 *      socios». El servidor ya quita las que esta persona cerró, y aquí se
 *      deja el acuse (enseñada · cerrada · botón) para sus estadísticas.
 *   2. De la lista de la casa (`registro.ts`), para lo que va con el código:
 *      hoy, el modo claro. Se recuerda en el navegador.
 * Primero las del superadmin. Llega una nueva en vivo («Enviar ahora») y sale.
 */
interface Tarjeta {
  id: string;
  deServidor: boolean;
  titulo: string;
  texto: string;
  /** null = el antes/después del modo claro. */
  imagen: string | null;
  boton: { etiqueta: string; accion: "tema-claro" | null; url: string | null } | null;
  /** Selector de la pieza a señalar; null = tarjeta sola, arriba a la derecha. */
  ancla: string | null;
  cerrable: boolean;
}

const ANCLAS: Record<string, string | null> = { perfil: ".barra__ficha", campana: ".avisos__boton", ninguna: null };

const conMarca = (t: string) => t.replace(/\{\{\s*marca\s*\}\}/gi, "C-Guard Pro");

function deServidor(n: NovedadDelServidor): Tarjeta {
  const d = n.design || ({} as NonNullable<NovedadDelServidor["design"]>);
  return {
    id: n.id,
    deServidor: true,
    titulo: conMarca(n.title),
    texto: conMarca(n.body).replace(/\*\*(.+?)\*\*/g, "$1"),
    imagen: urlDeArchivo(d.imageUrl) || null,
    boton: d.ctaLabel ? { etiqueta: conMarca(d.ctaLabel), accion: d.action || null, url: d.ctaUrl || null } : null,
    ancla: ANCLAS[d.anchor || "perfil"] ?? null,
    cerrable: n.dismissible !== false,
  };
}

export function Novedades() {
  const t = useT();
  const navigate = useNavigate();
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null);
  const [marco, setMarco] = useState<DOMRect | null>(null);
  const [paso, setPaso] = useState<"presentar" | "listo">("presentar");

  const buscar = useCallback(async (): Promise<Tarjeta | null> => {
    try {
      const { rows } = await novedadesService.lista();
      if (rows?.length) return deServidor(rows[0]);
    } catch { /* sin servidor: la de la casa */ }
    const n = pendiente();
    if (!n) return null;
    if (n.id.startsWith("modo-claro") && leerTema() === "claro") { marcarVista(n.id); return null; }
    return {
      id: n.id,
      deServidor: false,
      titulo: t("novedades.modoClaro.titulo"),
      texto: t("novedades.modoClaro.texto"),
      imagen: null,
      boton: { etiqueta: t("novedades.modoClaro.probar"), accion: "tema-claro", url: null },
      ancla: n.ancla,
      cerrable: true,
    };
  }, [t]);

  const mostrar = useCallback((x: Tarjeta | null) => {
    setPaso("presentar");
    setTarjeta(x);
    if (x?.deServidor) novedadesService.acuse(x.id, "shown").catch(() => { /* sólo estadística */ });
  }, []);

  // Un momento después de entrar: que la pantalla se asiente antes de hablar.
  useEffect(() => {
    let vivo = true;
    const reloj = window.setTimeout(async () => {
      const x = await buscar();
      if (vivo) mostrar(x);
    }, 1400);
    // «Enviar ahora» desde el superadmin: aparece sin recargar.
    const quitar = escuchar("reseller:novedad", async () => {
      const x = await buscar();
      if (vivo && x) mostrar(x);
    });
    return () => { vivo = false; window.clearTimeout(reloj); quitar(); };
  }, [buscar, mostrar]);

  const medir = useCallback(() => {
    const el = tarjeta?.ancla ? document.querySelector(tarjeta.ancla) : null;
    setMarco(el ? el.getBoundingClientRect() : null);
  }, [tarjeta]);

  useLayoutEffect(() => {
    if (!tarjeta) return undefined;
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [tarjeta, medir]);

  const cerrar = useCallback((evento: "dismissed" | "seen" | "cta" = "dismissed") => {
    if (!tarjeta) return;
    if (tarjeta.deServidor) novedadesService.acuse(tarjeta.id, evento).catch(() => { /* sólo estadística */ });
    else marcarVista(tarjeta.id);
    setTarjeta(null);
  }, [tarjeta]);

  useEffect(() => {
    if (!tarjeta || !tarjeta.cerrable) return undefined;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [tarjeta, cerrar]);

  if (!tarjeta) return null;
  // Con ancla pero sin la pieza en pantalla (p. ej. menú plegado): no se enseña.
  if (tarjeta.ancla && !marco) return null;

  const pulsar = () => {
    const b = tarjeta.boton;
    if (!b) return;
    if (b.accion === "tema-claro") {
      guardarTema("claro");
      if (tarjeta.deServidor) novedadesService.acuse(tarjeta.id, "cta").catch(() => {});
      setPaso("listo");
      return;
    }
    cerrar("cta");
    if (b.url?.startsWith("/")) navigate(b.url);
    else if (b.url) window.open(b.url, "_blank", "noopener");
  };

  // Sin ancla: arriba a la derecha, bajo la barra, sin anillo ni flecha.
  const arriba = marco ? marco.bottom + 16 : 76;
  const derecha = marco ? Math.max(12, window.innerWidth - marco.right) : 24;
  const flecha = marco
    ? Math.min(300, Math.max(24, window.innerWidth - (marco.left + marco.width / 2) - derecha))
    : null;

  return createPortal(
    <>
      {marco && (
        <span
          className="novedad-anillo"
          aria-hidden="true"
          style={{ top: marco.top - 5, left: marco.left - 5, width: marco.width + 10, height: marco.height + 10 }}
        />
      )}
      <div
        className={`novedad${flecha === null ? " novedad--sin-flecha" : ""}`}
        role="dialog"
        aria-labelledby="novedad-titulo"
        aria-describedby="novedad-texto"
        style={{ top: arriba, right: derecha, ...(flecha !== null ? { ["--novedad-flecha" as any]: `${flecha}px` } : {}) }}
      >
        {tarjeta.cerrable && (
          <button type="button" className="novedad__cerrar" aria-label={t("novedades.cerrar")} onClick={() => cerrar()}>
            <Icono nombre="mas" tamano={16} className="novedad__x" />
          </button>
        )}

        {tarjeta.imagen ? (
          <div className="novedad__previa" aria-hidden="true">
            <img className="novedad__portada" src={tarjeta.imagen} alt="" />
          </div>
        ) : (
          /* Antes / después: la noche y el cielo, partidos en diagonal. */
          <div className={`novedad__previa${paso === "listo" ? " novedad__previa--listo" : ""}`} aria-hidden="true">
            <img className="novedad__noche" src={planeta} alt="" />
            <img className="novedad__cielo" src={cielo} alt="" />
            <span className="novedad__chip novedad__chip--noche"><Icono nombre="luna" tamano={12} /></span>
            <span className="novedad__chip novedad__chip--dia"><Icono nombre="sol" tamano={12} /></span>
          </div>
        )}

        <div className="novedad__cuerpo">
          <span className="novedad__etiqueta">{t("novedades.etiqueta")}</span>
          {paso === "presentar" ? (
            <>
              <h2 id="novedad-titulo" className="novedad__titulo">{tarjeta.titulo}</h2>
              <p id="novedad-texto" className="novedad__texto">{tarjeta.texto}</p>
              <div className="novedad__acciones">
                {tarjeta.cerrable && <Boton variante="fantasma" onClick={() => cerrar()}>{t("novedades.ahoraNo")}</Boton>}
                {tarjeta.boton && (
                  <Boton onClick={pulsar}>
                    {tarjeta.boton.accion === "tema-claro" && <Icono nombre="sol" tamano={15} />}
                    {tarjeta.boton.etiqueta}
                  </Boton>
                )}
                {!tarjeta.boton && !tarjeta.cerrable && <Boton onClick={() => cerrar("seen")}>{t("novedades.entendido")}</Boton>}
              </div>
            </>
          ) : (
            <>
              <h2 id="novedad-titulo" className="novedad__titulo">{t("novedades.modoClaro.listoTitulo")}</h2>
              <p id="novedad-texto" className="novedad__texto">{t("novedades.modoClaro.listoTexto")}</p>
              <div className="novedad__acciones">
                <Boton onClick={() => cerrar("seen")}>{t("novedades.entendido")}</Boton>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

export default Novedades;
