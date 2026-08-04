import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { PerfilUsuario, TipoVoucher } from "@/types";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const {
  voucherParaJson,
  normalizarCodigo,
  lerFormularioVoucher,
  voucherUtilizavel,
  resgatarVoucher,
  decidirResgate,
  SELECAO_VOUCHER,
} = await import("@/lib/voucher.server");

const FORMULARIO_OK = {
  codigo: " verde2026 ",
  tipo: TipoVoucher.gratuito,
  empresaNome: "ACME",
  usosMaximos: 10,
};

beforeEach(() => limparPrismaFalso(prisma));

describe("SELECAO_VOUCHER", () => {
  it("cobre os campos que a tela do Admin mostra", () => {
    expect(Object.keys(SELECAO_VOUCHER)).toEqual(
      expect.arrayContaining(["id", "codigo", "tipo", "valor", "usosMaximos", "usosFeitos"]),
    );
  });
});

describe("normalizarCodigo", () => {
  it("apara e sobe para maiúsculas — a busca no banco é exata", () => {
    expect(normalizarCodigo("  verde2026 ")).toBe("VERDE2026");
  });

  it("código vazio continua vazio", () => {
    expect(normalizarCodigo("   ")).toBe("");
  });
});

describe("voucherParaJson", () => {
  const base = {
    id: "v1",
    codigo: "VERDE",
    tipo: TipoVoucher.descontoValor,
    usosMaximos: 10,
    usosFeitos: 2,
    empresaNome: "ACME",
    empresaCnpj: null,
    curadorId: null,
    ativo: true,
  };

  it("converte o Decimal do Prisma em número — Decimal não atravessa JSON", () => {
    const decimal = { toString: () => "150.5", valueOf: () => 150.5 } as never;
    expect(voucherParaJson({ ...base, valor: decimal }).valor).toBe(150.5);
  });

  it("valor ausente continua null em vez de virar 0", () => {
    expect(voucherParaJson({ ...base, valor: null }).valor).toBeNull();
  });

  it("repassa os demais campos sem alterar", () => {
    expect(voucherParaJson({ ...base, valor: null })).toMatchObject(base);
  });
});

describe("lerFormularioVoucher", () => {
  it("normaliza o código para maiúsculas", () => {
    expect(lerFormularioVoucher(FORMULARIO_OK).codigo).toBe("VERDE2026");
  });

  it("recusa código vazio", () => {
    expect(() => lerFormularioVoucher({ ...FORMULARIO_OK, codigo: "  " })).toThrow(/código/i);
  });

  it("recusa código com mais de 60 caracteres", () => {
    expect(() => lerFormularioVoucher({ ...FORMULARIO_OK, codigo: "A".repeat(61) })).toThrow(
      /60 caracteres/,
    );
  });

  it("recusa tipo desconhecido", () => {
    expect(() => lerFormularioVoucher({ ...FORMULARIO_OK, tipo: "brinde" })).toThrow(
      /Tipo de voucher inválido/,
    );
  });

  it("recusa voucher sem empresa dona", () => {
    expect(() => lerFormularioVoucher({ ...FORMULARIO_OK, empresaNome: "" })).toThrow(/empresa/i);
  });

  it("recusa usos máximos que não sejam inteiro positivo", () => {
    for (const usosMaximos of [0, -1, 1.5, "x", undefined]) {
      expect(() => lerFormularioVoucher({ ...FORMULARIO_OK, usosMaximos })).toThrow(
        /usos máximos/i,
      );
    }
  });

  it("o voucher gratuito não guarda valor", () => {
    expect(lerFormularioVoucher({ ...FORMULARIO_OK, valor: 99 }).valor).toBeNull();
  });

  it("desconto exige um valor positivo", () => {
    for (const valor of [0, -5, "abc", undefined]) {
      expect(() =>
        lerFormularioVoucher({ ...FORMULARIO_OK, tipo: TipoVoucher.descontoValor, valor }),
      ).toThrow(/valor do desconto/i);
    }
  });

  it("desconto em reais aceita o valor informado", () => {
    expect(
      lerFormularioVoucher({ ...FORMULARIO_OK, tipo: TipoVoucher.descontoValor, valor: 250 }).valor,
    ).toBe(250);
  });

  it("desconto percentual não passa de 100%", () => {
    expect(() =>
      lerFormularioVoucher({
        ...FORMULARIO_OK,
        tipo: TipoVoucher.descontoPercentual,
        valor: 101,
      }),
    ).toThrow(/100%/);

    expect(
      lerFormularioVoucher({
        ...FORMULARIO_OK,
        tipo: TipoVoucher.descontoPercentual,
        valor: 100,
      }).valor,
    ).toBe(100);
  });

  it("CNPJ é opcional, mas pela metade não serve", () => {
    expect(lerFormularioVoucher(FORMULARIO_OK).empresaCnpj).toBeNull();
    expect(() => lerFormularioVoucher({ ...FORMULARIO_OK, empresaCnpj: "123" })).toThrow(
      /14 posições/,
    );
  });

  it("CNPJ completo é gravado já formatado", () => {
    expect(
      lerFormularioVoucher({ ...FORMULARIO_OK, empresaCnpj: "11222333000181" }).empresaCnpj,
    ).toBe("11.222.333/0001-81");
  });

  it("curador vazio vira voucher institucional", () => {
    expect(lerFormularioVoucher(FORMULARIO_OK).curadorId).toBeNull();
    expect(lerFormularioVoucher({ ...FORMULARIO_OK, curadorId: "c1" }).curadorId).toBe("c1");
  });

  it("ativo só cai com `false` explícito", () => {
    expect(lerFormularioVoucher(FORMULARIO_OK).ativo).toBe(true);
    expect(lerFormularioVoucher({ ...FORMULARIO_OK, ativo: false }).ativo).toBe(false);
  });
});

