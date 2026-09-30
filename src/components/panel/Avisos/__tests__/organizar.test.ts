import { describe, expect, it } from "vitest";

import { organizar } from "../organizar";

const ahora = new Date("2026-09-30T15:00:00");
const aviso = (id: string, tipo: string, leido: boolean, horasAtras: number) => ({
  id, tipo, leido, datos: {}, enlace: null,
  createdAt: new Date(ahora.getTime() - horasAtras * 3_600_000).toISOString(),
}) as any;

describe("el cajón de avisos", () => {
  it("lo no leído va arriba y lo leído por día", () => {
    const b = organizar([
      aviso("1", "ticket.respuesta", true, 1),
      aviso("2", "ticket.resuelto", false, 30),
      aviso("3", "ticket.en_curso", true, 20),
      aviso("4", "cobro.pasarela", true, 24 * 5),
    ], new Set(), ahora);
    expect(b.nuevas.map((p) => p.avisos[0].id)).toEqual(["2"]);
    expect(b.secciones.map((s) => s.dia)).toEqual(["hoy", "ayer", "antes"]);
  });

  it("apila los seguidos del mismo tipo, como iOS", () => {
    const b = organizar([
      aviso("1", "ticket.respuesta", false, 1),
      aviso("2", "ticket.respuesta", false, 2),
      aviso("3", "ticket.resuelto", false, 3),
    ], new Set(), ahora);
    expect(b.nuevas.map((p) => p.avisos.length)).toEqual([2, 1]);
  });

  it("lo quitado deslizando ya no sale", () => {
    const b = organizar([aviso("1", "x", true, 1), aviso("2", "x", true, 1)], new Set(["1"]), ahora);
    expect(b.secciones[0].pilas[0].avisos.map((a) => a.id)).toEqual(["2"]);
  });
});
