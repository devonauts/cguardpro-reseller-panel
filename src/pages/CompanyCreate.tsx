import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boton, Campo, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { companiesService, type AltaDeEmpresa } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./CompanyForm.scss";

/**
 * Dar de alta una empresa.
 *
 * ── LO QUE ESTE FORMULARIO NO TIENE, Y ES LO IMPORTANTE ───────────────────
 * No hay selector de quién factura, ni de socio, ni de plan, ni de prueba, ni
 * de Stripe, ni de suspensión, ni de módulos. Esos valores los pone el servidor
 * y no son negociables: una empresa dada de alta por un socio nace suya, la
 * factura él, y CGuardPro no le abre ninguna prueba ni le cobra nada
 * directamente. Ofrecer un control para algo que el servidor va a ignorar sólo
 * enseña a la gente que el formulario miente.
 *
 * Se explica en la pantalla, además, porque quien la rellena está dando de alta
 * a un cliente suyo y necesita saber qué acaba de pasar.
 */
export function CompanyCreate() {
  const navigate = useNavigate();
  const t = useT();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [businessTitle, setBusinessTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");

  const puedeEnviar = name.trim().length > 0 && ownerEmail.trim().length > 0;

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!puedeEnviar || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const datos: AltaDeEmpresa = {
        name: name.trim(),
        businessTitle: businessTitle.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        owner: {
          email: ownerEmail.trim(),
          firstName: ownerFirstName.trim() || undefined,
          lastName: ownerLastName.trim() || undefined,
        },
      };
      const r = await companiesService.create(datos);
      navigate(`/companies/${r.company.id}`, { replace: true });
    } catch (e: any) {
      /* El 409 del cupo lleno llega aquí. Se enseña el mensaje del servidor tal
         cual: dice cuántas empresas son el límite, que es lo que hace falta
         saber. */
      setError(e?.message || t("altaEmpresa.fallo"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("altaEmpresa.titulo")}</h1>
          <p className="cabecera__sub">{t("altaEmpresa.sub")}</p>
        </div>
        <Boton variante="fantasma" onClick={() => navigate("/companies")}>
          {t("comun.cancelar")}
        </Boton>
      </header>

      <div className="ficha">
        <div className="ficha__columna">
          <Tarjeta>
            <TarjetaCabecera titulo={t("altaEmpresa.laEmpresa")} />
            <div className="ficha__campos">
              <Campo
                etiqueta={t("altaEmpresa.nombre")}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                ayuda={t("altaEmpresa.nombreAyuda")}
              />
              <Campo
                etiqueta={t("altaEmpresa.razonSocial")}
                value={businessTitle}
                onChange={(e) => setBusinessTitle(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.correoContacto")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.telefono")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.pais")}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                ayuda={t("altaEmpresa.paisAyuda")}
              />
              <Campo
                etiqueta={t("altaEmpresa.ciudad")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.direccion")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.ruc")}
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
              />
            </div>
          </Tarjeta>
        </div>

        <div className="ficha__columna">
          <Tarjeta>
            <TarjetaCabecera
              titulo={t("altaEmpresa.admin")}
              nota={t("altaEmpresa.adminNota")}
            />
            <div className="ficha__campos">
              <Campo
                etiqueta={t("altaEmpresa.correo")}
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.nombrePila")}
                value={ownerFirstName}
                onChange={(e) => setOwnerFirstName(e.target.value)}
              />
              <Campo
                etiqueta={t("altaEmpresa.apellido")}
                value={ownerLastName}
                onChange={(e) => setOwnerLastName(e.target.value)}
              />
            </div>
          </Tarjeta>

          <Tarjeta>
            <TarjetaCabecera titulo={t("altaEmpresa.queVaAPasar")} />
            <ul className="ficha__lista">
              <li>{t("altaEmpresa.punto1")}</li>
              <li>
                <strong>{t("altaEmpresa.punto2Fuerte")}</strong>
                {t("altaEmpresa.punto2Resto")}
              </li>
              <li>{t("altaEmpresa.punto3")}</li>
              <li>{t("altaEmpresa.punto4")}</li>
            </ul>
          </Tarjeta>
        </div>
      </div>

      {error && <p role="alert" className="ficha__error">{error}</p>}

      <div className="ficha__pie">
        <Boton variante="fantasma" onClick={() => navigate("/companies")}>
          {t("comun.cancelar")}
        </Boton>
        <Boton type="submit" cargando={enviando} disabled={!puedeEnviar}>
          {t("altaEmpresa.darDeAlta")}
        </Boton>
      </div>
    </form>
  );
}

export default CompanyCreate;
