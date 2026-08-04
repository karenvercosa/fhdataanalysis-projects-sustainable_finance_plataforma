import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { PerfilUsuario } from "@/types";

/**
 * O que interessa testar em `lib/auth.ts` são os GANCHOS: a configuração
 * entregue ao Better Auth é só dado, mas os callbacks dentro dela carregam
 * regra de negócio (política de senha, dono do token, perfil de entrada).
 *
 * Por isso o `betterAuth` é substituído por um espião que guarda a configuração
 * recebida — assim cada gancho pode ser chamado diretamente.
 */
const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

class APIErrorFalso extends Error {
  constructor(
    readonly statusCode: string,
    readonly corpo: { message?: string; code?: string },
  ) {
    super(corpo?.message);
    this.name = "APIError";
  }
}

let configuracao: any;
const requestPasswordReset = vi.fn();

vi.mock("better-auth", () => ({
  betterAuth: (config: unknown) => {
    configuracao = config;
    return { api: { requestPasswordReset: (...a: unknown[]) => requestPasswordReset(...a) } };
  },
  APIError: APIErrorFalso,
}));
vi.mock("better-auth/api", () => ({ createAuthMiddleware: (fn: unknown) => fn }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: () => ({}) }));

const enviarEmail = vi.fn();
vi.mock("@/services/email.service", () => ({
  sendConfirmacaoTrocaSenhaEmail: (...a: unknown[]) => enviarEmail(...a),
}));

const {
  pedirTrocaDeSenha,
  usuarioDoTokenDeTrocaDeSenha,
  tokenDeTrocaDeSenhaValido,
  criarLinkDeTrocaDeSenha,
} = await import("@/lib/auth");

const UUID_VALIDO = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  limparPrismaFalso(prisma);
  enviarEmail.mockReset();
  requestPasswordReset.mockReset();
});

describe("configuração do Better Auth", () => {
  it("mapeia a tabela `Usuario` com os campos em português", () => {
    expect(configuracao.user).toMatchObject({
      modelName: "Usuario",
      fields: { name: "nomeCompleto", image: "avatarUrl", createdAt: "criadoEm" },
    });
  });

  it("declara a allowlist de destinos pós-login com a própria origem", () => {
    expect(configuracao.trustedOrigins).toEqual([configuracao.baseURL]);
  });

  it("liga o login social ao cadastro já existente pelo mesmo e-mail", () => {
    expect(configuracao.account.accountLinking).toMatchObject({
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    });
  });

  it("derruba as sessões antigas quando a senha é trocada", () => {
    expect(configuracao.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true);
  });

  it("deixa o Postgres gerar o UUID", () => {
    expect(configuracao.advanced.database.generateId).toBe(false);
  });
});

describe("sendResetPassword", () => {
  it("usa o texto de primeiro acesso quando a senha ainda é a provisória", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      nomeCompleto: "Pessoa",
      senhaProvisoriaHash: "hash",
    });

    await configuracao.emailAndPassword.sendResetPassword({
      user: { id: "u1", email: "p@t.com", name: "P" },
      url: "https://x/reset",
    });

    expect(enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: "primeiro-acesso", nome: "Pessoa", url: "https://x/reset" }),
    );
  });

  it("usa o texto de recuperação quando a senha já foi escolhida", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      nomeCompleto: "Pessoa",
      senhaProvisoriaHash: null,
    });

    await configuracao.emailAndPassword.sendResetPassword({
      user: { id: "u1", email: "p@t.com" },
      url: "https://x",
    });

    expect(enviarEmail).toHaveBeenCalledWith(expect.objectContaining({ motivo: "esqueci-senha" }));
  });

  it("cai no nome da sessão e depois no e-mail quando o cadastro não tem nome", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await configuracao.emailAndPassword.sendResetPassword({
      user: { id: "u1", email: "p@t.com", name: "Da Sessão" },
      url: "https://x",
    });
    expect(enviarEmail).toHaveBeenLastCalledWith(expect.objectContaining({ nome: "Da Sessão" }));

    await configuracao.emailAndPassword.sendResetPassword({
      user: { id: "u1", email: "p@t.com" },
      url: "https://x",
    });
    expect(enviarEmail).toHaveBeenLastCalledWith(expect.objectContaining({ nome: "p@t.com" }));
  });

  it("informa a validade do link em minutos", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await configuracao.emailAndPassword.sendResetPassword({
      user: { id: "u1", email: "p@t.com" },
      url: "https://x",
    });

    expect(enviarEmail).toHaveBeenCalledWith(expect.objectContaining({ validadeMinutos: 60 }));
  });
});

describe("onPasswordReset", () => {
  it("espelha o hash novo e apaga a senha provisória", async () => {
    prisma.account.findFirst.mockResolvedValue({ password: "hash-novo" });

    await configuracao.emailAndPassword.onPasswordReset({ user: { id: "u1" } });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { senhaHash: "hash-novo", senhaProvisoriaHash: null, emailVerified: true },
    });
  });

  it("sem credencial encontrada não sobrescreve o hash com null", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await configuracao.emailAndPassword.onPasswordReset({ user: { id: "u1" } });

    expect(prisma.usuario.update.mock.calls[0][0].data.senhaHash).toBeUndefined();
  });
});

