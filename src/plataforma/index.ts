/**
 * LA FRONTERA CON LA PLATAFORMA.
 *
 * Todo lo que el panel sabe del sistema operativo entra por aquí. Ninguna
 * pantalla importa `@capacitor/*` directamente — así el paquete de la web no
 * arrastra plugins nativos, y una prueba puede simular la plataforma sin
 * parchear medio Capacitor.
 */
export { plataforma, esNativo, esIOS, esAndroid, esWeb, soloNativo, siNativo } from "./plataforma";
export type { Plataforma } from "./plataforma";
export { toqueLeve, toqueExito, toqueAviso } from "./haptica";
export { almacenDeCredenciales } from "./almacenDeCredenciales";
export type { AlmacenDeCredenciales } from "./almacenDeCredenciales";
export { arrancarNativo, ocultarSplash } from "./arranqueNativo";
export { abrirFuera, alAbrirFuera } from "./enlacesExternos";
export { useConectividad } from "./conectividad";
export { useAtras, atenderAtras } from "./botonAtras";
export { CicloNativo } from "./CicloNativo";
