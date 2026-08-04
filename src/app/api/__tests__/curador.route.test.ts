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

const decidirResgate = vi.fn();
vi.mock("@/lib/voucher.server", async (real) => ({
  ...(await real<typeof import("@/lib/voucher.server")>()),
  decidirResgate: (...a: unknown[]) => decidirResgate(...a),
}));

const sendSolicitacaoVouchersEmail = vi.fn();
vi.mock("@/services/email.service", () => ({
  sendSolicitacaoVouchersEmail: (...a: unknown[]) => sendSolicitacaoVouchersEmail(...a),
}));

const { GET: PAINEL } = await import("@/app/api/curador/painel/route");
const { PATCH: DECIDIR } = await import("@/app/api/curador/resgates/[id]/route");
const { POST: SOLICITAR } = await import("@/app/api/curador/solicitar-vouchers/route");

const SESSAO = sessaoFalsa({ role: "curator", id: "cur-1", nome: "Ana", email: "ana@x.com" });

const VOUCHER = {
  id: "v1",
  codigo: "ACME2026",
  tipo: "gratuito",
  valor: null,
  usosMaximos: 5,
  usosFeitos: 1,
  empresaNome: "ACME",
  empresaCnpj: null,
  curadorId: "cur-1",
  ativo: true,
};

const RESGATE = {
  id: "r1",
  status: "pendente",
  criadoEm: new Date("2026-03-01T12:00:00.000Z"),
  voucher: { codigo: "ACME2026" },
  usuario: {
    nomeCompleto: "Bruno",
    email: "bruno@x.com",
    empresaNome: "ACME",
    cargo: "Analista",
  },
};

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  exigirCapacidade.mockReset().mockResolvedValue(SESSAO);
  decidirResgate.mockReset().mockResolvedValue({ ok: true });
  sendSolicitacaoVouchersEmail.mockReset().mockResolvedValue({ success: true });
  prisma.voucher.findMany.mockResolvedValue([]);
  prisma.voucherResgate.findMany.mockResolvedValue([]);
  prisma.usuario.findUnique.mockResolvedValue({ empresaNome: "ACME" });
});

describe("GET /api/curador/painel", () => {
  it("exige a capacidade do painel do curador", async () => {
    await PAINEL(requisicao("http://x/api/curador/painel"));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything(), "view:curator-dashboard");
  });

  it("recorta pelo curador da sessão — nunca por um id vindo da tela", async () => {
    await PAINEL(requisicao("http://x"));

    expect(prisma.voucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { curadorId: "cur-1" } }),
    );
    expect(prisma.voucherResgate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { voucher: { curadorId: "cur-1" } } }),
    );
  });

  it("achata o resgate no formato que a tela consome", async () => {
    prisma.voucher.findMany.mockResolvedValue([VOUCHER]);
    prisma.voucherResgate.findMany.mockResolvedValue([RESGATE]);

    const corpo = await (await PAINEL(requisicao("http://x"))).json();

    expect(corpo.vouchers[0]).toMatchObject({ codigo: "ACME2026" });
    expect(corpo.resgates[0]).toEqual({
      id: "r1",
      status: "pendente",
      criadoEm: "2026-03-01T12:00:00.000Z",
      voucherCodigo: "ACME2026",
      pessoaNome: "Bruno",
      pessoaEmail: "bruno@x.com",
      pessoaEmpresa: "ACME",
      pessoaCargo: "Analista",
    });
  });

  it("cai no e-mail quando a pessoa não tem nome cadastrado", async () => {
    prisma.voucherResgate.findMany.mockResolvedValue([
      { ...RESGATE, usuario: { ...RESGATE.usuario, nomeCompleto: null } },
    ]);

    const corpo = await (await PAINEL(requisicao("http://x"))).json();

    expect(corpo.resgates[0].pessoaNome).toBe("bruno@x.com");
  });
});

describe("PATCH /api/curador/resgates/[id]", () => {
  const decidir = (json: unknown, id = "r1") =>
    DECIDIR(requisicao("http://x", { method: "PATCH", json }), { params: { id } });

  it("recusa decisão fora de aprovado/negado", async () => {
    for (const status of ["pendente", "", 42, undefined]) {
      const res = await decidir({ status });
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({ error: "Decisão inválida." });
    }
    expect(decidirResgate).not.toHaveBeenCalled();
  });

  it("repassa o curador da sessão para a checagem de posse", async () => {
    const res = await decidir({ status: "aprovado" });

    expect(res.status).toBe(200);
    expect(decidirResgate).toHaveBeenCalledWith("cur-1", "r1", "aprovado");
  });

  it("transforma a recusa da regra em 400 com a mensagem dela", async () => {
    decidirResgate.mockResolvedValue({ ok: false, erro: "Resgate não encontrado." });

    const res = await decidir({ status: "negado" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Resgate não encontrado." });
  });

  it("aguenta corpo que não é JSON", async () => {
    const res = await DECIDIR(
      new Request("http://x", { method: "PATCH", body: "não é json" }),
      { params: { id: "r1" } },
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /api/curador/solicitar-vouchers", () => {
  const PEDIDO = { quantidade: 10, motivo: "Vamos convidar o time de sustentabilidade." };
  const pedir = (json: unknown) => SOLICITAR(requisicao("http://x", { json }));

  it("recusa quantidade que não é inteiro positivo", async () => {
    for (const quantidade of [0, -1, 2.5, "dez", undefined]) {
      expect((await pedir({ ...PEDIDO, quantidade })).status).toBe(400);
    }
  });

  it("manda pedidos grandes para o comercial em vez de aceitar", async () => {
    const res = await pedir({ ...PEDIDO, quantidade: 1001 });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("time comercial"),
    });
  });

  it("exige uma justificativa com algum detalhe", async () => {
    const res = await pedir({ ...PEDIDO, motivo: "poucos" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("mais de detalhe"),
    });
  });

  it("recusa justificativa longa demais", async () => {
    const res = await pedir({ ...PEDIDO, motivo: "a".repeat(2001) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("2000 caracteres"),
    });
  });

  it("identifica quem pede pela sessão e pelo banco, não pelo corpo", async () => {
    const res = await pedir({ ...PEDIDO, nome: "Impostor", email: "falso@x.com" });

    expect(res.status).toBe(200);
    expect(sendSolicitacaoVouchersEmail).toHaveBeenCalledWith({
      nome: "Ana",
      email: "ana@x.com",
      empresa: "ACME",
      quantidade: 10,
      motivo: PEDIDO.motivo,
    });
  });

  it("responde 400 quando o e-mail não sai — o pedido não se perdeu em silêncio", async () => {
    sendSolicitacaoVouchersEmail.mockResolvedValue({ success: false });

    const res = await pedir(PEDIDO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Tente novamente"),
    });
  });

  it("aguenta perfil sem empresa cadastrada", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await pedir(PEDIDO);

    expect(res.status).toBe(200);
    expect(sendSolicitacaoVouchersEmail).toHaveBeenCalledWith(
      expect.objectContaining({ empresa: null }),
    );
  });

  it("aguenta corpo que não é JSON", async () => {
    const res = await SOLICITAR(new Request("http://x", { method: "POST", body: "x" }));
    expect(res.status).toBe(400);
  });
});
