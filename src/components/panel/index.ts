/**
 * Las piezas del PANEL autenticado: el raíl, la barra, las cifras del tablero,
 * las baldosas, la tabla y la gráfica.
 *
 * Igual que `components/acceso`, viven aparte de `components/cristal` porque
 * son de este producto y no del sistema visual. Consumen el material; no lo
 * redefinen.
 */
export { Rail } from "./Rail";
export { BarraSuperior } from "./BarraSuperior";
export { TarjetaDeMetrica } from "./TarjetaDeMetrica";
export { BaldosaDeAccion } from "./BaldosaDeAccion";
export { Grafica } from "./Grafica";
export { Avatar } from "./Avatar";
export { Tabla, TablaFila, TablaCelda } from "./Tabla";
export { Buscador } from "./Buscador";
export { Avisos } from "./Avisos";
export { TarjetaPromocional } from "./TarjetaPromocional";