describe("voucherUtilizavel", () => {
  it("código vazio nem consulta o banco", async () => {
    await expect(voucherUtilizavel("  ")).resolves.toBe(false);
    expect(prisma.voucher.findUnique).not.toHaveBeenCalled();
  });

  it("código inexistente não serve", async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);
    await expect(voucherUtilizavel("X")).resolves.toBe(false);
  });

  it("voucher inativo não serve", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ ativo: false, usosMaximos: 10, usosFeitos: 0 });
    await expect(voucherUtilizavel("X")).resolves.toBe(false);
  });

  it("voucher esgotado não serve", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ ativo: true, usosMaximos: 5, usosFeitos: 5 });
    await expect(voucherUtilizavel("X")).resolves.toBe(false);
  });

  it("voucher ativo com cota sobrando serve", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ ativo: true, usosMaximos: 5, usosFeitos: 4 });
    await expect(voucherUtilizavel("verde")).resolves.toBe(true);
    expect(prisma.voucher.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { codigo: "VERDE" } }),
    );
  });
});

describe("resgatarVoucher", () => {
  it("código vazio nem abre transação", async () => {
    await expect(resgatarVoucher("u1", " ")).resolves.toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("código inexistente devolve null", async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);
    await expect(resgatarVoucher("u1", "X")).resolves.toBeNull();
  });

  it("voucher inativo devolve null", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ id: "v1", ativo: false, usosMaximos: 10 });
    await expect(resgatarVoucher("u1", "X")).resolves.toBeNull();
  });

  it("cota esgotada devolve null — quem recusa é o próprio banco", async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: "v1",
      empresaNome: "ACME",
      ativo: true,
      usosMaximos: 10,
      curadorId: null,
    });
    prisma.voucher.updateMany.mockResolvedValue({ count: 0 });

    await expect(resgatarVoucher("u1", "X")).resolves.toBeNull();
    expect(prisma.voucherResgate.upsert).not.toHaveBeenCalled();
  });

  it("voucher institucional é aprovado na hora e grava o vínculo", async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: "v1",
      empresaNome: "ACME",
      ativo: true,
      usosMaximos: 10,
      curadorId: null,
    });
    prisma.voucher.updateMany.mockResolvedValue({ count: 1 });

    await expect(resgatarVoucher("u1", "verde")).resolves.toEqual({
      empresaNome: "ACME",
      status: "aprovado",
    });

    expect(prisma.usuario.update.mock.calls[0][0].data).toMatchObject({
      voucher: "VERDE",
      voucherId: "v1",
      empresaNome: "ACME",
    });
    expect(prisma.voucherResgate.upsert.mock.calls[0][0].create.decididoEm).toBeInstanceOf(Date);
  });

  it("voucher de curador nasce pendente e ainda não vale o vínculo", async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: "v1",
      empresaNome: "ACME",
      ativo: true,
      usosMaximos: 10,
      curadorId: "c1",
    });
    prisma.voucher.updateMany.mockResolvedValue({ count: 1 });

    await expect(resgatarVoucher("u1", "verde")).resolves.toEqual({
      empresaNome: "ACME",
      status: "pendente",
    });

    const data = prisma.usuario.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ voucher: "VERDE" });
    expect(data).not.toHaveProperty("voucherId");
    expect(data).not.toHaveProperty("empresaNome");
    expect(prisma.voucherResgate.upsert.mock.calls[0][0].create.decididoEm).toBeNull();
  });

  it("o uso é reservado já no pedido, mesmo ficando pendente", async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      id: "v1",
      empresaNome: "ACME",
      ativo: true,
      usosMaximos: 10,
      curadorId: "c1",
    });
    prisma.voucher.updateMany.mockResolvedValue({ count: 1 });

    await resgatarVoucher("u1", "verde");

    expect(prisma.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: "v1", ativo: true, usosFeitos: { lt: 10 } },
      data: { usosFeitos: { increment: 1 } },
    });
  });
});

