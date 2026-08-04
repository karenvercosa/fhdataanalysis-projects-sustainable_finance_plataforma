import { describe, it, expect } from "vitest";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { validarSenha } from "@/lib/politica-senha";

describe("gerarSenhaProvisoria", () => {
  it("respeita o tamanho pedido", () => {
    expect(gerarSenhaProvisoria()).toHaveLength(12);
    expect(gerarSenhaProvisoria(20)).toHaveLength(20);
  });

  it("nunca fica abaixo do mínimo de 8, mesmo pedindo menos", () => {
    expect(gerarSenhaProvisoria(4)).toHaveLength(8);
  });

  it("sempre passa na própria política de senha da plataforma", () => {
    for (let i = 0; i < 50; i++) {
      expect(validarSenha(gerarSenhaProvisoria())).toBeNull();
    }
  });

  it("não usa caracteres ambíguos (0, 1, l, I, O)", () => {
    for (let i = 0; i < 50; i++) {
      expect(gerarSenhaProvisoria(30)).not.toMatch(/[01lIO]/);
    }
  });

  it("não repete a senha entre chamadas", () => {
    const geradas = new Set(Array.from({ length: 30 }, () => gerarSenhaProvisoria()));
    expect(geradas.size).toBe(30);
  });

  it("não deixa a posição das classes fixa — o embaralhamento acontece", () => {
    const primeiros = new Set(Array.from({ length: 60 }, () => gerarSenhaProvisoria()[0]));
    expect(primeiros.size).toBeGreaterThan(1);
  });
});
