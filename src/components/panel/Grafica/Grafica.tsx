import "./Grafica.scss";

/**
 * Una gráfica de barras, dibujada a mano.
 *
 * ── SIN LIBRERÍA, Y NO POR AHORRAR ────────────────────────────────────────
 * Es una serie de doce valores. Las librerías de gráficas pesan entre 90 y 200
 * kB, traen su propio tema —que habría que pelear para que no meta sus
 * colores— y montan un `<canvas>` o un SVG con texto que el lector de pantalla
 * no sabe leer. Doce divs con una altura en porcentaje hacen lo mismo, heredan
 * las fichas y se leen como una tabla.
 *
 * La accesibilidad va en serio: `role="img"` con un resumen, y debajo una
 * lista con los valores reales para quien no ve las barras.
 */
export function Grafica({
  datos, etiquetaAccesible,
}: {
  datos: Array<{ etiqueta: string; valor: number }>;
  etiquetaAccesible: string;
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  /* La escala se redondea hacia arriba a un múltiplo de 4 para que las cuatro
     marcas caigan en enteros distintos. Con un tope de 2 salían «2 2 1 1 0»:
     el redondeo repetía valores y el eje dejaba de significar nada. */
  const tope = Math.max(4, Math.ceil(maximo / 4) * 4);
  const marcas = [tope, (tope / 4) * 3, tope / 2, tope / 4, 0];

  return (
    <div className="grafica">
      <div className="grafica__eje" aria-hidden="true">
        {marcas.map((m) => <span key={m}>{m}</span>)}
      </div>

      <div
        className="grafica__lienzo"
        role="img"
        aria-label={`${etiquetaAccesible}: ${datos.map((d) => `${d.etiqueta} ${d.valor}`).join(", ")}`}
      >
        {datos.map((d) => (
          <div key={d.etiqueta} className="grafica__columna">
            <div className="grafica__barra-hueco">
              <div
                className="grafica__barra"
                /* `Math.max(2, …)`: un valor de cero deja una barra de 0 px y
                   la columna parece que falta. Dos píxeles dicen «aquí hay un
                   mes, y valió cero». */
                style={{ height: `${Math.max(2, (d.valor / tope) * 100)}%` }}
              />
            </div>
            <span className="grafica__etiqueta">{d.etiqueta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Grafica;
