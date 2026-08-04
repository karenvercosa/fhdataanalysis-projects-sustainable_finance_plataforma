import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rotaAdmin, ErroDeEntrada } from "@/lib/admin.server";
import { ErroAutorizacao } from "@/lib/rbac.server";
import { ErroAsaas } from "@/services/asaas.service";

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("rotaAdmin", () => {
  it("embrulha o retorno do handler em JSON 200", async () => {
    const res = await rotaAdmin("x", async () => ({ itens: [1] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ itens: [1] });
  });

  it.each([401, 403] as const)("repassa o status %i do ErroAutorizacao", async (status) => {
    const res = await rotaAdmin("x", async () => {
      throw new ErroAutorizacao(status, "sem permissão");
    });

    expect(res.status).toBe(status);
    await expect(res.json()).resolves.toEqual({ error: "sem permissão" });
  });

  it("dado inválido da tela vira 400, não 500", async () => {
    const res = await rotaAdmin("x", async () => {
      throw new ErroDeEntrada("Selo inválido.");
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Selo inválido." });
  });

  it("recusa do gateway também vira 400 — é dado do formulário", async () => {
    const res = await rotaAdmin("x", async () => {
      throw new ErroAsaas("Cartão recusado.");
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Cartão recusado." });
  });

  it("erro inesperado vira 500 e é registrado com o contexto", async () => {
    const res = await rotaAdmin("admin/usuarios", async () => {
      throw new Error("banco caiu");
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "banco caiu" });
    expect(console.error).toHaveBeenCalledWith("[admin/usuarios]", expect.any(Error));
  });

  it("erro sem mensagem ganha um texto genérico", async () => {
    const res = await rotaAdmin("x", async () => {
      throw new Error("");
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Não foi possível concluir a operação.",
    });
  });

  it("valor lançado que nem é Error não derruba a rota", async () => {
    const res = await rotaAdmin("x", async () => {
      throw "string solta";
    });

    expect(res.status).toBe(500);
  });
});

describe("ErroDeEntrada", () => {
  it("carrega o nome próprio, para o `instanceof` do handler não ser a única pista", () => {
    const erro = new ErroDeEntrada("ops");
    expect(erro).toBeInstanceOf(Error);
    expect(erro.name).toBe("ErroDeEntrada");
    expect(erro.message).toBe("ops");
  });
});
