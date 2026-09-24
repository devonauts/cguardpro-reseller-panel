import { useState } from "react";
import { Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import "./DescargarPdf.scss";

interface Props {
  /** Fetches the file with the session and hands it to the browser. */
  descargar: () => Promise<void>;
  etiqueta: string;
}

/** A button that downloads an authenticated PDF, and says so when it can't. */
export function DescargarPdf({ descargar, etiqueta }: Props) {
  const t = useT();
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alPulsar = async () => {
    if (bajando) return;
    setError(null);
    setBajando(true);
    try {
      await descargar();
    } catch (e: any) {
      setError(e?.message || t("comun.noSePudo"));
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="descargar-pdf">
      <button type="button" className="btn btn--suave" onClick={alPulsar} disabled={bajando} aria-busy={bajando}>
        <Icono nombre="libro" tamano={15} />
        {bajando ? t("comun.descargando") : etiqueta}
      </button>
      {error && <p role="alert" className="descargar-pdf__error">{error}</p>}
    </div>
  );
}

export default DescargarPdf;
