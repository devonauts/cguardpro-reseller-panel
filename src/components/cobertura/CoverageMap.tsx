import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { EstadoDeDatos, Icono, Panel } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { precio } from "@/lib/dinero";
import {
  coverageService, type AreaDeCobertura, type CifrasDeCobertura, type MapaDeCobertura, type PinDeEmpresa,
} from "@/services/resellerService";
import "./CoverageMap.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * COVERAGE MAP — a carousel of cards over one map
 *
 *   1. the COUNTRY: its real outline, every coverage city, every company pin
 *      and the totals;
 *   2. one card per coverage CITY: the map flies to its real outline, its pins
 *      stand out, and the panel beside it gives that city's figures;
 *   3. the companies OUTSIDE every city, when there are any.
 *
 * One map for every card (the map flies; it is not rebuilt), so sliding feels
 * like moving over the same territory. Swipe on the card, the arrows, the dots
 * or the keyboard; a city on the country card opens its own card.
 *
 * Figures are commercial only — companies, users, billing — never operational
 * (same rule as the rest of the partner panel). Cities are the partner's
 * contract: shown, not edited here.
 *
 * Base map: OpenStreetMap tiles, toned dark in dark mode and softened in light.
 * ════════════════════════════════════════════════════════════════════════════
 */

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Carta =
  | { tipo: "pais" }
  | { tipo: "ciudad"; area: AreaDeCobertura }
  | { tipo: "fuera" };

/**
 * The frame of a country's mainland: its biggest polygon. Framing the whole
 * MultiPolygon made Colombia tiny (San Andrés sits far out in the Caribbean),
 * and the same happens with Hawaii, Alaska or the Galápagos.
 */
