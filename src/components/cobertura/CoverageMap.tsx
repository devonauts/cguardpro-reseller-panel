import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import useModoOscuro from "@/branding/useModoOscuro";
import { EstadoDeDatos, Panel } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { coverageService, type MapaDeCobertura } from "@/services/resellerService";
import "./CoverageMap.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * COVERAGE MAP
 *
 * The partner's coverage cities drawn with their REAL outline (from the
 * platform's own OSM server) and a pin for every company it has. Pins outside
 * every outline stand out: that is selling outside the approved territory.
 *
 * The cities are the partner's contract (its application, edited only by the
 * platform): here they are only shown. A company without an address is never
 * placed on the map; it is counted apart.
 *
 * Base map: OpenStreetMap's tiles, no brand of ours anywhere; the platform's
 * own tile server replaces them when it carries these countries.
 * ════════════════════════════════════════════════════════════════════════════
 */

/* OpenStreetMap's own tiles, attributed. In dark mode the same tiles are toned
   down with a CSS filter (see the .scss), so there is one source, no key. */
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Frames every outline and every pin once the data is in. */
function Encuadre({ datos }: { datos: MapaDeCobertura }) {
  const mapa = useMap();
  useEffect(() => {
    const caja = L.latLngBounds([]);
    for (const a of datos.areas) {
      if (a.geojson) caja.extend(L.geoJSON(a.geojson as any).getBounds());
      else if (a.center) caja.extend([a.center.lat, a.center.lng]);
    }
    for (const e of datos.companies) if (e.location) caja.extend([e.location.lat, e.location.lng]);
    if (caja.isValid()) mapa.fitBounds(caja, { padding: [28, 28], maxZoom: 12 });
  }, [datos, mapa]);
  return null;
}

export function CoverageMap() {
  const t = useT();
  const oscuro = useModoOscuro();
  const [datos, setDatos] = useState<MapaDeCobertura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await coverageService.leer());
    } catch (e: any) {
      setError(e?.message || t("cobertura.noCargo"));
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { void cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sinContorno = useMemo(() => (datos?.areas ?? []).filter((a) => a.status !== "ok"), [datos]);
  const nombreDe = (id: string | null) => datos?.areas.find((a) => a.id === id)?.name ?? "";

  return (
    <Panel
      className="cobertura"
      titulo={t("cobertura.titulo")}
      nota={t("cobertura.sub")}
      acciones={datos && (
        <span className="cobertura__cifras">
          <span>{t("cobertura.empresas", { n: datos.totals.companies })}</span>
          {datos.totals.outside > 0 && (
            <span className="cobertura__cifra--fuera">{t("cobertura.fuera", { n: datos.totals.outside })}</span>
          )}
          {datos.totals.unlocated > 0 && <span>{t("cobertura.sinUbicacion", { n: datos.totals.unlocated })}</span>}
        </span>
      )}
    >
      <EstadoDeDatos cargando={cargando} error={error} onReintentar={cargar}>
        {datos && (
          <>
            {!datos.areas.length ? (
              <p className="cobertura__vacio">{t("cobertura.sinCiudades")}</p>
            ) : (
              <div className={`cobertura__mapa${oscuro ? " cobertura__mapa--oscuro" : ""}`}>
                <MapContainer center={[20, -80]} zoom={3} scrollWheelZoom={false} attributionControl>
                  <TileLayer url={TILES} attribution={ATRIBUCION} maxZoom={18} />
                  {datos.areas.filter((a) => a.geojson).map((a) => (
                    <GeoJSON key={a.id} data={a.geojson as any} style={() => ({ className: "cobertura__area" })}>
                      <Popup><strong>{a.name}</strong><br />{a.label}</Popup>
                    </GeoJSON>
                  ))}
                  {datos.companies.filter((e) => e.location).map((e) => (
                    <CircleMarker
                      key={e.id}
                      center={[e.location!.lat, e.location!.lng]}
                      radius={7}
                      className={e.inside === false ? "cobertura__pin cobertura__pin--fuera" : "cobertura__pin"}
                    >
                      <Popup>
                        <strong>{e.name}</strong>
                        {e.city && <><br />{e.city}</>}
                        <br />
                        {e.inside === false
                          ? <span className="cobertura__popup-fuera">{t("cobertura.pinFuera")}</span>
                          : e.inside ? t("cobertura.pinDentro", { c: nombreDe(e.areaId) }) : null}
                      </Popup>
                    </CircleMarker>
                  ))}
                  <Encuadre datos={datos} />
                </MapContainer>
              </div>
            )}

            <ul className="cobertura__ciudades">
              {datos.areas.map((a) => (
                <li key={a.id} className={a.status === "ok" ? "" : "cobertura__ciudad--pendiente"}>
                  <span className="cobertura__muestra" aria-hidden="true" />
                  {a.name}
                  {a.status !== "ok" && <em> · {t("cobertura.contornoPendiente")}</em>}
                </li>
              ))}
            </ul>
            {sinContorno.length > 0 && <p className="cobertura__nota">{t("cobertura.pendienteNota")}</p>}
            <p className="cobertura__nota">{t("cobertura.quienDefine")}</p>
          </>
        )}
      </EstadoDeDatos>
    </Panel>
  );
}

export default CoverageMap;
