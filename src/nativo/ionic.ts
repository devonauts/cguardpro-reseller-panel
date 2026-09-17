/**
 * ════════════════════════════════════════════════════════════════════════════
 * LO QUE SE LE COGE A IONIC — Y LO QUE NO
 *
 * Este fichero existe para que las hojas de Ionic caigan en el TROZO PEREZOSO
 * y no en el paquete de la web. Se midió: importar Ionic desde el armazón
 * compartido llevaba el paquete de entrada de 221 kB a 1.030 kB. La web no
 * paga eso (§42), así que todo lo de Ionic entra por `import()` y sólo cuando
 * la aplicación corre instalada.
 *
 * ── SÓLO DOS HOJAS ────────────────────────────────────────────────────────
 * `core` y `structure` son las que hacen que `ion-content` se comporte como el
 * contenedor de desplazamiento de una app: inercia, rebote, y el hueco que
 * dejan la barra de estado y el indicador de inicio.
 *
 * `typography.css` y `normalize.css` NO se importan a propósito. Traen la
 * tipografía y los resets de Ionic, que pisarían el sistema de diseño entero —
 * la letra, los tamaños y los márgenes que ya están decididos. Ionic aquí pone
 * el COMPORTAMIENTO; el aspecto ya lo tenemos.
 * ════════════════════════════════════════════════════════════════════════════
 */
import "@ionic/react/css/core.css";
import "@ionic/react/css/structure.css";
import "./ionic.scss";

export { IonApp, IonContent, IonPage, setupIonicReact } from "@ionic/react";
