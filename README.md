# Panel de socio (`reseller-panel`)

El backoffice de los distribuidores de marca blanca. **Es una aplicación
aparte** — como `superadmin/` — porque sirve a otro cliente: `frontend/` es para
las empresas de seguridad y esto es para quien se las trae.

Mismo backend, siempre. No hay ni habrá un segundo servidor.

## La frontera

No importa **nada** de `frontend/src` ni de `superadmin/src`, ni al revés. No es
una convención: `npm run build` corre el cortafuegos antes de compilar y
comprueba el paquete después, y si hay un cruce no hay artefacto.

```
npm run check:firewall   # las fuentes, en las dos direcciones
npm run check:bundle     # el resultado, tras construir
```

Si algún día hacen falta piezas comunes de verdad, van a un paquete compartido a
propósito. Nunca a una importación cruzada del código de otra aplicación.

## Desarrollo

```
npm install
npm run dev            # http://localhost:5184/panel/
```

`/api` se redirige a `http://localhost:8080` (`VITE_DEV_API_TARGET` lo cambia).

La capa comercial del backend nace **apagada**: con `RESELLER_LAYER_ENABLED`
distinto de `true`, todo `/api/reseller/*` contesta 404 y el panel enseña «no
disponible» en vez de una pantalla rota.

## Construcción y despliegue

```
npm run build          # cortafuegos → tsc → vite build → comprobación del paquete
```

Sale en `dist/`, con `base=/panel/`. Se publica en `/var/www/reseller-panel` y
se sirve con el bloque de `backend/deploy/nginx/panel.location.conf`.

## Los estilos

Todo el color vive en `src/styles/tokens.css`. Fuera de ese archivo no hay ni un
literal. El motivo es la fase de marca: cuando un socio ponga la suya, lo que
cambia es el TONO (`--brand-h`) y el sistema fija la luminosidad — así ninguna
elección de color puede dejar su propio panel ilegible. Con colores sueltos por
los componentes, el panel quedaría medio teñido.
