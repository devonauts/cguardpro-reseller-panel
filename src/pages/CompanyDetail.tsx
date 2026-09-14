import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, Campo, Dato, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera,
} from "@/components/ui/kit";
import { companiesService, type Empresa } from "@/services/resellerService";
import "./CompanyForm.css";

/**
 * La ficha de una empresa.
 *
 * ── NO ES UN TABLERO DE OPERACIÓN ─────────────────────────────────────────
 * No hay vigilantes conectados, ni incidentes, ni rondas, ni ubicaciones, ni
 * cámaras, ni turnos. Es la ficha COMERCIAL de un cliente: quién es, cómo se le
 * localiza y desde cuándo. Todo lo demás pertenece a la empresa y a su gente.
 *
 * ── LO QUE SE PUEDE CORREGIR Y LO QUE NO ──────────────────────────────────
 * Se corrigen los datos de contacto y de identificación. No se toca el plan, ni
 * la facturación, ni la suspensión, ni los módulos: el servidor los ignoraría
 * igualmente, y ofrecer el control enseñaría que el formulario miente.
 *
 * La suspensión se MUESTRA porque el socio necesita saber si su cliente está
 * parado; pero es una palanca de la plataforma y se opera desde allí.
 */

function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
}

export function CompanyDetail() {
  const { tenantId = "" } = useParams();
  const navigate = useNavigate();
  const { puede } = useResellerAuth();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Partial<Empresa>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const e = await companiesService.detail(tenantId);
      setEmpresa(e);
      setBorrador({});
      setEditando(false);
    } catch (e: any) {
      /* Una empresa que no es suya contesta igual que una que no existe: el
         servidor no distingue, y la pantalla tampoco debe hacerlo. */
      setError(e?.message || "No se encontró esta empresa.");
    } finally {
      setCargando(false);
    }
  }, [tenantId]);

  useEffect(() => { cargar(); }, [cargar]);

  const puedeEditar = puede("reseller.company.update");

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await companiesService.update(tenantId, borrador as any);
      setEmpresa(r.company);
      setBorrador({});
      setEditando(false);
      setAviso(r.changed.length ? "Guardado." : "No había nada que cambiar.");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const campo = (k: keyof Empresa) =>
    (borrador[k] as string) ?? (empresa?.[k] as string) ?? "";

  return (
    <div>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{empresa?.name || "Empresa"}</h1>
          <p className="cabecera__sub">
            {empresa?.businessTitle || "Ficha comercial de tu cliente"}
          </p>
        </div>
        <div className="cabecera__acciones">
          {empresa?.suspendedAt && <Pildora tono="peligro">Suspendida</Pildora>}
          <Boton variante="fantasma" onClick={() => navigate("/companies")}>
            Volver
          </Boton>
          {puedeEditar && !editando && empresa && (
            <Boton variante="suave" onClick={() => setEditando(true)}>
              Corregir datos
            </Boton>
          )}
        </div>
      </header>

      <EstadoDeDatos cargando={cargando} error={!empresa ? error : null} onReintentar={cargar}>
        {empresa && !editando && (
          <div className="ficha">
            <div className="ficha__columna">
              <Tarjeta>
                <TarjetaCabecera titulo="Identidad" />
                <dl className="ficha__datos">
                  <Dato etiqueta="Nombre" valor={empresa.name} />
                  <Dato etiqueta="Razón social" valor={empresa.businessTitle} />
                  <Dato etiqueta="Identificación tributaria" valor={empresa.taxNumber} />
                  <Dato etiqueta="Alta" valor={fecha(empresa.createdAt)} />
                </dl>
              </Tarjeta>
            </div>

            <div className="ficha__columna">
              <Tarjeta>
                <TarjetaCabecera titulo="Contacto" />
                <dl className="ficha__datos">
                  <Dato etiqueta="Correo" valor={empresa.email} />
                  <Dato etiqueta="Teléfono" valor={empresa.phone} />
                  <Dato etiqueta="País" valor={empresa.country} />
                  <Dato etiqueta="Ciudad" valor={empresa.city} />
                  <Dato etiqueta="Dirección" valor={empresa.address} />
                  <Dato etiqueta="Zona horaria" valor={empresa.timezone} />
                </dl>
              </Tarjeta>

              {empresa.suspendedAt && (
                <Tarjeta>
                  <TarjetaCabecera titulo="Suspendida" />
                  <p className="ficha__nota">
                    Esta empresa está suspendida desde el{" "}
                    {fecha(empresa.suspendedAt)}. Es una medida administrativa de
                    la plataforma; habla con tu contacto para revisarla.
                  </p>
                </Tarjeta>
              )}
            </div>
          </div>
        )}

        {empresa && editando && (
          <form onSubmit={guardar}>
            <Tarjeta>
              <TarjetaCabecera
                titulo="Corregir datos"
                nota="Sólo los datos de contacto e identificación de tu cliente."
              />
              <div className="ficha__campos">
                <Campo etiqueta="Nombre" value={campo("name")}
                  onChange={(e) => setBorrador((b) => ({ ...b, name: e.target.value }))} />
                <Campo etiqueta="Razón social" value={campo("businessTitle")}
                  onChange={(e) => setBorrador((b) => ({ ...b, businessTitle: e.target.value }))} />
                <Campo etiqueta="Correo" type="email" value={campo("email")}
                  onChange={(e) => setBorrador((b) => ({ ...b, email: e.target.value }))} />
                <Campo etiqueta="Teléfono" value={campo("phone")}
                  onChange={(e) => setBorrador((b) => ({ ...b, phone: e.target.value }))} />
                <Campo etiqueta="País" value={campo("country")}
                  onChange={(e) => setBorrador((b) => ({ ...b, country: e.target.value }))} />
                <Campo etiqueta="Ciudad" value={campo("city")}
                  onChange={(e) => setBorrador((b) => ({ ...b, city: e.target.value }))} />
                <Campo etiqueta="Dirección" value={campo("address")}
                  onChange={(e) => setBorrador((b) => ({ ...b, address: e.target.value }))} />
                <Campo etiqueta="Identificación tributaria" value={campo("taxNumber")}
                  onChange={(e) => setBorrador((b) => ({ ...b, taxNumber: e.target.value }))} />
              </div>

              {error && <p role="alert" className="ficha__error">{error}</p>}

              <div className="ficha__pie">
                <Boton variante="fantasma" onClick={() => { setEditando(false); setBorrador({}); }}>
                  Cancelar
                </Boton>
                <Boton type="submit" cargando={guardando}>Guardar</Boton>
              </div>
            </Tarjeta>
          </form>
        )}

        <p className="ficha__estado" role="status" aria-live="polite">{aviso || ""}</p>
      </EstadoDeDatos>
    </div>
  );
}

export default CompanyDetail;
