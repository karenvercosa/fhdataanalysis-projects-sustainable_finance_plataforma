import { describe, it, expect, vi, beforeEach } from "vitest";
import { sessaoFalsa } from "@/test/sessao";

const getSessaoServidor = vi.fn();
vi.mock("@/lib/rbac.server", async (real) => ({
  ...(await real<typeof import("@/lib/rbac.server")>()),
  getSessaoServidor: (...a: unknown[]) => getSessaoServidor(...a),
}));

// `headers()` é síncrono no Next 14 (vira Promise só no 15).
vi.mock("next/headers", () => ({ headers: () => new Headers() }));

const { GET } = await import("@/app/api/sessao/route");

beforeEach(() => getSessaoServidor.mockReset());

describe("GET /api/sessao", () => {
  it("sem sessão responde 200 com usuário nulo — não é erro estar deslogado", async () => {
    getSessaoServidor.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: null });
  });

  it("devolve papel e capacidades resolvidos no servidor", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "admin" }));

    const { user, capabilities } = await (await GET()).json();

    expect(user.role).toBe("admin");
    expect(capabilities).toContain("manage:platform");
  });

  it("a cota do curador vem do selo concedido pelo Admin", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "curator", selo: "Ouro" }));

    const { user } = await (await GET()).json();

    expect(user.tier).toBe("Ouro");
    expect(user.selo).toBe("Ouro");
  });

  it("selo que não é cota conhecida não vira tier", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "curator", selo: "Diamante" }));

    const { user } = await (await GET()).json();

    expect(user.tier).toBeUndefined();
  });

  it("sem selo o curador fica sem cota", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "curator", selo: null }));

    const { user } = await (await GET()).json();

    expect(user.tier).toBeUndefined();
  });

  it("avatar nulo vira ausente em vez de null no corpo", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ avatarUrl: null }));

    const { user } = await (await GET()).json();

    expect(user.avatarUrl).toBeUndefined();
  });

  it("repassa ingresso, credencial e tipo de conta", async () => {
    getSessaoServidor.mockResolvedValue(
      sessaoFalsa({
        role: "attendee",
        isPaid: true,
        hasCredential: true,
        ticketCode: "QR-1",
        tipoConta: "assinante",
      }),
    );

    const { user } = await (await GET()).json();

    expect(user).toMatchObject({
      isPaid: true,
      hasCredential: true,
      ticketCode: "QR-1",
      tipoConta: "assinante",
    });
  });

  it("repassa o aviso de voucher pendente e o primeiro acesso", async () => {
    getSessaoServidor.mockResolvedValue(
      sessaoFalsa({
        voucherPendente: { codigo: "VERDE", empresaNome: "ACME" },
        senhaProvisoria: true,
      }),
    );

    const corpo = await (await GET()).json();

    expect(corpo.user.voucherPendente).toEqual({ codigo: "VERDE", empresaNome: "ACME" });
    expect(corpo.senhaProvisoria).toBe(true);
  });
});
