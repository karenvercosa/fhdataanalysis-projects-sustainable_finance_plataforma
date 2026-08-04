import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { sessaoFalsa, requisicao } from "@/test/sessao";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const exigirCapacidade = vi.fn();
vi.mock("@/lib/rbac.server", async (real) => ({
  ...(await real<typeof import("@/lib/rbac.server")>()),
  exigirCapacidade: (...a: unknown[]) => exigirCapacidade(...a),
}));

const { GET, POST } = await import("@/app/api/admin/vouchers/route");
const { PATCH, DELETE } = await import("@/app/api/admin/vouchers/[id]/route");

const REGISTRO = {
  id: "v1",
  codigo: "VERDE2026",
  tipo: "gratuito",
  valor: null,
  usosMaximos: 10,
  usosFeitos: 2,
  empresaNome: "ACME",
  empresaCnpj: null,
  curadorId: null,
  ativo: true,
};

const FORMULARIO = {
  codigo: " verde2026 ",
  tipo: "gratuito",
  empresaNome: "ACME",
  usosMaximos: 10,
};

const ctx = (id: string) => ({ params: { id } });

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa({ role: "admin" }));
});

describe("GET /api/admin/vouchers", () => {
  it("exige a capacidade de gestão da plataforma", async () => {
    prisma.voucher.findMany.mockResolvedValue([]);
    await GET(requisicao("http://x/api/admin/vouchers"));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything(), "manage:platform");
  });

  it("devolve os vouchers no formato das telas", async () => {
    prisma.voucher.findMany.mockResolvedValue([REGISTRO]);

    const { vouchers } = await (await GET(requisicao("http://x"))).json();

    expect(vouchers[0]).toMatchObject({ codigo: "VERDE2026", valor: null, usosFeitos: 2 });
  });
});

describe("POST /api/admin/vouchers", () => {
  const criar = (json: unknown) => POST(requisicao("http://x", { json }));

  it("recusa formulário inválido", async () => {
    expect((await criar({ ...FORMULARIO, codigo: "" })).status).toBe(400);
    expect((await criar({ ...FORMULARIO, tipo: "inventado" })).status).toBe(400);
    expect((await criar({ ...FORMULARIO, empresaNome: "" })).status).toBe(400);
    expect((await criar({ ...FORMULARIO, usosMaximos: 0 })).status).toBe(400);
  });

  it("recusa código já cadastrado", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ id: "outro" });

    const res = await criar(FORMULARIO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Já existe um voucher"),
    });
    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  it("grava o código normalizado em maiúsculas", async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);
    prisma.voucher.create.mockResolvedValue(REGISTRO);

    const res = await criar(FORMULARIO);

    expect(res.status).toBe(200);
    expect(prisma.voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: "VERDE2026" }) }),
    );
  });
});

describe("PATCH /api/admin/vouchers/[id]", () => {
  const editar = (json: unknown, id = "v1") =>
    PATCH(requisicao("http://x", { method: "PATCH", json }), ctx(id));

  it("recusa voucher inexistente", async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);

    const res = await editar(FORMULARIO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Voucher não encontrado." });
  });

  it("não deixa o limite cair abaixo do que já foi resgatado", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ usosFeitos: 5 });

    const res = await editar({ ...FORMULARIO, usosMaximos: 3 });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("5 resgate(s)"),
    });
  });

  it("recusa código que já é de outro voucher", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ usosFeitos: 0 });
    prisma.voucher.findFirst.mockResolvedValue({ id: "v2" });

    const res = await editar(FORMULARIO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Já existe um voucher"),
    });
  });

  it("atualiza quando está tudo certo", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ usosFeitos: 0 });
    prisma.voucher.findFirst.mockResolvedValue(null);
    prisma.voucher.update.mockResolvedValue(REGISTRO);

    const res = await editar(FORMULARIO);

    expect(res.status).toBe(200);
    expect(prisma.voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "v1" } }),
    );
  });
});

describe("DELETE /api/admin/vouchers/[id]", () => {
  const excluir = (id: string) =>
    DELETE(requisicao("http://x", { method: "DELETE" }), ctx(id));

  it("recusa id que não existe", async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);

    const res = await excluir("v9");

    expect(res.status).toBe(400);
    expect(prisma.voucher.delete).not.toHaveBeenCalled();
  });

  it("exclui e responde ok", async () => {
    prisma.voucher.findUnique.mockResolvedValue({ id: "v9" });

    const res = await excluir("v9");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(prisma.voucher.delete).toHaveBeenCalledWith({ where: { id: "v9" } });
  });
});
