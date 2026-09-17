import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import {
  Boton, Campo, Dato, EstadoDeDatos, Pildora, Tarjeta, TarjetaCabecera,
} from "@/components/cristal";
import { companiesService, type Empresa } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import { fecha } from "@/lib/dinero";
import "./CompanyForm.scss";

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

export function CompanyDetail() {
  const { tenantId = "" } = useParams();
  const navigate = useNavigate();
  const { puede } = useResellerAuth();
  const t = useT();

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
      setError(e?.message || t("fichaEmpresa.noEncontrada"));
    } finally {
      setCargando(false);
    }
  }, [tenantId, t]);

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
      setAviso(t(r.changed.length ? "fichaEmpresa.guardado" : "fichaEmpresa.sinCambios"));
    } catch (e: any) {
      setError(e?.message || t("fichaEmpresa.noGuardo"));
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
          <h1 className="cabecera__titulo">{empresa?.name || t("fichaEmpresa.titulo")}</h1>
          <p className="cabecera__sub">
            {empresa?.businessTitle || t("fichaEmpresa.sub")}
          </p>
        </div>
        <div className="cabecera__acciones">
          {empresa?.suspendedAt && <Pildora tono="peligro">{t("empresas.suspendida")}</Pildora>}
          <Boton variante="fantasma" onClick={() => navigate("/companies")}>
            {t("comun.volver")}
          </Boton>
          {puedeEditar && !editando && empresa && (
            <Boton variante="suave" onClick={() => setEditando(true)}>
              {t("fichaEmpresa.corregir")}
            </Boton>
          )}
        </div>
      </header>

      <EstadoDeDatos cargando={cargando} error={!empresa ? error : null} onReintentar={cargar}>
        {empresa && !editando && (
          <div className="ficha">
            <div className="ficha__columna">
              <Tarjeta>
                <TarjetaCabecera titulo={t("fichaEmpresa.identidad")} />
                <dl className="ficha__datos">
                  <Dato etiqueta={t("altaEmpresa.nombre")} valor={empresa.name} />
                  <Dato etiqueta={t("altaEmpresa.razonSocial")} valor={empresa.businessTitle} />
                  <Dato etiqueta={t("altaEmpresa.ruc")} valor={empresa.taxNumber} />
                  <Dato etiqueta={t("fichaEmpresa.alta")} valor={fecha(empresa.createdAt)} />
                </dl>
              </Tarjeta>
            </div>

            <div className="ficha__columna">
              <Tarjeta>
                <TarjetaCabecera titulo={t("fichaEmpresa.contacto")} />
                <dl className="ficha__datos">
                  <Dato etiqueta={t("altaEmpresa.correo")} valor={empresa.email} />
                  <Dato etiqueta={t("altaEmpresa.telefono")} valor={empresa.phone} />
                  <Dato etiqueta={t("altaEmpresa.pais")} valor={empresa.country} />
                  <Dato etiqueta={t("altaEmpresa.ciudad")} valor={empresa.city} />
                  <Dato etiqueta={t("altaEmpresa.direccion")} valor={empresa.address} />
                  <Dato etiqueta={t("fichaEmpresa.zonaHoraria")} valor={empresa.timezone} />
                </dl>
              </Tarjeta>

              {empresa.suspendedAt && (
                <Tarjeta>
                  <TarjetaCabecera titulo={t("fichaEmpresa.suspendidaTitulo")} />
                  <p className="ficha__nota">
                    {t("fichaEmpresa.suspendidaNota", { f: fecha(empresa.suspendedAt) })}
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
                titulo={t("fichaEmpresa.corregir")}
                nota={t("fichaEmpresa.corregirNota")}
              />
              <div className="ficha__campos">
                <Campo etiqueta={t("altaEmpresa.nombre")} value={campo("name")}
                  onChange={(e) => setBorrador((b) => ({ ...b, name: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.razonSocial")} value={campo("businessTitle")}
                  onChange={(e) => setBorrador((b) => ({ ...b, businessTitle: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.correo")} type="email" value={campo("email")}
                  onChange={(e) => setBorrador((b) => ({ ...b, email: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.telefono")} value={campo("phone")}
                  onChange={(e) => setBorrador((b) => ({ ...b, phone: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.pais")} value={campo("country")}
                  onChange={(e) => setBorrador((b) => ({ ...b, country: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.ciudad")} value={campo("city")}
                  onChange={(e) => setBorrador((b) => ({ ...b, city: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.direccion")} value={campo("address")}
                  onChange={(e) => setBorrador((b) => ({ ...b, address: e.target.value }))} />
                <Campo etiqueta={t("altaEmpresa.ruc")} value={campo("taxNumber")}
                  onChange={(e) => setBorrador((b) => ({ ...b, taxNumber: e.target.value }))} />
              </div>

              {error && <p role="alert" className="ficha__error">{error}</p>}

              <div className="ficha__pie">
                <Boton variante="fantasma" onClick={() => { setEditando(false); setBorrador({}); }}>
                  {t("comun.cancelar")}
                </Boton>
                <Boton type="submit" cargando={guardando}>{t("comun.guardar")}</Boton>
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
