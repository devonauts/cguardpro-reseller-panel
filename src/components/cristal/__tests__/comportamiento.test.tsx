// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { IdiomaProvider } from "@/i18n/IdiomaProvider";
import { elegirIdioma, idioma } from "@/i18n/idioma";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import { Boton, CampoCopiable, Campo, Emergente, Selector } from "@/components/cristal";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LAS PIEZAS REUTILIZABLES, PROBADAS PULSÁNDOLAS
 *
 * El resto de la suite afirma sobre el CÓDIGO FUENTE. Eso sirve para fijar
 * reglas —«esta cadena no se filtra», «esta ruta existe»— pero no puede
 * responder a lo único que importa de un botón: qué pasa al pulsarlo.
 *
 * Aquí no se comprueba ni una clase de CSS. Se comprueba CONDUCTA: que copiar
 * copia el valor entero, que el menú se cierra con Escape, que elegir idioma
 * no pierde la sesión y que un control deshabilitado no dispara nada.
 * ════════════════════════════════════════════════════════════════════════════
 */

const conIdioma = (nodo: React.ReactNode) => render(<IdiomaProvider>{nodo}</IdiomaProvider>);

afterEach(() => { cleanup(); elegirIdioma("en"); });

describe("Boton", () => {
  it("dispara al pulsar", () => {
    const fn = vi.fn();
    conIdioma(<Boton onClick={fn}>Hacer</Boton>);
    fireEvent.click(screen.getByText("Hacer"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cargando NO se puede pulsar, y lo ANUNCIA", () => {
    /* `aria-busy` no es decoración: quien no ve el giro necesita enterarse de
       que está esperando, y quien sí lo ve no debe poder pulsar dos veces. */
    const fn = vi.fn();
    conIdioma(<Boton cargando onClick={fn}>Guardar</Boton>);
    const b = screen.getByText("Guardar");
    fireEvent.click(b);
    expect(fn).not.toHaveBeenCalled();
    expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(b.getAttribute("aria-busy")).toBe("true");
  });

  it("es `type=button` salvo que se pida otra cosa", () => {
    /* El defecto de HTML es `submit`: un botón suelto dentro de un formulario
       lo envía sin que nadie lo pida. */
    conIdioma(<Boton>Uno</Boton>);
    expect(screen.getByText("Uno").getAttribute("type")).toBe("button");
    cleanup();
    conIdioma(<Boton type="submit">Dos</Boton>);
    expect(screen.getByText("Dos").getAttribute("type")).toBe("submit");
  });
});

describe("CampoCopiable · lo que va al portapapeles", () => {
  const LARGO = "Npu3yldkg1ua_Vvy-pY2xrz7fs-Vc_ccbGz_moQ-q40";

  function conPortapapeles() {
    const escrito: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (v: string) => { escrito.push(v); return Promise.resolve(); } },
    });
    return escrito;
  }

  it("copia el valor ENTERO, no lo que se ve", async () => {
    /* La regla que sostiene toda la pantalla de dominios: el texto se parte
       para caber, pero lo que se copia es la cadena original. Un registro
       copiado a medias no falla al momento — falla media hora después, cuando
       la verificación no pasa y nadie sabe por qué. */
    const escrito = conPortapapeles();
    conIdioma(<CampoCopiable etiqueta="Value" valor={LARGO} />);
    fireEvent.click(screen.getByRole("button"));
    await Promise.resolve();
    expect(escrito).toEqual([LARGO]);
  });

  it("el valor completo está en el DOM: nada se trunca", () => {
    conIdioma(<CampoCopiable etiqueta="Value" valor={LARGO} />);
    expect(screen.getByText(LARGO)).toBeTruthy();
  });

  it("el botón dice QUÉ copia, para quien no ve la fila", async () => {
    conPortapapeles();
    conIdioma(<CampoCopiable etiqueta="Target" valor="domains.cguardpro.com" />);
    expect(screen.getByLabelText("Copy Target")).toBeTruthy();
  });

  it("sin permiso de portapapeles no rompe: el valor sigue a la vista", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denegado")) },
    });
    conIdioma(<CampoCopiable etiqueta="Value" valor={LARGO} />);
    fireEvent.click(screen.getByRole("button"));
    await Promise.resolve();
    expect(screen.getByText(LARGO)).toBeTruthy();
  });
});

