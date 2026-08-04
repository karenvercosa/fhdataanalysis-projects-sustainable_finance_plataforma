import { describe, it, expect } from "vitest";
import { SEAL, ALL_SEALS, sealForRole, sponsorKindOf } from "@/lib/seals";

describe("SEAL", () => {
  it("descreve os três selos de identidade", () => {
    expect(ALL_SEALS).toEqual(["Palestrante", "Curador", "Patrocinador"]);
  });

  it("cada selo traz rótulo, tag, anel e ponto", () => {
    for (const kind of ALL_SEALS) {
      expect(SEAL[kind]).toMatchObject({
        label: kind,
        badge: expect.any(String),
        ring: expect.any(String),
        dot: expect.any(String),
      });
    }
  });
});

describe("sealForRole", () => {
  it("palestrante recebe o selo de palestrante", () => {
    expect(sealForRole("speaker")).toBe("Palestrante");
  });

  it("curador cai em patrocinador quando o tipo não é informado", () => {
    expect(sealForRole("curator")).toBe("Patrocinador");
  });

  it("curador respeita o tipo informado", () => {
    expect(sealForRole("curator", "Curador")).toBe("Curador");
    expect(sealForRole("curator", "Patrocinador")).toBe("Patrocinador");
  });

  it("os demais papéis circulam sem selo", () => {
    for (const role of ["guest", "attendee", "operator", "admin"] as const) {
      expect(sealForRole(role)).toBeUndefined();
    }
  });
});

describe("sponsorKindOf", () => {
  it("pessoa física assina como curador", () => {
    expect(sponsorKindOf("PF")).toBe("Curador");
  });

  it("CNPJ assina como patrocinador", () => {
    expect(sponsorKindOf("CNPJ")).toBe("Patrocinador");
  });
});
