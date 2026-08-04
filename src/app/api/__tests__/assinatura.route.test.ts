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

const asaas = {
  createCustomer: vi.fn(),
  createPayment: vi.fn(),
  createSubscription: vi.fn(),
  getFirstSubscriptionPayment: vi.fn(),
  getPixQrCode: vi.fn(),
  getBoletoInfo: vi.fn(),
  getPaymentStatus: vi.fn(),
  payWithCreditCard: vi.fn(),
  isPago: vi.fn(),
};
vi.mock("@/services/asaas.service", async (real) => ({
  ...(await real<typeof import("@/services/asaas.service")>()),
  ...Object.fromEntries(Object.entries(asaas).map(([k, fn]) => [k, (...a: unknown[]) => fn(...a)])),
}));

const confirmarPagamento = vi.fn();
vi.mock("@/lib/premium.server", () => ({
  confirmarPagamento: (...a: unknown[]) => confirmarPagamento(...a),
  promoverPorPagamento: vi.fn(),
}));

const { GET: GET_DADOS } = await import("@/app/api/assinatura/dados/route");
const { POST: INICIAR } = await import("@/app/api/assinatura/iniciar/route");
const { GET: STATUS } = await import("@/app/api/assinatura/status/route");
const { POST: PAGAR } = await import("@/app/api/assinatura/pagar-cartao/route");

const CADASTRO = {
  id: "u1", nomeCompleto: "Maria", email: "m@x.com", telefone: "+5562999998888",
  empresaNome: "FH", cargo: "QA", asaasCustomerId: null,
};
const CORPO = {
  produto: "online", billingType: "PIX",
  phone: "+5562999998888", empresa: "FH", cargo: "QA", cpf: "123.456.789-09",
};

beforeEach(() => {
  limparPrismaFalso(prisma);
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa({ id: "u1" }));
  Object.values(asaas).forEach((f) => f.mockReset());
  confirmarPagamento.mockReset().mockResolvedValue(true);

  prisma.usuario.findUniqueOrThrow.mockResolvedValue(CADASTRO);
  asaas.createCustomer.mockResolvedValue("cus_1");
  asaas.createSubscription.mockResolvedValue({ id: "sub_1" });
  asaas.getFirstSubscriptionPayment.mockResolvedValue({ id: "pay_1" });
  asaas.createPayment.mockResolvedValue({ id: "pay_2" });
  asaas.getPixQrCode.mockResolvedValue({ encodedImage: "img", payload: "000201" });
  asaas.getBoletoInfo.mockResolvedValue({ bankSlipUrl: "http://b", identificationField: "1234" });
  prisma.assinaturaPlataforma.create.mockResolvedValue({ id: "a1" });
});

describe("GET /api/assinatura/dados", () => {
  it("devolve o cadastro para o formulário chegar preenchido", async () => {
    const { dados } = await (await GET_DADOS(requisicao("http://x"))).json();
    expect(dados).toMatchObject({ nome: "Maria", empresa: "FH", cargo: "QA" });
  });

  it("pede CPF só quando ainda não existe cliente no Asaas", async () => {
    let r = await (await GET_DADOS(requisicao("http://x"))).json();
    expect(r.dados.precisaCpf).toBe(true);

    prisma.usuario.findUniqueOrThrow.mockResolvedValue({ ...CADASTRO, asaasCustomerId: "cus_9" });
    r = await (await GET_DADOS(requisicao("http://x"))).json();
    expect(r.dados.precisaCpf).toBe(false);
  });

  it("marca quem já é premium — não faz sentido cobrar de novo", async () => {
    exigirCapacidade.mockResolvedValue(sessaoFalsa({ id: "u1", role: "attendee" }));
    const { dados } = await (await GET_DADOS(requisicao("http://x"))).json();
    expect(dados.jaEhPremium).toBe(true);
  });
});

