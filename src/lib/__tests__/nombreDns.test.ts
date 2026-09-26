import { describe, expect, it } from "vitest";
import { dominioRegistrado, hostRelativo } from "../nombreDns";

describe("host relative to the registered domain", () => {
  it("strips the registered domain", () => {
    expect(hostRelativo("admin.vanderbluedesign.com", "admin.vanderbluedesign.com")).toBe("admin");
    expect(hostRelativo("_cf-custom-hostname.admin.vanderbluedesign.com", "admin.vanderbluedesign.com"))
      .toBe("_cf-custom-hostname.admin");
    expect(hostRelativo("_acme-challenge.admin.vanderbluedesign.com.", "admin.vanderbluedesign.com"))
      .toBe("_acme-challenge.admin");
  });
  it("knows two-level country suffixes", () => {
    expect(dominioRegistrado("crm.seguridad.com.ec")).toBe("seguridad.com.ec");
    expect(hostRelativo("crm.seguridad.com.mx", "crm.seguridad.com.mx")).toBe("crm");
  });
  it("the apex is @", () => {
    expect(hostRelativo("example.com", "example.com")).toBe("@");
  });
});