describe("hook `before`", () => {
  const chamar = (ctx: unknown) => configuracao.hooks.before(ctx);

  it("ignora rotas que não sejam de troca de senha", async () => {
    await expect(chamar({ path: "/sign-in/email", body: { newPassword: "fraca" } })).resolves
      .toBeUndefined();
  });

  it("recusa senha fora da política em /change-password", async () => {
    await expect(chamar({ path: "/change-password", body: { newPassword: "fraca" } })).rejects
      .toBeInstanceOf(APIErrorFalso);
  });

  it("aceita senha forte em /change-password", async () => {
    await expect(
      chamar({ path: "/change-password", body: { newPassword: "SenhaForte1!" } }),
    ).resolves.toBeUndefined();
  });

  it("ignora corpo sem `newPassword`", async () => {
    prisma.verification.findFirst.mockResolvedValue(null);
    await expect(chamar({ path: "/change-password", body: {} })).resolves.toBeUndefined();
  });

  it("sem token no corpo nem na query, não há o que conferir", async () => {
    await expect(
      chamar({ path: "/reset-password", body: { newPassword: "SenhaForte1!" } }),
    ).resolves.toBeUndefined();
    expect(prisma.verification.findFirst).not.toHaveBeenCalled();
  });

  it("token de usuário apagado ou desativado vira INVALID_TOKEN, não 500", async () => {
    prisma.verification.findFirst.mockResolvedValue(null);

    await expect(
      chamar({ path: "/reset-password", body: { newPassword: "SenhaForte1!", token: "t1" } }),
    ).rejects.toMatchObject({ corpo: { code: "INVALID_TOKEN" } });
  });

  it("token válido com dono ativo passa", async () => {
    prisma.verification.findFirst.mockResolvedValue({ value: UUID_VALIDO });
    prisma.usuario.findFirst.mockResolvedValue({ id: UUID_VALIDO, email: "p@t.com" });

    await expect(
      chamar({ path: "/reset-password", query: { token: "t1" }, body: { newPassword: "SenhaForte1!" } }),
    ).resolves.toBeUndefined();
  });
});

describe("databaseHooks — toda conta nova nasce no Plano Gratuito", () => {
  it("grava o perfil gratuito depois de criar o usuário", async () => {
    await configuracao.databaseHooks.user.create.after({ id: "u1" });

    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalledWith({
      where: { usuarioId_perfil: { usuarioId: "u1", perfil: PerfilUsuario.gratuito } },
      create: { usuarioId: "u1", perfil: PerfilUsuario.gratuito },
      update: {},
    });
  });
});

describe("pedirTrocaDeSenha", () => {
  it("normaliza o e-mail e fixa a tela de destino", async () => {
    await pedirTrocaDeSenha("  Pessoa@Teste.com ");

    expect(requestPasswordReset).toHaveBeenCalledWith({
      body: { email: "pessoa@teste.com", redirectTo: "/trocar-senha" },
    });
  });
});

describe("usuarioDoTokenDeTrocaDeSenha", () => {
  it("token vazio nem consulta o banco", async () => {
    await expect(usuarioDoTokenDeTrocaDeSenha("")).resolves.toBeNull();
    expect(prisma.verification.findFirst).not.toHaveBeenCalled();
  });

  it("verificação inexistente ou expirada devolve null", async () => {
    prisma.verification.findFirst.mockResolvedValue(null);
    await expect(usuarioDoTokenDeTrocaDeSenha("t1")).resolves.toBeNull();
  });

  it("valor que não é UUID devolve null — consultar assim faria o Prisma lançar", async () => {
    prisma.verification.findFirst.mockResolvedValue({ value: "nao-e-uuid" });
    await expect(usuarioDoTokenDeTrocaDeSenha("t1")).resolves.toBeNull();
    expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
  });

  it("procura o token no formato consumido pelo Better Auth e ainda no prazo", async () => {
    prisma.verification.findFirst.mockResolvedValue({ value: UUID_VALIDO });
    prisma.usuario.findFirst.mockResolvedValue({ id: UUID_VALIDO, email: "p@t.com" });

    await usuarioDoTokenDeTrocaDeSenha("t1");

    expect(prisma.verification.findFirst.mock.calls[0][0].where).toMatchObject({
      identifier: "reset-password:t1",
      expiresAt: { gt: expect.any(Date) },
    });
    expect(prisma.usuario.findFirst.mock.calls[0][0].where).toMatchObject({
      id: UUID_VALIDO,
      ativo: true,
    });
  });
});

describe("tokenDeTrocaDeSenhaValido", () => {
  it("é `true` só quando existe um dono ativo", async () => {
    prisma.verification.findFirst.mockResolvedValue({ value: UUID_VALIDO });
    prisma.usuario.findFirst.mockResolvedValue({ id: UUID_VALIDO });
    await expect(tokenDeTrocaDeSenhaValido("t1")).resolves.toBe(true);

    prisma.usuario.findFirst.mockResolvedValue(null);
    await expect(tokenDeTrocaDeSenhaValido("t1")).resolves.toBe(false);
  });
});

describe("criarLinkDeTrocaDeSenha", () => {
  it("grava a verificação no formato que o Better Auth consome", async () => {
    const url = await criarLinkDeTrocaDeSenha("u1");
    const { data } = prisma.verification.create.mock.calls[0][0];

    expect(data.identifier).toMatch(/^reset-password:/);
    expect(data.value).toBe("u1");
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(url).toContain(data.identifier.replace("reset-password:", ""));
  });

  it("devolve a mesma URL que o Better Auth montaria, com o callback da tela", async () => {
    const url = await criarLinkDeTrocaDeSenha("u1");

    expect(url).toMatch(/\/api\/auth\/reset-password\/[\w-]{24}\?callbackURL=%2Ftrocar-senha$/);
  });

  it("nunca repete o token entre dois convites", async () => {
    const a = await criarLinkDeTrocaDeSenha("u1");
    const b = await criarLinkDeTrocaDeSenha("u1");
    expect(a).not.toBe(b);
  });
});
