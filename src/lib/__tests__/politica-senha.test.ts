import { describe, it, expect } from "vitest";
import { TAMANHO_MINIMO_SENHA, validarSenha } from "@/lib/politica-senha";

describe("política de senha", () => {
  it("recusa senha curta antes de olhar a composição", () => {
    expect(validarSenha("Ab1!")).toBe(
      `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
    );
  });

  it("aceita senha que cumpre todas as classes", () => {
    expect(validarSenha("SenhaBoa#2026")).toBeNull();
  });

  it.each([
    ["SENHABOA#2026", "uma letra minúscula"],
    ["senhaboa#2026", "uma letra maiúscula"],
    ["SenhaBoa#abc", "um número"],
    ["SenhaBoa2026", "um caractere especial"],
  ])("aponta o que falta em %s", (senha, faltando) => {
    expect(validarSenha(senha)).toBe(`A senha precisa conter ${faltando}.`);
  });

  it("lista várias faltas de uma vez, em português", () => {
    expect(validarSenha("senhaboaa")).toBe(
      "A senha precisa conter uma letra maiúscula, um número e um caractere especial.",
    );
  });

  it("trata letra acentuada como letra, e não como caractere especial", () => {
    // Sem isso `SENHAÇÃO123` passaria: o `Ç` seria contado como símbolo.
    expect(validarSenha("SENHACAO123")).toBe(
      "A senha precisa conter uma letra minúscula e um caractere especial.",
    );
    expect(validarSenha("SENHAÇÃO123")).toBe(
      "A senha precisa conter uma letra minúscula e um caractere especial.",
    );
  });

  it("aceita senha com acento quando há símbolo de verdade", () => {
    expect(validarSenha("Coração#2026")).toBeNull();
  });
});
