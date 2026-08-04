import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const AMBIENTE = { ASAAS_API_KEY: "chave-de-teste", ASAAS_API_URL: "https://sandbox.example/api/v3/" };

async function importarServico() {
  vi.resetModules();
  return import("@/services/asaas.service");
}

function respostaOk(corpo: unknown) {
  return { ok: true, json: async () => corpo } as Response;
}
function respostaErro(corpo: unknown) {
  return { ok: false, status: 400, json: async () => corpo } as Response;
}

describe("asaas.service", () => {
  beforeEach(() => Object.assign(process.env, AMBIENTE));
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_API_URL;
  });

  it("falha com mensagem clara quando falta configuração", async () => {
    delete process.env.ASAAS_API_KEY;
    const { getPaymentStatus } = await importarServico();
    await expect(getPaymentStatus("pay_1")).rejects.toThrow(/ASAAS_API_KEY/);
  });

  it("nunca cacheia — status de cobrança não pode vir de resposta velha", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ status: "RECEIVED" }));
    vi.stubGlobal("fetch", fetchMock);

    const { getPaymentStatus } = await importarServico();
    await getPaymentStatus("pay_1");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("remove as barras finais da URL base para não gerar //", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ status: "PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    const { getPaymentStatus } = await importarServico();
    await getPaymentStatus("pay_1");

    expect(fetchMock.mock.calls[0][0]).toBe("https://sandbox.example/api/v3/payments/pay_1");
  });

  it("envia a chave no cabeçalho access_token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ status: "PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    const { getPaymentStatus } = await importarServico();
    await getPaymentStatus("pay_1");

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      access_token: "chave-de-teste",
    });
  });

  it("traduz a recusa do gateway em ErroAsaas com a mensagem original", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      respostaErro({ errors: [{ description: "O CEP informado é inválido." }] }),
    ));

    const { getPaymentStatus, ErroAsaas } = await importarServico();
    await expect(getPaymentStatus("pay_1")).rejects.toBeInstanceOf(ErroAsaas);
    await expect(getPaymentStatus("pay_1")).rejects.toThrow("O CEP informado é inválido.");
  });

  it("usa mensagem genérica quando o Asaas não descreve o erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaErro({})));
    const { getPaymentStatus } = await importarServico();
    await expect(getPaymentStatus("pay_1")).rejects.toThrow("Erro Asaas (400)");
  });

  it("assina anualmente por padrão — a plataforma não cobra por mês", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ id: "sub_1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { createSubscription } = await importarServico();
    await createSubscription({
      customerId: "cus_1", billingType: "PIX", value: 1000, nextDueDate: "2026-08-04",
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ cycle: "YEARLY" });
  });

  it("cria cobrança avulsa sem ciclo — o ingresso não se repete", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ id: "pay_1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { createPayment } = await importarServico();
    await createPayment({
      customerId: "cus_1", billingType: "BOLETO", value: 3000, dueDate: "2026-08-04",
    });

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/payments$/);
    expect(corpo.cycle).toBeUndefined();
    expect(corpo.value).toBe(3000);
  });

  it("tira os espaços do número do cartão antes de tokenizar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ status: "CONFIRMED" }));
    vi.stubGlobal("fetch", fetchMock);

    const { payWithCreditCard } = await importarServico();
    await payWithCreditCard({
      paymentId: "pay_1",
      card: { holderName: "T", number: "5162 3062 1937 8829", expiryMonth: "05", expiryYear: "2028", ccv: "318" },
      titular: { name: "T", email: "t@e.com" },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).creditCard.number).toBe("5162306219378829");
  });

  it("reconhece os status que significam pago", async () => {
    const { isPago } = await importarServico();
    expect(isPago("RECEIVED")).toBe(true);
    expect(isPago("CONFIRMED")).toBe(true);
    expect(isPago("RECEIVED_IN_CASH")).toBe(true);
    expect(isPago("PENDING")).toBe(false);
    expect(isPago("OVERDUE")).toBe(false);
    expect(isPago("REFUNDED")).toBe(false);
  });

  it("falha quando a assinatura não gerou cobrança", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaOk({ data: [] })));
    const { getFirstSubscriptionPayment } = await importarServico();
    await expect(getFirstSubscriptionPayment("sub_1")).rejects.toThrow(/Nenhuma cobrança/);
  });
});