describe("POST /api/assinatura/iniciar", () => {
  it("assinatura online cobra R$ 1.000 por ano, de forma recorrente", async () => {
    await INICIAR(requisicao("http://x", { json: CORPO }));

    expect(asaas.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ value: 1000, cycle: "YEARLY" }),
    );
    expect(asaas.createPayment).not.toHaveBeenCalled();
  });

  it("ingresso presencial cobra R$ 3.000 uma única vez", async () => {
    await INICIAR(requisicao("http://x", { json: { ...CORPO, produto: "presencial" } }));

    expect(asaas.createPayment).toHaveBeenCalledWith(expect.objectContaining({ value: 3000 }));
    expect(asaas.createSubscription).not.toHaveBeenCalled();
  });

  it.each([
    ["produto", { produto: "inventado" }],
    ["método", { billingType: "CRIPTO" }],
    ["celular", { phone: "123" }],
    ["CPF", { cpf: "111" }],
  ])("recusa %s inválido", async (_rotulo, over) => {
    const res = await INICIAR(requisicao("http://x", { json: { ...CORPO, ...over } }));
    expect(res.status).toBe(400);
  });

  it("campo em branco cai no valor do cadastro, não em erro", async () => {
    // A tela envia só o que a pessoa completou; empresa e cargo já estão no
    // banco e não precisam ser redigitados.
    const res = await INICIAR(requisicao("http://x", { json: { ...CORPO, empresa: "", cargo: "" } }));
    expect(res.status).toBe(200);
  });

  it("recusa quando o campo falta nos DOIS lados — corpo e cadastro", async () => {
    prisma.usuario.findUniqueOrThrow.mockResolvedValue({
      ...CADASTRO, empresaNome: null, cargo: null,
    });
    const res = await INICIAR(requisicao("http://x", { json: { ...CORPO, empresa: "", cargo: "" } }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("empresa"),
    });
  });

  it("dispensa o CPF quando o cliente do Asaas já existe", async () => {
    prisma.usuario.findUniqueOrThrow.mockResolvedValue({ ...CADASTRO, asaasCustomerId: "cus_9" });
    const res = await INICIAR(requisicao("http://x", { json: { ...CORPO, cpf: "" } }));
    expect(res.status).toBe(200);
    expect(asaas.createCustomer).not.toHaveBeenCalled();
  });

  it("guarda o CPF MASCARADO — só os 3 primeiros dígitos", async () => {
    await INICIAR(requisicao("http://x", { json: CORPO }));
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cpf: "123.***.***-**" }) }),
    );
  });

  it("devolve o PIX quando o método é PIX", async () => {
    const r = await (await INICIAR(requisicao("http://x", { json: CORPO }))).json();
    expect(r).toMatchObject({ paymentId: "pay_1", pix: { payload: "000201" } });
  });

  it("devolve o boleto quando o método é BOLETO", async () => {
    const r = await (await INICIAR(requisicao("http://x", { json: { ...CORPO, billingType: "BOLETO" } }))).json();
    expect(r.boleto).toMatchObject({ bankSlipUrl: "http://b" });
  });

  it("não devolve pix nem boleto no cartão — os dados vêm na etapa seguinte", async () => {
    const r = await (await INICIAR(requisicao("http://x", { json: { ...CORPO, billingType: "CREDIT_CARD" } }))).json();
    expect(r.pix).toBeUndefined();
    expect(r.boleto).toBeUndefined();
  });

  it("registra a cobrança como pendente", async () => {
    await INICIAR(requisicao("http://x", { json: CORPO }));
    expect(prisma.assinaturaPlataforma.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "pendente", valor: 1000 }) }),
    );
  });
});

describe("GET /api/assinatura/status", () => {
  it("recusa cobrança que não é da pessoa logada", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue(null);
    const res = await STATUS(requisicao("http://x/api/assinatura/status?paymentId=pay_alheio"));
    expect(res.status).toBe(400);
    expect(asaas.getPaymentStatus).not.toHaveBeenCalled();
  });

  it("exige o paymentId", async () => {
    const res = await STATUS(requisicao("http://x/api/assinatura/status"));
    expect(res.status).toBe(400);
  });

  it("confirma o pagamento quando o Asaas diz que foi pago", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({ id: "a1" });
    asaas.getPaymentStatus.mockResolvedValue("RECEIVED_IN_CASH");
    asaas.isPago.mockReturnValue(true);

    const r = await (await STATUS(requisicao("http://x/api/assinatura/status?paymentId=pay_1"))).json();

    expect(r).toEqual({ status: "RECEIVED_IN_CASH", pago: true });
    expect(confirmarPagamento).toHaveBeenCalledWith("pay_1");
  });

  it("não promove ninguém enquanto está pendente", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({ id: "a1" });
    asaas.getPaymentStatus.mockResolvedValue("PENDING");
    asaas.isPago.mockReturnValue(false);

    await STATUS(requisicao("http://x/api/assinatura/status?paymentId=pay_1"));

    expect(confirmarPagamento).not.toHaveBeenCalled();
  });
});

describe("POST /api/assinatura/pagar-cartao", () => {
  const CARTAO = {
    paymentId: "pay_1",
    card: { holderName: "T", number: "5162306219378829", expiryMonth: "05", expiryYear: "2028", ccv: "318" },
    titular: { name: "T", cpfCnpj: "12345678909", postalCode: "74810-100", addressNumber: "1", phone: "+5562999998888" },
  };

  it("recusa cobrança de outra pessoa antes de falar com o Asaas", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue(null);
    const res = await PAGAR(requisicao("http://x", { json: CARTAO }));
    expect(res.status).toBe(400);
    expect(asaas.payWithCreditCard).not.toHaveBeenCalled();
  });

  it("recusa dados de cartão incompletos", async () => {
    const res = await PAGAR(requisicao("http://x", { json: { paymentId: "pay_1", card: {} } }));
    expect(res.status).toBe(400);
  });

  it("manda o telefone em formato nacional — o Asaas recusa com o 55", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({ id: "a1" });
    asaas.payWithCreditCard.mockResolvedValue({ status: "CONFIRMED" });
    asaas.isPago.mockReturnValue(true);

    await PAGAR(requisicao("http://x", { json: CARTAO }));

    expect(asaas.payWithCreditCard).toHaveBeenCalledWith(
      expect.objectContaining({ titular: expect.objectContaining({ phone: "62999998888" }) }),
    );
  });

  it("confirma e promove quando o cartão é aprovado", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({ id: "a1" });
    asaas.payWithCreditCard.mockResolvedValue({ status: "CONFIRMED" });
    asaas.isPago.mockReturnValue(true);

    const r = await (await PAGAR(requisicao("http://x", { json: CARTAO }))).json();

    expect(r).toEqual({ status: "CONFIRMED", pago: true });
    expect(confirmarPagamento).toHaveBeenCalledWith("pay_1");
  });

  it("não promove quando o cartão é recusado", async () => {
    prisma.assinaturaPlataforma.findFirst.mockResolvedValue({ id: "a1" });
    asaas.payWithCreditCard.mockResolvedValue({ status: "DECLINED" });
    asaas.isPago.mockReturnValue(false);

    await PAGAR(requisicao("http://x", { json: CARTAO }));

    expect(confirmarPagamento).not.toHaveBeenCalled();
  });
});
