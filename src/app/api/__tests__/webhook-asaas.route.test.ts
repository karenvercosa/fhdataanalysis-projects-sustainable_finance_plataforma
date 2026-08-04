import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requisicao } from "@/test/sessao";

const confirmarPagamento = vi.fn();
vi.mock("@/lib/premium.server", () => ({
  confirmarPagamento: (...a: unknown[]) => confirmarPagamento(...a),
}));

const { POST } = await import("@/app/api/webhooks/asaas/route");

const evento = (json: unknown, headers?: Record<string, string>) =>
  POST(requisicao("http://x/api/webhooks/asaas", { json, headers }));

const TOKEN_ORIGINAL = process.env.ASAAS_WEBHOOK_TOKEN;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  confirmarPagamento.mockReset().mockResolvedValue(true);
  delete process.env.ASAAS_WEBHOOK_TOKEN;
});

afterEach(() => {
  if (TOKEN_ORIGINAL === undefined) delete process.env.ASAAS_WEBHOOK_TOKEN;
  else process.env.ASAAS_WEBHOOK_TOKEN = TOKEN_ORIGINAL;
});

describe("POST /api/webhooks/asaas", () => {
  it("recusa quem não apresenta o token configurado", async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = "segredo";

    const res = await evento({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } });

    expect(res.status).toBe(401);
    expect(confirmarPagamento).not.toHaveBeenCalled();
  });

  it("aceita quando o token confere", async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = "segredo";

    const res = await evento(
      { event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } },
      { "asaas-access-token": "segredo" },
    );

    expect(res.status).toBe(200);
    expect(confirmarPagamento).toHaveBeenCalledWith("pay_1");
  });

  it("confirma nos dois eventos de pagamento", async () => {
    for (const event of ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]) {
      await evento({ event, payment: { id: "pay_1" } });
    }

    expect(confirmarPagamento).toHaveBeenCalledTimes(2);
  });

  it("ignora evento que não é de pagamento", async () => {
    const res = await evento({ event: "PAYMENT_CREATED", payment: { id: "pay_1" } });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(confirmarPagamento).not.toHaveBeenCalled();
  });

  it("ignora evento de pagamento sem id utilizável", async () => {
    await evento({ event: "PAYMENT_RECEIVED", payment: { id: 42 } });
    await evento({ event: "PAYMENT_RECEIVED" });

    expect(confirmarPagamento).not.toHaveBeenCalled();
  });

  it("responde 200 para cobrança que não é desta aplicação", async () => {
    confirmarPagamento.mockResolvedValue(false);

    const res = await evento({ event: "PAYMENT_RECEIVED", payment: { id: "pay_outro" } });

    // 200 mesmo assim: erro faria o Asaas reenviar o evento indefinidamente.
    expect(res.status).toBe(200);
  });

  it("aguenta corpo que não é JSON", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: "x" }));

    expect(res.status).toBe(200);
    expect(confirmarPagamento).not.toHaveBeenCalled();
  });

  it("devolve 500 quando a confirmação estoura", async () => {
    confirmarPagamento.mockRejectedValue(new Error("banco fora"));

    const res = await evento({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } });

    expect(res.status).toBe(500);
  });
});