describe("decidirResgate", () => {
  function resgate(over: Record<string, unknown> = {}) {
    return {
      id: "r1",
      status: "pendente",
      usuarioId: "u1",
      voucher: { id: "v1", empresaNome: "ACME", usosMaximos: 10, usosFeitos: 3 },
      ...over,
    };
  }

  it("resgate de outro curador simplesmente não é encontrado", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(null);

    await expect(decidirResgate("c1", "r1", "aprovado")).resolves.toEqual({
      ok: false,
      erro: "Resgate não encontrado.",
    });

    expect(prisma.voucherResgate.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "r1",
      voucher: { curadorId: "c1" },
    });
  });

  it("repetir a mesma decisão não conta duas vezes na cota", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(resgate({ status: "aprovado" }));

    await expect(decidirResgate("c1", "r1", "aprovado")).resolves.toEqual({ ok: true });

    expect(prisma.voucher.update).not.toHaveBeenCalled();
    expect(prisma.voucherResgate.update).not.toHaveBeenCalled();
  });

  it("aprovar um pendente grava o vínculo sem reconsumir a cota", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(resgate());
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.gratuito }]);

    await expect(decidirResgate("c1", "r1", "aprovado")).resolves.toEqual({ ok: true });

    expect(prisma.voucher.update).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { voucherId: "v1", empresaNome: "ACME" },
    });
    expect(prisma.voucherResgate.update.mock.calls[0][0].data).toMatchObject({
      status: "aprovado",
    });
  });

  it("aprovar um negado volta a consumir a cota", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(resgate({ status: "negado" }));
    prisma.usuarioPerfil.findMany.mockResolvedValue([]);

    await expect(decidirResgate("c1", "r1", "aprovado")).resolves.toEqual({ ok: true });

    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { usosFeitos: { increment: 1 } },
    });
  });

  it("aprovar um negado é recusado quando não há convite sobrando", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(
      resgate({
        status: "negado",
        voucher: { id: "v1", empresaNome: "ACME", usosMaximos: 10, usosFeitos: 10 },
      }),
    );

    await expect(decidirResgate("c1", "r1", "aprovado")).resolves.toEqual({
      ok: false,
      erro: "O voucher não tem convites disponíveis.",
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it("a aprovação promove quem estava no Plano Gratuito", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(resgate());
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.gratuito }]);

    await decidirResgate("c1", "r1", "aprovado");

    expect(prisma.usuarioPerfil.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", perfil: PerfilUsuario.gratuito },
    });
    expect(prisma.usuarioPerfil.upsert.mock.calls[0][0].create.perfil).toBe(
      PerfilUsuario.participante,
    );
  });

  it("a aprovação não rebaixa quem já é palestrante", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(resgate());
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.palestrante }]);

    await decidirResgate("c1", "r1", "aprovado");

    expect(prisma.usuarioPerfil.upsert).not.toHaveBeenCalled();
  });

  it("negar devolve o convite à cota e desfaz o vínculo", async () => {
    prisma.voucherResgate.findFirst.mockResolvedValue(resgate({ status: "aprovado" }));
    prisma.voucherResgate.findFirst.mockResolvedValueOnce(resgate({ status: "aprovado" }));
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.participante }]);

    await expect(decidirResgate("c1", "r1", "negado")).resolves.toEqual({ ok: true });

    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { usosFeitos: { decrement: 1 } },
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { voucherId: null },
    });
  });

  it("negar rebaixa para o Plano Gratuito quando o Premium veio deste voucher", async () => {
    prisma.voucherResgate.findFirst
      .mockResolvedValueOnce(resgate({ status: "aprovado" }))
      .mockResolvedValueOnce(null); // nenhum outro resgate aprovado
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.participante }]);

    await decidirResgate("c1", "r1", "negado");

    expect(prisma.usuarioPerfil.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", perfil: PerfilUsuario.participante },
    });
    expect(prisma.usuarioPerfil.upsert.mock.calls[0][0].create.perfil).toBe(
      PerfilUsuario.gratuito,
    );
  });

  it("negar não rebaixa quem tem outro resgate aprovado", async () => {
    prisma.voucherResgate.findFirst
      .mockResolvedValueOnce(resgate({ status: "aprovado" }))
      .mockResolvedValueOnce({ id: "r2" });

    await decidirResgate("c1", "r1", "negado");

    expect(prisma.usuarioPerfil.deleteMany).not.toHaveBeenCalled();
  });

  it("negar não rebaixa quem tem perfil concedido pela organização", async () => {
    prisma.voucherResgate.findFirst
      .mockResolvedValueOnce(resgate({ status: "aprovado" }))
      .mockResolvedValueOnce(null);
    prisma.usuarioPerfil.findMany.mockResolvedValue([{ perfil: PerfilUsuario.curador }]);

    await decidirResgate("c1", "r1", "negado");

    expect(prisma.usuarioPerfil.deleteMany).not.toHaveBeenCalled();
  });

  it("a busca do outro resgate exclui o próprio, que ainda consta aprovado", async () => {
    prisma.voucherResgate.findFirst
      .mockResolvedValueOnce(resgate({ status: "aprovado" }))
      .mockResolvedValueOnce(null);
    prisma.usuarioPerfil.findMany.mockResolvedValue([]);

    await decidirResgate("c1", "r1", "negado");

    expect(prisma.voucherResgate.findFirst.mock.calls[1][0].where).toMatchObject({
      usuarioId: "u1",
      status: "aprovado",
      id: { not: "r1" },
    });
  });
});
