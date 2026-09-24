import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Boton, Icono } from "@/components/cristal";
import { domainsService, type DominioDelSocio } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./EnlaceParaClientes.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL ENLACE QUE EL SOCIO COMPARTE CON SUS CLIENTES
 *
 * Es la puerta de su negocio: por aquí una empresa de seguridad se registra
 * sola, con la marca del socio, y queda como SU cliente. Estaba escondido —la
 * dirección salía en Dominios, pero en ningún sitio decía «comparte esto» ni se
 * podía copiar—, así que un socio podía montar toda su plataforma y no saber
 * cómo traer a nadie.
 *
 * Se elige la dirección primaria que ya SIRVE (un dominio propio conectado
 * gana a la de la plataforma). Si todavía no sirve ninguna, se dice por qué en
 * vez de enseñar un enlace que no abre.
 * ════════════════════════════════════════════════════════════════════════════
 */

let cache: { hasta: number; dominios: DominioDelSocio[] } | null = null;

export function direccionQueSirve(dominios: DominioDelSocio[]): string | null {
  const vivas = dominios.filter((d) => d.isActive && d.hostname);
  const elegida = vivas.find((d) => d.isPrimary) ?? vivas.find((d) => d.type === "custom") ?? vivas[0];
  return elegida?.hostname ?? null;
}

export function useDireccionDeClientes(): { host: string | null; cargando: boolean } {
  const [estado, setEstado] = useState<{ host: string | null; cargando: boolean }>(() => (
    cache && cache.hasta > Date.now()
      ? { host: direccionQueSirve(cache.dominios), cargando: false }
      : { host: null, cargando: true }
  ));
  useEffect(() => {
    if (cache && cache.hasta > Date.now()) return;
    let vivo = true;
    domainsService.listar()
      .then((r) => {
        cache = { hasta: Date.now() + 60_000, dominios: r.dominios ?? [] };
        if (vivo) setEstado({ host: direccionQueSirve(cache.dominios), cargando: false });
      })
      .catch(() => { if (vivo) setEstado({ host: null, cargando: false }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}

export function EnlaceParaClientes({ compacto = false }: { compacto?: boolean }) {
  const t = useT();
  const { host, cargando } = useDireccionDeClientes();
  const [copiado, setCopiado] = useState(false);

  if (cargando) return null;

  if (!host) {
    return (
      <div className={`enlace-clientes enlace-clientes--pendiente${compacto ? " enlace-clientes--compacto" : ""}`}>
        <span className="enlace-clientes__icono"><Icono nombre="globo" tamano={18} /></span>
        <span className="enlace-clientes__texto">
          <strong>{t("enlace.titulo")}</strong>
          <span>{t("enlace.pendiente")}</span>
        </span>
        <Link to="/domains" className="bloque__enlace">{t("enlace.verDominios")}</Link>
      </div>
    );
  }

  const registro = `https://${host}/register`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(registro);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch { /* el enlace sigue entero a la vista para copiarlo a mano */ }
  };

  return (
    <div className={`enlace-clientes${compacto ? " enlace-clientes--compacto" : ""}`}>
      <span className="enlace-clientes__icono"><Icono nombre="globo" tamano={18} /></span>
      <span className="enlace-clientes__texto">
        <strong>{t("enlace.titulo")}</strong>
        {!compacto && <span>{t("enlace.sub")}</span>}
        <code className="enlace-clientes__url">{registro}</code>
      </span>
      <span className="enlace-clientes__acciones">
        <Boton variante="suave" onClick={copiar} aria-live="polite">
          <Icono nombre={copiado ? "visto" : "copiar"} tamano={15} />
          {t(copiado ? "enlace.copiado" : "enlace.copiar")}
        </Boton>
        <a className="btn btn--fantasma" href={`https://${host}`} target="_blank" rel="noreferrer">
          {t("enlace.abrir")}
          <Icono nombre="flecha" tamano={15} />
        </a>
      </span>
    </div>
  );
}

export default EnlaceParaClientes;
