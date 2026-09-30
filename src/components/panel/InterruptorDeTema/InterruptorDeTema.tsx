import { Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { useTema } from "@/tema/tema";
import "./InterruptorDeTema.scss";

/**
 * Claro / oscuro, con un interruptor como el de iOS: la bola lleva el sol o la
 * luna y se desliza. Es un `role="switch"`, así que se anuncia y se acciona con
 * teclado (espacio / intro) como cualquier interruptor.
 */
export function InterruptorDeTema() {
  const t = useT();
  const [tema, cambiar] = useTema();
  const claro = tema === "claro";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={claro}
      className="tema-interruptor"
      onClick={() => cambiar(claro ? "oscuro" : "claro")}
    >
      <span className="tema-interruptor__rotulo">
        <Icono nombre={claro ? "sol" : "luna"} tamano={16} />
        {t("tema.modoClaro")}
      </span>
      <span className={`tema-interruptor__carril${claro ? " tema-interruptor__carril--on" : ""}`} aria-hidden="true">
        <span className="tema-interruptor__bola">
          <Icono nombre={claro ? "sol" : "luna"} tamano={14} />
        </span>
      </span>
    </button>
  );
}

export default InterruptorDeTema;
