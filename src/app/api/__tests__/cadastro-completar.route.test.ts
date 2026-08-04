import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { requisicao } from "@/test/sessao";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const getSession = vi.fn();
const setPassword = vi.fn();
const criarLinkDeTrocaDeSenha = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...a: unknown[]) => getSession(...a),
      setPassword: (...a: unknown[]) => setPassword(...a),
    },
  },
  criarLinkDeTrocaDeSenha: (...a: unknown[]) => criarLinkDeTrocaDeSenha(...a),
}));

const voucherUtilizavel = vi.fn();
const resgatarVoucher = vi.fn();
vi.mock("@/lib/voucher.server", async (real) => ({
  ...(await real<typeof import("@/lib/voucher.server")>()),
  voucherUtilizavel: (...a: unknown[]) => voucherUtilizavel(...a),
  resgatarVoucher: (...a: unknown[]) => resgatarVoucher(...a),
}));

const sendAcessoPlataformaEmail = vi.fn();
vi.mock("@/services/email.service", () => ({
  sendAcessoPlataformaEmail: (...a: unknown[]) => sendAcessoPlataformaEmail(...a),
}));

const { POST } = await import("@/app/api/cadastro/completar/route");

const SESSAO = { user: { id: "u1", email: "marina@x.com", name: "Marina" } };

const CORPO_OK = {
  phone: "+5562999998888",
  empresa: "ACME",
  cargo: "CTO",
};

const completar = (json: unknown) =>
  POST(requisicao("http://x/api/cadastro/completar", { json }));

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  getSession.mockReset().mockResolvedValue(SESSAO);
  setPassword.mockReset().mockResolvedValue({ status: true });
  criarLinkDeTrocaDeSenha.mockReset().mockResolvedValue("https://x/link");
  voucherUtilizavel.mockReset().mockResolvedValue(true);
  resgatarVoucher.mockReset().mockResolvedValue(null);
  sendAcessoPlataformaEmail.mockReset().mockResolvedValue({ success: true });
  // Conta vinda do Google: ainda não tem credencial de e-mail/senha.
  prisma.account.findFirst.mockResolvedValue(null);
});

describe("POST /api/cadastro/completar", () => {
  it("recusa quem não tem sessão", async () => {
    getSession.mockResolvedValue(null);

    const res = await completar(CORPO_OK);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Sessão expirada"),
    });
  });

  it("recusa dados corporativos incompletos", async () => {
    expect((await completar({ ...CORPO_OK, empresa: "" })).status).toBe(400);
    expect((await completar({ ...CORPO_OK, cargo: "" })).status).toBe(400);
    expect((await completar({ ...CORPO_OK, phone: "123" })).status).toBe(400);
  });

  it("confere o voucher antes de gravar qualquer coisa", async () => {
    voucherUtilizavel.mockResolvedValue(false);

    const res = await completar({ ...CORPO_OK, voucher: "RUIM" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Voucher inválido"),
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it("gera a senha provisória de quem só tinha login social", async () => {
    const res = await completar(CORPO_OK);

    expect(res.status).toBe(200);
    expect(setPassword).toHaveBeenCalledWith(
      expect.objectContaining({ body: { newPassword: expect.any(String) } }),
    );
    expect(sendAcessoPlataformaEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "marina@x.com", nome: "Marina" }),
    );
    await expect(res.json()).resolves.toMatchObject({ emailEnviado: true });
  });

  it("não troca a senha de quem já tinha uma definida", async () => {
    prisma.account.findFirst.mockResolvedValue({ password: "hash-antigo" });

    const corpo = await (await completar(CORPO_OK)).json();

    expect(setPassword).not.toHaveBeenCalled();
    expect(sendAcessoPlataformaEmail).not.toHaveBeenCalled();
    expect(corpo.emailEnviado).toBeUndefined();
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senhaHash: "hash-antigo",
          // Quem já tinha senha definitiva não volta ao estado de primeiro acesso.
          senhaProvisoriaHash: undefined,
        }),
      }),
    );
  });

  it("grava o vínculo corporativo digitado", async () => {
    await completar(CORPO_OK);

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({
          telefone: "+5562999998888",
          empresaNome: "ACME",
          cargo: "CTO",
          voucher: null,
        }),
      }),
    );
  });

  it("resgata o voucher só depois de gravar, e devolve a empresa dele", async () => {
    resgatarVoucher.mockResolvedValue({ empresaNome: "Patrocinadora", status: "aprovado" });

    const corpo = await (await completar({ ...CORPO_OK, voucher: "VERDE2026" })).json();

    expect(resgatarVoucher).toHaveBeenCalledWith("u1", "VERDE2026");
    expect(corpo).toMatchObject({
      empresaDoVoucher: "Patrocinadora",
      voucherAplicado: true,
      voucherPendente: false,
    });
  });

  it("sinaliza voucher pendente de aprovação do curador", async () => {
    resgatarVoucher.mockResolvedValue({ empresaNome: "Patrocinadora", status: "pendente" });

    const corpo = await (await completar({ ...CORPO_OK, voucher: "VERDE2026" })).json();

    expect(corpo.voucherPendente).toBe(true);
  });

  it("marca voucher não aplicado quando o resgate não acontece", async () => {
    resgatarVoucher.mockResolvedValue(null);

    const corpo = await (await completar({ ...CORPO_OK, voucher: "VERDE2026" })).json();

    expect(corpo.voucherAplicado).toBe(false);
  });

  it("usa o e-mail como nome quando a conta do Google não tem nome", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", email: "marina@x.com", name: "" } });

    await completar(CORPO_OK);

    expect(sendAcessoPlataformaEmail).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "marina@x.com" }),
    );
  });

  it("devolve 500 quando a gravação falha", async () => {
    prisma.usuario.update.mockRejectedValue(new Error("banco fora"));

    const res = await completar(CORPO_OK);

    expect(res.status).toBe(500);
  });
});
