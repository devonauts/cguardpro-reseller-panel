// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { IdiomaProvider } from "@/i18n/IdiomaProvider";
import { elegirIdioma } from "@/i18n/idioma";
import { Confirmar } from "@/components/cristal";

/* What charges money or removes access must never act on the first click. */

const conIdioma = (nodo: React.ReactNode) => render(<IdiomaProvider>{nodo}</IdiomaProvider>);
afterEach(() => { cleanup(); elegirIdioma("en"); });

describe("Confirmar", () => {
  it("the first click only asks; nothing happens yet", () => {
    const fn = vi.fn();
    conIdioma(<Confirmar pregunta="Charge $10?" onConfirmar={fn}>Activate</Confirmar>);
    fireEvent.click(screen.getByText("Activate"));
    expect(fn).not.toHaveBeenCalled();
    expect(screen.getByText("Charge $10?")).toBeTruthy();
  });

  it("confirm acts once; cancel goes back without acting", async () => {
    const fn = vi.fn();
    conIdioma(<Confirmar pregunta="Sure?" textoConfirmar="Yes, do it" onConfirmar={fn}>Remove</Confirmar>);

    fireEvent.click(screen.getByText("Remove"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(fn).not.toHaveBeenCalled();
    expect(screen.getByText("Remove")).toBeTruthy();

    fireEvent.click(screen.getByText("Remove"));
    await act(async () => { fireEvent.click(screen.getByText("Yes, do it")); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("disabled never opens the question", () => {
    const fn = vi.fn();
    conIdioma(<Confirmar disabled pregunta="Sure?" onConfirmar={fn}>Remove</Confirmar>);
    fireEvent.click(screen.getByText("Remove"));
    expect(screen.queryByText("Sure?")).toBeNull();
  });
});
