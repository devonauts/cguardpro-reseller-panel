import { useState } from "react";

import { useIdioma } from "@/i18n/IdiomaProvider";
import { GUIAS_DNS, rellenar } from "@/i18n/catalogo/guiasDns";

const CLAVE = "panel:proveedorDns";

function leerElegido(): string {
  try { return localStorage.getItem(CLAVE) || ""; } catch { return ""; }
}

/** A step with the values to type shown as code, so nobody retypes them wrong. */
function Paso({ texto, host, destino }: { texto: string; host: string; destino: string }) {
  const partes = texto.split(/(\{host\}|\{destino\})/);
  return (
    <>
      {partes.map((p, i) => {
        if (p === "{host}") return <code key={i} className="guia__valor">{host}</code>;
        if (p === "{destino}") return <code key={i} className="guia__valor">{destino}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/**
 * "Where did you buy your domain?" → the exact clicks for that provider.
 */
export function GuiaDns({ host, destino, dominio }: { host: string; destino: string; dominio: string }) {
  const { idioma, t } = useIdioma() as any;
  const guias = GUIAS_DNS[idioma as "es" | "en"] || GUIAS_DNS.en;
  const [elegido, setElegido] = useState<string>(leerElegido);
  const guia = guias.find((g) => g.id === elegido) || null;

  const elegir = (id: string) => {
    setElegido(id);
    try { localStorage.setItem(CLAVE, id); } catch { /* per-browser convenience only */ }
  };

  const conDominio = (s: string) => rellenar(s, { host: "{host}", destino: "{destino}", dominio });

  return (
    <div className="guia">
      <h4 className="dns__seccion-titulo">{t("dominios.guiaTitulo")}</h4>
      <div className="guia__proveedores" role="tablist">
        {guias.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === elegido}
            className={`guia__proveedor${g.id === elegido ? " guia__proveedor--activo" : ""}`}
            title={g.pista}
            onClick={() => elegir(g.id)}
          >
            {g.nombre}
          </button>
        ))}
      </div>

      {guia && (
        <div className="guia__cuerpo" role="tabpanel">
          <ol className="guia__pasos">
            {guia.pasos.map((p, i) => (
              <li key={i}><Paso texto={conDominio(p)} host={host} destino={destino} /></li>
            ))}
          </ol>
          {guia.ojo && guia.ojo.length > 0 && (
            <div className="guia__ojo">
              <strong>{t("dominios.guiaOjo")}</strong>
              <ul>
                {guia.ojo.map((o, i) => (
                  <li key={i}><Paso texto={conDominio(o)} host={host} destino={destino} /></li>
                ))}
              </ul>
            </div>
          )}
          <p className="guia__despues">{t("dominios.guiaDespues")}</p>
        </div>
      )}
    </div>
  );
}

export default GuiaDns;