describe("Emergente · el menú flotante", () => {
  it("cerrado no está en el DOM", () => {
    conIdioma(<Emergente abierto={false} onCerrar={() => {}}>contenido</Emergente>);
    expect(screen.queryByText("contenido")).toBeNull();
  });

  it("Escape lo cierra: quien lo abrió con teclado sale con teclado", () => {
    const cerrar = vi.fn();
    conIdioma(<Emergente abierto onCerrar={cerrar}>contenido</Emergente>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cerrar).toHaveBeenCalled();
  });

  it("pulsar fuera lo cierra; pulsar dentro no", () => {
    const cerrar = vi.fn();
    conIdioma(<Emergente abierto onCerrar={cerrar}>contenido</Emergente>);
    fireEvent.mouseDown(screen.getByText("contenido"));
    expect(cerrar).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it("se anuncia como menú", () => {
    conIdioma(<Emergente abierto onCerrar={() => {}} etiqueta="Mi cuenta">x</Emergente>);
    expect(screen.getByRole("menu").getAttribute("aria-label")).toBe("Mi cuenta");
  });
});

describe("SelectorDeIdioma · variante segmentada (dentro del menú de cuenta)", () => {
  it("arranca en inglés y el cambio se refleja al momento", () => {
    conIdioma(<SelectorDeIdioma variante="segmentado" />);
    expect(idioma()).toBe("en");
    fireEvent.click(screen.getByText("Español"));
    expect(idioma()).toBe("es");
  });

  it("la elección PERSISTE", () => {
    conIdioma(<SelectorDeIdioma variante="segmentado" />);
    fireEvent.click(screen.getByText("Español"));
    expect(localStorage.getItem("cguard_reseller_lang")).toBe("es");
  });

  it("NO toca la sesión: cambiar de idioma no echa a nadie", () => {
    /* La regresión más fácil de este control sería resolverlo recargando. */
    localStorage.setItem("cguard_reseller_token", "sesion-viva");
    conIdioma(<SelectorDeIdioma variante="segmentado" />);
    fireEvent.click(screen.getByText("Español"));
    expect(localStorage.getItem("cguard_reseller_token")).toBe("sesion-viva");
  });

  it("dice cuál está puesto, y no con el color", () => {
    conIdioma(<SelectorDeIdioma variante="segmentado" />);
    expect(screen.getByText("English").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Español").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("SelectorDeIdioma · variante menú (pantalla de entrada)", () => {
  it("enseña el idioma puesto sin abrir nada", () => {
    conIdioma(<SelectorDeIdioma />);
    expect(screen.getByRole("button").textContent).toContain("English");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("abre, deja elegir y se cierra solo", () => {
    conIdioma(<SelectorDeIdioma />);
    const disparador = screen.getByRole("button");
    expect(disparador.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(disparador);
    expect(disparador.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.click(screen.getByRole("option", { name: "Español" }));
    expect(idioma()).toBe("es");
    /* Se cierra al elegir: dejarlo abierto tapa el primer campo. */
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("marca la opción puesta para quien no ve el color", () => {
    conIdioma(<SelectorDeIdioma />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("option", { name: "English" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("option", { name: "Español" }).getAttribute("aria-selected")).toBe("false");
  });

  it("Escape lo cierra: se abrió con teclado, se sale con teclado", () => {
    conIdioma(<SelectorDeIdioma />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("listbox").querySelector("button")!, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("y tampoco aquí se toca la sesión", () => {
    localStorage.setItem("cguard_reseller_token", "sesion-viva");
    conIdioma(<SelectorDeIdioma />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "Español" }));
    expect(localStorage.getItem("cguard_reseller_token")).toBe("sesion-viva");
    expect(localStorage.getItem("cguard_reseller_lang")).toBe("es");
  });
});

describe("Campo y Selector · la etiqueta apunta al control", () => {
  it("el Campo se encuentra por su etiqueta", () => {
    conIdioma(<Campo etiqueta="Email" />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });

  it("dos campos con la MISMA etiqueta no comparten `id`", () => {
    /* El `id` salía de la etiqueta. Como la etiqueta se traduce, cambiar de
       idioma cambiaba el `id`; y dos campos iguales en un formulario
       colisionaban y la etiqueta apuntaba al control equivocado. */
    conIdioma(<><Campo etiqueta="Email" /><Campo etiqueta="Email" /></>);
    const ids = screen.getAllByLabelText("Email").map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("el error se ANUNCIA y se ata al control", () => {
    conIdioma(<Campo etiqueta="Email" error="No vale" />);
    const control = screen.getByLabelText("Email");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("No vale");
    expect(control.getAttribute("aria-describedby")).toContain(
      screen.getByRole("alert").id,
    );
  });

  it("el Selector deshabilitado queda deshabilitado de verdad", () => {
    /* Se afirma el ATRIBUTO y no que no dispare: `fireEvent.change` inyecta el
       evento en el nodo saltándose al navegador, así que «no se dispara» aquí
       no probaría nada sobre lo que puede hacer una persona. Lo que impide el
       cambio de verdad es `disabled`, y eso sí se puede comprobar. */
    conIdioma(
      <Selector etiquetaOculta="Rol" disabled value="a" onChange={() => {}}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Selector>,
    );
    expect((screen.getByLabelText("Rol") as HTMLSelectElement).disabled).toBe(true);
  });
});
