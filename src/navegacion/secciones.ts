import type { NombreDeIcono } from "@/components/cristal";
import type { Clave } from "@/i18n/idioma";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LAS SECCIONES DEL PANEL — UNA SOLA LISTA
 *
 * El raíl del escritorio y la barra de pestañas del móvil enseñan LO MISMO con
 * dos formas distintas. Antes de esto la lista vivía dentro del raíl; copiarla
 * a la barra de pestañas habría dado dos listas que empiezan iguales y dejan de
 * serlo a la primera sección nueva — y el síntoma sería «en el móvil no está»,
 * que es de los que tardan semanas en llegar.
 *
 * Aquí está la lista. Cada armazón decide cómo la pinta y cuánta enseña.
 * ════════════════════════════════════════════════════════════════════════════
 */
export interface Seccion {
  a: string;
  icono: NombreDeIcono;
  texto: Clave;
  /** El rótulo corto de la barra de pestañas: debajo de un icono de 22 px no
   *  caben dos palabras, y «Facturación» partida en dos líneas descoloca la
   *  fila entera. Si no hay corto, se usa el normal. */
  cortoMovil?: Clave;
}

/** Lo que se usa a diario. */
export const PRINCIPALES: Seccion[] = [
  { a: "/dashboard", icono: "casa", texto: "nav.tablero" },
  { a: "/companies", icono: "edificio", texto: "nav.empresas" },
  { a: "/domains", icono: "globo", texto: "nav.dominios" },
  { a: "/branding", icono: "paleta", texto: "nav.marcaCorto" },
  { a: "/team", icono: "personas", texto: "nav.equipo" },
  { a: "/billing", icono: "tarjeta", texto: "nav.facturacion" },
];

/** Lo que se consulta de tanto en tanto. */
export const SECUNDARIAS: Seccion[] = [
  { a: "/usage", icono: "grafico", texto: "nav.consumo" },
  { a: "/activity", icono: "libro", texto: "nav.actividad" },
  { a: "/contract", icono: "escudo", texto: "nav.contrato" },
  { a: "/entitlements", icono: "corona", texto: "nav.derechos" },
  { a: "/account", icono: "engranaje", texto: "nav.ajustesCorto" },
];

export const TODAS: Seccion[] = [...PRINCIPALES, ...SECUNDARIAS];

/**
 * ── LAS CUATRO DEL MÓVIL ──────────────────────────────────────────────────
 * En una barra de pestañas caben cuatro rótulos legibles y una salida al
 * resto. Con cinco o seis, el texto se encoge hasta que hay que leerlo dos
 * veces, y en un teléfono de 320 px se solapan.
 *
 * Cuáles son las cuatro no es una preferencia: son las que un socio abre
 * desde el teléfono. Las empresas que revende, las direcciones por las que
 * entra su gente, y su marca. Facturación y consumo se miran sentado, y por
 * eso viven detrás de «Más» sin perder nada.
 */
export const PESTANAS_MOVIL: Seccion[] = [
  { a: "/dashboard", icono: "casa", texto: "nav.tablero" },
  { a: "/companies", icono: "edificio", texto: "nav.empresas" },
  { a: "/domains", icono: "globo", texto: "nav.dominios" },
  { a: "/branding", icono: "paleta", texto: "nav.marcaCorto" },
];

/** Todo lo que NO está en la barra: lo que abre «Más». Se calcula restando,
 *  así que una sección nueva aparece sola en el móvil en vez de quedarse
 *  fuera hasta que alguien se acuerde de añadirla en dos sitios. */
export const RESTO_MOVIL: Seccion[] = TODAS.filter(
  (s) => !PESTANAS_MOVIL.some((p) => p.a === s.a),
);
