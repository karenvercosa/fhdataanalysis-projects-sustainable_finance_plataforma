import { describe, it, expect, vi, beforeEach } from "vitest";
import { sessaoFalsa, requisicao } from "@/test/sessao";

const exigirCapacidade = vi.fn();
vi.mock("@/lib/rbac.server", async (real) => ({
  ...(await real<typeof import("@/lib/rbac.server")>()),
  exigirCapacidade: (...a: unknown[]) => exigirCapacidade(...a),
}));

const enviar = vi.fn();
vi.mock("@/services/email.service", () => ({ sendLeadPlataformaEmail: (...a: unknown[]) => enviar(...a) }));

const { POST } = await import("@/app/api/leads/route");

const VALIDO = { tipo: "presencial", empresa: "FH", cargo: "QA", telefone: "+5562999998888" };

beforeEach(() => {
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa());
  enviar.mockReset().mockResolvedValue({ success: true });
});

describe("POST /api/leads", () => {
  it("envia com nome e e-mail da SESSÃO, nunca do corpo", async () => {
    await POST(requisicao("http://x/api/leads", {
      json: { ...VALIDO, nome: "Impostor", email: "impostor@x.com" },
    }));

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Pessoa Teste", email: "pessoa@teste.com" }),
    );
  });

  it.each(["presencial", "curador", "patrocinador"])("aceita o tipo %s", async (tipo) => {
    const res = await POST(requisicao("http://x", { json: { ...VALIDO, tipo } }));
    expect(res.status).toBe(200);
  });

  it("recusa tipo inventado", async () => {
    const res = await POST(requisicao("http://x", { json: { ...VALIDO, tipo: "outro" } }));
    expect(res.status).toBe(400);
    expect(enviar).not.toHaveBeenCalled();
  });

  it.each(["empresa", "cargo", "telefone"])("exige %s", async (campo) => {
    const res = await POST(requisicao("http://x", { json: { ...VALIDO, [campo]: "" } }));
    expect(res.status).toBe(400);
  });

  it("recusa mensagem longa demais", async () => {
    const res = await POST(requisicao("http://x", {
      json: { ...VALIDO, mensagem: "x".repeat(2001) },
    }));
    expect(res.status).toBe(400);
  });

  it("devolve 400 quando o SMTP falha — o lead não chegou a ninguém", async () => {
    enviar.mockResolvedValue({ success: false });
    const res = await POST(requisicao("http://x", { json: VALIDO }));
    expect(res.status).toBe(400);
  });

  it("basta estar autenticado: é formulário de interesse, aberto a qualquer plano", async () => {
    await POST(requisicao("http://x", { json: VALIDO }));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything());
  });
});
