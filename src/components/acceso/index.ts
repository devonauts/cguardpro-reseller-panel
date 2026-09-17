/**
 * Las piezas de la pantalla de entrada.
 *
 * Viven aparte de `components/cristal` porque son de UNA pantalla: la tarjeta
 * con luz de estudio, la columna de marca y sus puntos no se usan en ningún
 * otro sitio del panel. Lo que sí es de todos —el material, el botón, el campo,
 * los iconos— sigue en el sistema, y estas piezas lo CONSUMEN en vez de
 * volver a escribirlo.
 */
export { TarjetaDeAcceso } from "./TarjetaDeAcceso";
export { PanelDeMarca } from "./PanelDeMarca";
export { Ventaja } from "./Ventaja";
