import { Marca, type NombreDeIcono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { Ventaja } from "../Ventaja";
import "./PanelDeMarca.scss";

/**
 * La columna izquierda: quiénes somos y qué ofrecemos.
 *
 * ── NO ES RELLENO ─────────────────────────────────────────────────────────
 * `partners.cguardpro.com` no es una pantalla interna: es donde un socio
 * comercial entra por primera vez, a veces antes de haber firmado del todo.
 * Esta mitad es lo único que le cuenta qué está a punto de usar.
 *
 * Y NO es una portada de marketing. Sin botones, sin precios, sin llamadas a
 * la acción que compitan con el formulario: el rótulo, tres frases y una línea
 * al pie. Lo que se viene a hacer aquí es entrar.
 */

interface Punto {
  icono: NombreDeIcono;
  titulo: Clave;
  nota: Clave;
}

const PUNTOS: Punto[] = [
  { icono: "grafico", titulo: "portada.crecer", nota: "portada.crecerNota" },
  { icono: "escudo", titulo: "portada.marcaPropia", nota: "portada.marcaPropiaNota" },
  { icono: "globo", titulo: "portada.triunfar", nota: "portada.triunfarNota" },
];

export function PanelDeMarca() {
  const t = useT();

  return (
    <section className="panel-marca">
      <Marca />

      <h1 className="panel-marca__titulo">
        <span>{t("portada.titulo1")}</span>
        <span>{t("portada.titulo2")}</span>
        {/* La tercera línea en tono apagado: la jerarquía la hace la LUZ, no un
            color ni un tamaño distinto. */}
        <span className="panel-marca__titulo--tenue">{t("portada.titulo3")}</span>
      </h1>

      <p className="panel-marca__lema">
        {t("portada.lema1")}<br />{t("portada.lema2")}
      </p>

      <ul className="panel-marca__puntos">
        {PUNTOS.map((p) => (
          <Ventaja key={p.titulo} icono={p.icono} titulo={t(p.titulo)} nota={t(p.nota)} />
        ))}
      </ul>

      <p className="panel-marca__pie">{t("portada.pie")}</p>
    </section>
  );
}

export default PanelDeMarca;
