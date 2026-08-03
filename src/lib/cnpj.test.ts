import { describe, it, expect } from "vitest";
import { formatarCnpj, apenasCnpj, cnpjCompleto } from "@/lib/cnpj";

describe("CNPJ alfanumérico", () => {
  it("formata numérico", () => {
    expect(formatarCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });
  it("aceita letras nas 12 primeiras posições", () => {
    expect(formatarCnpj("ab345cd8000190")).toBe("AB.345.CD8/0001-90");
  });
  it("recusa letra nos dígitos verificadores", () => {
    expect(apenasCnpj("123456780001AB")).toBe("123456780001");
  });
  it("formata parcialmente enquanto digita", () => {
    expect(formatarCnpj("AB3")).toBe("AB.3");
    expect(formatarCnpj("AB345C")).toBe("AB.345.C");
  });
  it("ignora pontuação colada e limita a 14", () => {
    expect(formatarCnpj("AB.345.CD8/0001-90999")).toBe("AB.345.CD8/0001-90");
  });
  it("reconhece completo", () => {
    expect(cnpjCompleto("AB.345.CD8/0001-90")).toBe(true);
    expect(cnpjCompleto("AB.345.CD8/0001-9")).toBe(false);
  });
});