function tierraFirme(g: { type: string; coordinates: any }): L.LatLngBounds {
  if (g.type !== "MultiPolygon") return L.geoJSON(g as any).getBounds();
  let mayor: L.LatLngBounds | null = null;
  let area = -1;
  for (const poligono of g.coordinates) {
    const b = L.geoJSON({ type: "Polygon", coordinates: poligono } as any).getBounds();
    const a = (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
    if (a > area) { area = a; mayor = b; }
  }
  return mayor ?? L.geoJSON(g as any).getBounds();
}

/** Where the map goes for each card. */
function cajaDe(carta: Carta, datos: MapaDeCobertura): L.LatLngBounds | null {
  const caja = L.latLngBounds([]);
  const pin = (e: PinDeEmpresa) => e.location && caja.extend([e.location.lat, e.location.lng]);
  if (carta.tipo === "ciudad") {
    const a = carta.area;
    if (a.geojson) caja.extend(L.geoJSON(a.geojson as any).getBounds());
    else if (a.center) caja.extend(L.latLng(a.center.lat, a.center.lng).toBounds(30000));
    datos.companies.filter((e) => e.areaId === a.id).forEach(pin);
  } else if (carta.tipo === "fuera") {
    datos.companies.filter((e) => e.inside === false).forEach(pin);
  } else {
    if (datos.country?.geojson) caja.extend(tierraFirme(datos.country.geojson as any));
    else if (datos.country?.bbox) {
      const [s, w, n, e] = datos.country.bbox;
      caja.extend([[s, w], [n, e]]);
    }
    for (const a of datos.areas) if (a.geojson) caja.extend(L.geoJSON(a.geojson as any).getBounds());
    datos.companies.forEach(pin);
  }
  return caja.isValid() ? caja : null;
}

function Vuelo({ caja }: { caja: L.LatLngBounds | null }) {
  const mapa = useMap();
  const primera = useRef(true);
  useEffect(() => {
    if (!caja) return;
    const opciones = { padding: [16, 16] as [number, number], maxZoom: 13 };
    /* The first frame is set, not flown: nothing to fly from. And only once
       the box has its real size — framed earlier, Leaflet computed the zoom
       for a smaller box and the country opened far too zoomed out. */
    if (primera.current) {
      primera.current = false;
      mapa.whenReady(() => requestAnimationFrame(() => {
        mapa.invalidateSize();
        mapa.fitBounds(caja, opciones);
      }));
    } else {
      mapa.invalidateSize();
      mapa.flyToBounds(caja, { ...opciones, duration: 0.8 });
    }
  }, [caja, mapa]);
  return null;
}

export function CoverageMap() {
  const t = useT();
  const [datos, setDatos] = useState<MapaDeCobertura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [direccion, setDireccion] = useState<1 | -1>(1);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await coverageService.leer());
    } catch (e: any) {
      setError(e?.message || t("cobertura.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);
  useEffect(() => { void cargar(); }, [cargar]);

  const cartas = useMemo<Carta[]>(() => {
    if (!datos) return [];
    return [
      { tipo: "pais" },
      ...datos.areas.map((area) => ({ tipo: "ciudad" as const, area })),
      ...(datos.totals.outside > 0 ? [{ tipo: "fuera" as const }] : []),
    ];
  }, [datos]);
  const carta = cartas[Math.min(indice, Math.max(0, cartas.length - 1))];
  const caja = useMemo(() => (datos && carta ? cajaDe(carta, datos) : null), [carta, datos]);

  const ir = useCallback((i: number) => {
    if (!cartas.length) return;
    const destino = (i + cartas.length) % cartas.length;
    setDireccion(destino > indice || (indice === cartas.length - 1 && destino === 0) ? 1 : -1);
    setIndice(destino);
  }, [cartas.length, indice]);
  const irACiudad = (id: string) => ir(cartas.findIndex((c) => c.tipo === "ciudad" && c.area.id === id));

  /* Swipe on the card (not on the map: there a drag pans the map). */
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const alTocar = (e: React.PointerEvent) => { inicio.current = { x: e.clientX, y: e.clientY }; };
  const alSoltar = (e: React.PointerEvent) => {
    const i = inicio.current;
    inicio.current = null;
    if (!i) return;
    const dx = e.clientX - i.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - i.y)) ir(indice + (dx < 0 ? 1 : -1));
  };

  const ciudadActiva = carta?.tipo === "ciudad" ? carta.area.id : null;
  const claseDePin = (e: PinDeEmpresa) => {
    const apagado = (carta?.tipo === "ciudad" && e.areaId !== ciudadActiva) || (carta?.tipo === "fuera" && e.inside !== false);
    return ["cobertura__pin", e.inside === false ? "cobertura__pin--fuera" : "", apagado ? "cobertura__pin--apagado" : ""].join(" ").trim();
  };

  return (
    <Panel className="cobertura" titulo={t("cobertura.titulo")} nota={t("cobertura.sub")}>
      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {datos && carta && (
          <div
            className="cobertura__carrusel"
            role="region"
            aria-roledescription="carousel"
            aria-label={t("cobertura.titulo")}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") { e.preventDefault(); ir(indice + 1); }
              if (e.key === "ArrowLeft") { e.preventDefault(); ir(indice - 1); }
            }}
          >
            <div className="cobertura__cuerpo">
              <div className="cobertura__mapa">
                <MapContainer center={[20, -80]} zoom={3} zoomSnap={0.25} zoomDelta={0.5} scrollWheelZoom={false} attributionControl>
                  <TileLayer url={TILES} attribution={ATRIBUCION} maxZoom={18} />
                  {datos.country?.geojson && (
                    <GeoJSON
                      key={`pais-${datos.country.code}`}
                      data={datos.country.geojson as any}
                      style={() => ({ className: "cobertura__pais", interactive: false })}
                    />
                  )}
                  {datos.areas.filter((a) => a.geojson).map((a) => (
                    <GeoJSON
                      key={`${a.id}-${ciudadActiva === a.id ? "on" : ciudadActiva ? "off" : "all"}`}
                      data={a.geojson as any}
                      style={() => ({
                        className: `cobertura__area${ciudadActiva && ciudadActiva !== a.id ? " cobertura__area--apagada" : ""}${ciudadActiva === a.id ? " cobertura__area--activa" : ""}`,
                      })}
                      eventHandlers={{ click: () => irACiudad(a.id) }}
                    />
                  ))}
                  {datos.companies.filter((e) => e.location).map((e) => (
                    <CircleMarker
                      key={`${e.id}-${claseDePin(e)}`}
                      center={[e.location!.lat, e.location!.lng]}
                      radius={carta.tipo === "pais" ? 6 : 8}
                      className={claseDePin(e)}
                    >
                      <Popup>
                        <strong>{e.name}</strong>
                        {e.city && <><br />{e.city}</>}
                        <br />
                        {e.inside === false
                          ? <span className="cobertura__popup-fuera">{t("cobertura.pinFuera")}</span>
                          : e.inside ? t("cobertura.pinDentro", { c: datos.areas.find((a) => a.id === e.areaId)?.name ?? "" }) : null}
                      </Popup>
                    </CircleMarker>
                  ))}
                  <Vuelo caja={caja} />
                </MapContainer>
              </div>

              <div
                key={indice}
                className={`cobertura__carta cobertura__carta--${direccion > 0 ? "entra-derecha" : "entra-izquierda"}`}
                onPointerDown={alTocar}
                onPointerUp={alSoltar}
                aria-live="polite"
              >
                <CartaDeCifras carta={carta} datos={datos} alElegirCiudad={irACiudad} />
              </div>
            </div>

            {cartas.length > 1 && (
              <div className="cobertura__navegacion">
                <button type="button" className="cobertura__flecha" onClick={() => ir(indice - 1)} aria-label={t("cobertura.anterior")}>
                  <Icono nombre="flecha" tamano={16} />
                </button>
                <div className="cobertura__puntos" role="tablist">
                  {cartas.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === indice}
                      aria-label={c.tipo === "pais" ? t("cobertura.cartaPais") : c.tipo === "fuera" ? t("cobertura.cartaFuera") : c.area.name}
                      className={`cobertura__punto${i === indice ? " cobertura__punto--activo" : ""}`}
                      onClick={() => ir(i)}
                    />
                  ))}
                </div>
                <button type="button" className="cobertura__flecha cobertura__flecha--siguiente" onClick={() => ir(indice + 1)} aria-label={t("cobertura.siguiente")}>
                  <Icono nombre="flecha" tamano={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </EstadoDeDatos>
    </Panel>
  );
}

