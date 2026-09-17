/// <reference types="vite/client" />

/**
 * Los assets como módulos.
 *
 * Vite los resuelve a una URL con huella en el nombre, así que el navegador
 * puede cachearlos para siempre y aun así recibir el nuevo cuando cambien. Por
 * eso el planeta se importa y no se escribe su ruta a mano en un `src`: una
 * ruta escrita a mano se queda sin huella y con ella el caché eterno miente.
 */
declare module "*.avif" {
  const url: string;
  export default url;
}
