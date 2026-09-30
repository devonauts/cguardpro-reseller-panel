import { describe, expect, it } from "vitest";

import { pendiente, type Novedad } from "../registro";

const lista: Novedad[] = [
  { id: "a", ancla: ".x", caduca: "2026-12-31" },
  { id: "b", ancla: ".y", caduca: "2026-12-31" },
];

describe("las novedades", () => {
  it("enseña la primera que no se ha visto", () => {
    expect(pendiente(lista, new Set(), new Date("2026-10-01"))?.id).toBe("a");
    expect(pendiente(lista, new Set(["a"]), new Date("2026-10-01"))?.id).toBe("b");
  });

  it("una vez vistas todas, ninguna", () => {
    expect(pendiente(lista, new Set(["a", "b"]), new Date("2026-10-01"))).toBeNull();
  });

  it("caducada, ya no es noticia", () => {
    expect(pendiente(lista, new Set(), new Date("2027-01-02"))).toBeNull();
  });
});
