import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Boton } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import { companiesService, type Empresa } from "@/services/resellerService";
import "./EliminarEmpresa.scss";

/**
 * Confirmar que se elimina una empresa.
 *
 * Se pide ESCRIBIR su nombre, como en GitHub: un botón de «¿seguro?» se pulsa
 * sin leer, y aquí se va una empresa con su gente dentro. El servidor vuelve a
 * comprobar el nombre; este campo sólo evita el viaje de ida.
 */
export function EliminarEmpresa({
  empresa, abierto, onCerrar, onEliminada,
}: {
  empresa: Pick<Empresa, "id" | "name"> | null;
  abierto: boolean;
  onCerrar: () => void;
  onEliminada: () => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return undefined;
    setTexto("");
    setError(null);
    window.setTimeout(() => campo.current?.focus(), 30);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !enviando) onCerrar(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto || !empresa) return null;

  const nombre = empresa.name || "";
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  const coincide = !!nombre && norm(texto) === norm(nombre);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!coincide || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await companiesService.remove(empresa.id, texto);
      onEliminada();
    } catch (err: any) {
      setError(err?.message || t("bajaEmpresa.noSeElimino"));
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="dialogo-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget && !enviando) onCerrar(); }}>
      <form
        className="dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="eliminar-titulo"
        aria-describedby="eliminar-texto"
        onSubmit={enviar}
      >
        <h2 id="eliminar-titulo" className="dialogo__titulo">{t("bajaEmpresa.eliminarTitulo", { nombre })}</h2>
        <p id="eliminar-texto" className="dialogo__texto">{t("bajaEmpresa.eliminarTexto")}</p>
        <ul className="dialogo__lista">
          <li>{t("bajaEmpresa.eliminarPunto1")}</li>
          <li>{t("bajaEmpresa.eliminarPunto2")}</li>
          <li>{t("bajaEmpresa.eliminarPunto3")}</li>
        </ul>
        <p className="dialogo__sugerencia">{t("bajaEmpresa.mejorArchivar")}</p>
        <label className="dialogo__campo">
          <span>{t("bajaEmpresa.escribeNombre", { nombre })}</span>
          <input
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={nombre}
          />
        </label>
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="fantasma" onClick={onCerrar} disabled={enviando}>{t("comun.cancelar")}</Boton>
          <Boton type="submit" variante="peligro" disabled={!coincide} cargando={enviando}>
            {t("bajaEmpresa.eliminarDefinitivo")}
          </Boton>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export default EliminarEmpresa;
