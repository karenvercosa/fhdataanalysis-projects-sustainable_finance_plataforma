import { describe, it, expect } from "vitest";
import {
  EMAIL_REGEX,
  texto,
  lerDadosCorporativos,
  validarDadosCorporativos,
} from "@/lib/cadastro";

const CELULAR_VALIDO = "+5562999998888";

describe("EMAIL_REGEX", () => {
  it("aceita endereços comuns", () => {
    for (const email of ["a@b.com", "nome.sobrenome@empresa.com.br", "x+tag@y-z.io"]) {
      expect(EMAIL_REGEX.test(email)).toBe(true);
    }
  });

  it("recusa endereço sem @ ou sem domínio", () => {
    for (const email of ["semarroba", "sem@", "@semlocal", "a b@c.com", ""]) {
      expect(EMAIL_REGEX.test(email)).toBe(false);
    }
  });
});

describe("texto", () => {
  it("apara os espaços das pontas", () => {
    expect(texto("  oi  ")).toBe("oi");
  });

  it("qualquer coisa que não seja string vira vazio", () => {
    for (const valor of [null, undefined, 42, {}, [], true]) {
      expect(texto(valor)).toBe("");
    }
  });
});

describe("lerDadosCorporativos", () => {
  it("extrai os quatro campos já normalizados", () => {
    expect(
      lerDadosCorporativos({ phone: " +55 ", empresa: "ACME ", cargo: " CTO", voucher: "V1 " }),
    ).toEqual({ phone: "+55", empresa: "ACME", cargo: "CTO", voucher: "V1" });
  });

  it("corpo ausente vira quatro strings vazias", () => {
    expect(lerDadosCorporativos(undefined)).toEqual({
      phone: "",
      empresa: "",
      cargo: "",
      voucher: "",
    });
  });

  it("ignora campos com tipo inesperado em vez de coagir", () => {
    expect(lerDadosCorporativos({ phone: { a: 1 }, empresa: 10 })).toMatchObject({
      phone: "",
      empresa: "",
    });
  });
});

describe("validarDadosCorporativos", () => {
  const base = { phone: CELULAR_VALIDO, empresa: "ACME", cargo: "CTO", voucher: "" };

  it("aceita o vínculo completo", () => {
    expect(validarDadosCorporativos(base)).toBeNull();
  });

  it("o voucher é o único campo opcional", () => {
    expect(validarDadosCorporativos({ ...base, voucher: "" })).toBeNull();
  });

  it("recusa celular inválido", () => {
    expect(validarDadosCorporativos({ ...base, phone: "123" })).toMatch(/celular/i);
    expect(validarDadosCorporativos({ ...base, phone: "" })).toMatch(/celular/i);
  });

  it("recusa empresa ou cargo em branco", () => {
    expect(validarDadosCorporativos({ ...base, empresa: "" })).toMatch(/obrigatórios/i);
    expect(validarDadosCorporativos({ ...base, cargo: "" })).toMatch(/obrigatórios/i);
  });
});