/** The panel beside the map: what the card is about and its figures. */
function CartaDeCifras({ carta, datos, alElegirCiudad }: {
  carta: Carta; datos: MapaDeCobertura; alElegirCiudad: (id: string) => void;
}) {
  const t = useT();
  const moneda = datos.currency;

  if (carta.tipo === "pais") {
    return (
      <>
        <p className="cobertura__antetitulo">{t("cobertura.cartaPais")}</p>
        <h3 className="cobertura__nombre">{datos.country?.label?.split(",")[0] || datos.country?.code || "—"}</h3>
        <Cifras c={datos.stats} moneda={moneda} />
        <div className="cobertura__alertas">
          {datos.totals.outside > 0 && <span className="cobertura__alerta">{t("cobertura.fuera", { n: datos.totals.outside })}</span>}
          {datos.totals.unlocated > 0 && <span>{t("cobertura.sinUbicacion", { n: datos.totals.unlocated })}</span>}
        </div>
        {datos.areas.length > 0 ? (
          <ul className="cobertura__ciudades">
            {datos.areas.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => alElegirCiudad(a.id)}>
                  <span className={`cobertura__muestra${a.status === "ok" ? "" : " cobertura__muestra--pendiente"}`} aria-hidden="true" />
                  {a.name}
                  <span className="cobertura__cuantas">{a.stats.companies}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cobertura__nota">{t("cobertura.sinCiudades")}</p>
        )}
        <p className="cobertura__nota">{t("cobertura.deslizaNota")}</p>
      </>
    );
  }

  if (carta.tipo === "fuera") {
    const fuera = datos.companies.filter((e) => e.inside === false);
    return (
      <>
        <p className="cobertura__antetitulo">{t("cobertura.cartaFuera")}</p>
        <h3 className="cobertura__nombre">{t("cobertura.fuera", { n: fuera.length })}</h3>
        <Cifras c={datos.outside} moneda={moneda} />
        <ul className="cobertura__lista">
          {fuera.map((e) => <li key={e.id}>{e.name}{e.city ? <span> · {e.city}</span> : null}</li>)}
        </ul>
        <p className="cobertura__nota">{t("cobertura.fueraNota")}</p>
      </>
    );
  }

  const a = carta.area;
  return (
    <>
      <p className="cobertura__antetitulo">{t("cobertura.cartaCiudad")}</p>
      <h3 className="cobertura__nombre">{a.name}</h3>
      {a.label && <p className="cobertura__etiqueta">{a.label}</p>}
      {a.status !== "ok" && <p className="cobertura__nota">{t("cobertura.pendienteNota")}</p>}
      <Cifras c={a.stats} moneda={moneda} />
    </>
  );
}

function Cifras({ c, moneda }: { c: CifrasDeCobertura; moneda: string | null }) {
  const t = useT();
  const estados: Array<[keyof CifrasDeCobertura["billing"], string]> = [
    ["active", t("cobertura.alDia")], ["trialing", t("cobertura.enPrueba")],
    ["past_due", t("cobertura.enMora")], ["paused", t("cobertura.pausadas")],
  ];
  return (
    <>
      <dl className="cobertura__cifras">
        <div><dt>{t("cobertura.cifraEmpresas")}</dt><dd>{c.companies}</dd></div>
        <div><dt>{t("cobertura.cifraNuevas")}</dt><dd>{c.newThisMonth}</dd></div>
        <div><dt>{t("cobertura.cifraUsuarios")}</dt><dd>{c.seats}</dd></div>
        {c.monthlyCents != null && moneda && (
          <div><dt>{t("cobertura.cifraMensual")}</dt><dd>{precio(c.monthlyCents, moneda)}</dd></div>
        )}
      </dl>
      {c.monthlyCents != null && c.companies > 0 && (
        <div className="cobertura__estados">
          {estados.filter(([k]) => c.billing[k] > 0).map(([k, texto]) => (
            <span key={k} className={`cobertura__estado cobertura__estado--${k}`}>{c.billing[k]} {texto}</span>
          ))}
        </div>
      )}
    </>
  );
}

export default CoverageMap;
