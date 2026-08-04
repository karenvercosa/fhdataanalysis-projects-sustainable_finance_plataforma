import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { requisicao } from "@/test/sessao";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const signUpEmail = vi.fn();
const criarLinkDeTrocaDeSenha = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: { api: { signUpEmail: (...a: unknown[]) => signUpEmail(...a) } },
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

const { POST } = await import("@/app/api/cadastro/route");

const CORPO_OK = {
  firstName: "Marina",
  lastName: "Costa",
  email: "Marina@Teste.com",
  phone: "+5562999998888",
  empresa: "ACME",
  cargo: "CTO",
};

const chamar = (json: unknown) => POST(requisicao("http://x/api/cadastro", { json }));

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  signUpEmail.mockReset().mockResolvedValue({ user: { id: "u1" } });
  criarLinkDeTrocaDeSenha.mockReset().mockResolvedValue("https://x/link");
  voucherUtilizavel.mockReset().mockResolvedValue(true);
  resgatarVoucher.mockReset().mockResolvedValue(null);
  sendAcessoPlataformaEmail.mockReset().mockResolvedValue({ success: true });
  prisma.account.findFirst.mockResolvedValue({ password: "hash" });
});

describe("validação", () => {
  it("recusa e-mail sem @", async () => {
    const res = await chamar({ ...CORPO_OK, email: "semarroba" });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("@") });
  });

  it("recusa nome ou sobrenome em branco", async () => {
    expect((await chamar({ ...CORPO_OK, firstName: "" })).status).toBe(400);
    expect((await chamar({ ...CORPO_OK, lastName: " " })).status).toBe(400);
  });

  it("recusa celular inválido", async () => {
    const res = await chamar({ ...CORPO_OK, phone: "123" });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/celular/i) });
  });

  it("recusa vínculo corporativo incompleto", async () => {
    expect((await chamar({ ...CORPO_OK, empresa: "" })).status).toBe(400);
    expect((await chamar({ ...CORPO_OK, cargo: "" })).status).toBe(400);
  });

  it("nada é gravado quando a validação falha", async () => {
    await chamar({ ...CORPO_OK, email: "x" });
    expect(signUpEmail).not.toHaveBeenCalled();
  });
});

describe("voucher", () => {
  it("é conferido ANTES de criar a conta — o formulário precisa continuar editável", async () => {
    voucherUtilizavel.mockResolvedValue(false);

    const res = await chamar({ ...CORPO_OK, voucher: "RUIM" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Voucher inválido"),
    });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("sem voucher a conferência nem acontece", async () => {
    await chamar(CORPO_OK);
    expect(voucherUtilizavel).not.toHaveBeenCalled();
  });

  it("o resgate acontece depois de completar o cadastro", async () => {
    resgatarVoucher.mockResolvedValue({ empresaNome: "ACME", status: "aprovado" });

    const res = await chamar({ ...CORPO_OK, voucher: "VERDE" });

    await expect(res.json()).resolves.toMatchObject({
      success: true,
      empresaDoVoucher: "ACME",
      voucherAplicado: true,
      voucherPendente: false,
    });
    expect(prisma.usuario.update).toHaveBeenCalled();
  });

  it("voucher de curador volta como pendente", async () => {
    resgatarVoucher.mockResolvedValue({ empresaNome: "ACME", status: "pendente" });

    const res = await chamar({ ...CORPO_OK, voucher: "VERDE" });

    await expect(res.json()).resolves.toMatchObject({ voucherPendente: true });
  });

  it("resgate que falha no último instante avisa sem derrubar a conta criada", async () => {
    resgatarVoucher.mockResolvedValue(null);

    const res = await chamar({ ...CORPO_OK, voucher: "VERDE" });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, voucherAplicado: false });
  });
});

describe("criação da conta", () => {
  it("normaliza o e-mail e monta o nome completo", async () => {
    await chamar(CORPO_OK);

    expect(signUpEmail).toHaveBeenCalledWith({
      body: { email: "marina@teste.com", password: expect.any(String), name: "Marina Costa" },
    });
  });

  it("e-mail já cadastrado devolve 409", async () => {
    signUpEmail.mockRejectedValue(new Error("User already exists"));

    const res = await chamar(CORPO_OK);

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "Este e-mail já está cadastrado." });
  });

  it("outra falha do Better Auth vira 500", async () => {
    signUpEmail.mockRejectedValue(new Error("banco fora do ar"));

    const res = await chamar(CORPO_OK);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "banco fora do ar" });
  });

  it("a senha provisória gerada respeita a política da plataforma", async () => {
    await chamar(CORPO_OK);
    expect(signUpEmail.mock.calls[0][0].body.password).toMatch(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
    );
  });
});

describe("gravação do vínculo corporativo", () => {
  it("espelha o hash do Better Auth nas duas colunas de senha", async () => {
    await chamar(CORPO_OK);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({
        telefone: "+5562999998888",
        empresaNome: "ACME",
        cargo: "CTO",
        voucher: null,
        senhaHash: "hash",
        senhaProvisoriaHash: "hash",
      }),
    });
  });

  it("sem credencial encontrada não sobrescreve o hash com null", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await chamar(CORPO_OK);

    const { data } = prisma.usuario.update.mock.calls[0][0];
    expect(data.senhaHash).toBeUndefined();
    expect(data.senhaProvisoriaHash).toBeUndefined();
  });
});

describe("e-mail de acesso", () => {
  it("leva o link curto de criação de senha", async () => {
    await chamar(CORPO_OK);

    expect(sendAcessoPlataformaEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Marina Costa",
        email: "marina@teste.com",
        linkCriarSenha: "https://x/link",
      }),
    );
  });

  it("SMTP fora não invalida o cadastro — sinaliza que a senha não chegou", async () => {
    sendAcessoPlataformaEmail.mockResolvedValue({ success: false });

    const res = await chamar(CORPO_OK);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, emailEnviado: false });
  });
});

describe("erros inesperados", () => {
  it("corpo que não é JSON vira 500 com mensagem", async () => {
    const res = await POST(
      new Request("http://x/api/cadastro", { method: "POST", body: "{quebrado" }),
    );

    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });
});
