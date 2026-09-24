import planetaAvif from "@/assets/planeta.avif";
import planetaAvif720 from "@/assets/planeta-720.avif";
import planetaWebp from "@/assets/planeta.webp";
import planetaWebp720 from "@/assets/planeta-720.webp";
import "./FondoEspacial.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EL ESPACIO Y LA TIERRA — EN CINCO CAPAS, NO EN UNA IMAGEN
 *
 * La composición NO es un fondo de pantalla completa. Se reparte así:
 *
 *   1 · lienzo    · negro mate en gradiente ................... CSS
 *   2 · textura   · retícula de puntos casi invisible ......... CSS
 *   3 · luz       · brillos neutros, viñeta y filo metálico ... CSS
 *   4 · planeta   · el objeto decorativo complejo ............. IMAGEN
 *   5 · interfaz  · la tarjeta y los controles ................ componentes
 *
 * ── POR QUÉ SÓLO EL PLANETA ES UNA IMAGEN ─────────────────────────────────
 * Porque es lo único que no se puede describir con degradados: las costas
 * iluminadas de América y Europa son geografía, no un patrón. Se intentó en
 * CSS y el resultado eran puntos repartidos con ruido — a cierta distancia,
 * una trama de semitono.
 *
 * Todo lo demás se queda en CSS a propósito. Horneado en el mismo PNG, el
 * negro mate dejaría de responder al tamaño de la ventana, no podría cambiar
 * con el tema y obligaría a servir una imagen distinta por cada anchura. Y el
 * texto dentro de una imagen no se traduce, no se selecciona y no se lee en
 * voz alta.
 *
 * ── Y ESTA IMAGEN ES TRANSPARENTE DE VERDAD ───────────────────────────────
 * El original venía con el vacío en negro sólido. Un rectángulo negro encima
 * del lienzo tapa el gradiente y la textura, y el borde del recorte se ve en
 * cuanto el fondo no es exactamente el mismo negro. Aquí el vacío tiene alfa
 * 0, el resplandor se desvanece y sólo el disco es opaco — para que la textura
 * de la página no se transparente A TRAVÉS del planeta.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FondoEspacial() {
  return (
    /* `aria-hidden`: es paisaje. Anunciarlo a un lector de pantalla sólo
       retrasa el primer campo del formulario. */
    <div className="espacio" aria-hidden="true">
      <div className="espacio__estrellas" />
      <div className="espacio__arco" />

      <picture className="espacio__planeta">
        <source
          type="image/avif"
          srcSet={`${planetaAvif720} 720w, ${planetaAvif} 1280w`}
          sizes="(max-width: 900px) 78vw, 62vw"
        />
        <source
          type="image/webp"
          srcSet={`${planetaWebp720} 720w, ${planetaWebp} 1280w`}
          sizes="(max-width: 900px) 78vw, 62vw"
        />
        <img
          src={planetaWebp}
          alt=""
          /* `async` + prioridad baja, y NO `loading="lazy"`: esto se ve desde
             el primer píxel, así que aplazarlo sólo produciría un salto. Lo
             que sí interesa es que no compita con el formulario — que se
             decodifique fuera del hilo y se pida después. */
          decoding="async"
          /* Lowercase on purpose: React 18 does not know the camelCase prop
             and warns; the attribute itself is what the browser reads. */
          {...{ fetchpriority: "low" }}
          draggable={false}
        />
      </picture>

      <div className="espacio__vineta" />
    </div>
  );
}

export default FondoEspacial;
