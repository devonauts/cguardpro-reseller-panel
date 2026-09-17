import { ReactNode, useEffect } from "react";

import { FondoEspacial, Icono, Marca } from "@/components/cristal";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import { useIdioma } from "@/i18n/IdiomaProvider";
import "./AuthLayout.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL MARCO DE LA ENTRADA
 *
 * Dos columnas sobre el espacio: a la izquierda quién somos y qué ofrecemos, a
 * la derecha la lámina de cristal donde se entra.
 *
 * ── LA COLUMNA IZQUIERDA NO ES RELLENO ────────────────────────────────────
 * `partners.cguardpro.com` no es una pantalla interna: es donde un socio
 * comercial entra por primera vez, a veces antes de haber firmado del todo. La
 * mitad izquierda es lo único que le cuenta qué está a punto de usar. En un
 * teléfono se retira —ahí lo que hace falta es teclear, no leer— y queda sólo
 * el emblema sobre la tarjeta.
 *
 * ── Y ESTE MARCO NO SABE QUÉ HAY DENTRO ───────────────────────────────────
 * Lo envuelve TODO lo que pasa sin sesión: la entrada, «comprobando tu
 * sesión…» y los avisos de capa apagada. Por eso el formulario no vive aquí:
 * si viviera, esas otras pantallas heredarían un formulario que no les
 * corresponde.
 * ════════════════════════════════════════════════════════════════════════════
 */

interface Ventaja {
  icono: "grafico" | "escudo" | "globo";
  titulo: "portada.crecer" | "portada.marcaPropia" | "portada.triunfar";
  nota: "portada.crecerNota" | "portada.marcaPropiaNota" | "portada.triunfarNota";
}

const VENTAJAS: Ventaja[] = [
  { icono: "grafico", titulo: "portada.crecer", nota: "portada.crecerNota" },
  { icono: "escudo", titulo: "portada.marcaPropia", nota: "portada.marcaPropiaNota" },
  { icono: "globo", titulo: "portada.triunfar", nota: "portada.triunfarNota" },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  const { idioma, t } = useIdioma();

  /* El título de la pestaña también es texto que se lee. Aquí NUNCA hay marca
     de socio —o todavía no se sabe de quién es el panel, o ya se cerró la
     sesión y se limpió—, así que ponerlo desde aquí no pisa la marca de nadie. */
  useEffect(() => {
    document.title = t("armazon.tituloNeutro");
  }, [idioma, t]);

  return (
    <main className="entrada">
      <FondoEspacial />

      <div className="entrada__idioma">
        <span className="entrada__globo"><Icono nombre="globo" tamano={16} /></span>
        <SelectorDeIdioma compacto />
      </div>

      <div className="entrada__rejilla">
        {/* ── Quiénes somos ──────────────────────────────────────────── */}
        <section className="portada">
          <Marca />

          <h1 className="portada__titulo">
            <span>{t("portada.titulo1")}</span>
            <span>{t("portada.titulo2")}</span>
            {/* La tercera línea en tono apagado: la jerarquía la hace la LUZ,
                no un color ni un tamaño distinto. */}
            <span className="portada__titulo--tenue">{t("portada.titulo3")}</span>
          </h1>

          <p className="portada__lema">
            {t("portada.lema1")}<br />{t("portada.lema2")}
          </p>

          <ul className="portada__ventajas">
            {VENTAJAS.map((v) => (
              <li key={v.titulo} className="ventaja">
                <span className="ventaja__icono"><Icono nombre={v.icono} /></span>
                <span className="ventaja__texto">
                  <span className="ventaja__titulo">{t(v.titulo)}</span>
                  <span className="ventaja__nota">{t(v.nota)}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="portada__pie">{t("portada.pie")}</p>
        </section>

        {/* ── Por donde se entra ─────────────────────────────────────── */}
        <div className="entrada__caja">{children}</div>
      </div>

      <p className="entrada__valores" aria-hidden="true">
        <span>{t("portada.personas")}</span>
        <span>{t("portada.propiedad")}</span>
        <span>{t("portada.progreso")}</span>
      </p>

      <footer className="entrada__legal">
        {t("login.derechos", { anio: new Date().getFullYear() })}
      </footer>
    </main>
  );
}

export default AuthLayout;
