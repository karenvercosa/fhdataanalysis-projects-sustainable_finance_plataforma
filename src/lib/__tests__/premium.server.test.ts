import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { PerfilUsuario } from "@/types";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const { promoverPorPagamento, confirmarPagamento } = await import("@/lib/premium.server");

beforeEach(() => limparPrismaFalso(prisma));

describe("promoverPorPagamento", () => {
  it("promove quem ainda não tem perfil nenhum", async () => {
    prisma.usuarioPerfil.findMany.mockResolvedValue([]);

    await promoverPorPagamento("u1");

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.usuarioPerfil.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", perfil: PerfilUsuario.gratuito },
    });
    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { usuarioId: "u1", perfil: PerfilUsuario.participante } }),
    );
  });

  it("promove quem está apenas no Plano Gratuito", async () => {
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.gratuito }]);

    await promoverPorPagamento("u1");

    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalled();
  });

  it("não rebaixa quem já tem perfil concedido pela organização", async () => {
    for (const perfil of [
      PerfilUsuario.palestrante,
      PerfilUsuario.curador,
      PerfilUsuario.admin,
      PerfilUsuario.participante,
    ]) {
      limparPrismaFalso(prisma);
      prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil }]);

      await promoverPorPagamento("u1");

      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  });

  it("é idempotente — chamar duas vezes não muda o efeito", async () => {
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.gratuito }]);

    await promoverPorPagamento("u1");
    await promoverPorPagamento("u1");

    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.usuarioPerfil.upsert.mock.calls[0][0]).toEqual(
      prisma.usuarioPerfil.upsert.mock.calls[1][0],
    );
  });
});

describe("confirmarPagamento", () => {
  it("cobrança desconhecida devolve false — é de outra aplicação da mesma conta", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue(null);

    await expect(confirmarPagamento("pay_alheio")).resolves.toBe(false);
    expect(prisma.assinaturaPlataforma.update).not.toHaveBeenCalled();
  });

  it("marca a assinatura como ativa e promove quem pagou", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({
      id: "a1",
      usuarioId: "u1",
      status: "pendente",
    });
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.gratuito }]);

    await expect(confirmarPagamento("pay_1")).resolves.toBe(true);

    expect(prisma.assinaturaPlataforma.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "ativa" },
    });
    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalled();
  });

  it("assinatura já ativa não é gravada de novo, mas a promoção é reconferida", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({
      id: "a1",
      usuarioId: "u1",
      status: "ativa",
    });
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.participante }]);

    await expect(confirmarPagamento("pay_1")).resolves.toBe(true);

    expect(prisma.assinaturaPlataforma.update).not.toHaveBeenCalled();
    expect(prisma.usuarioPerfil.findMany).toHaveBeenCalled();
  });

  it("busca a cobrança pelo id do Asaas", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue(null);

    await confirmarPagamento("pay_123");

    expect(prisma.assinaturaPlataforma.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { asaasPaymentId: "pay_123" } }),
    );
  });
});
