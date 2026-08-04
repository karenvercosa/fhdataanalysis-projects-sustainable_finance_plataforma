import { describe, it, expect } from "vitest";
import { telefoneNacional } from "@/lib/telefone";

describe("telefoneNacional", () => {
  it("tira o código do país — o Asaas recusa o 55 junto", () => {
    expect(telefoneNacional("+5562999998888")).toBe("62999998888");
  });

  it("funciona com número internacional", () => {
    expect(telefoneNacional("+14155552671")).toBe("4155552671");
  });

  it("cai para só os dígitos quando não reconhece o formato", () => {
    expect(telefoneNacional("(62) 99999-8888")).toBe("62999998888");
  });

  it("devolve undefined para vazio, nulo e indefinido", () => {
    expect(telefoneNacional("")).toBeUndefined();
    expect(telefoneNacional(null)).toBeUndefined();
    expect(telefoneNacional(undefined)).toBeUndefined();
  });

  it("devolve undefined quando não sobra nenhum dígito", () => {
    expect(telefoneNacional("sem numero")).toBeUndefined();
  });
});
