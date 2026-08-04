import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { PerfilUsuario } from "@/types";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));

const {
  getSessaoServidor,
  roleEfetivo,
  tipoDeConta,
  podeServidor,
  exigirCapacidade,
  ErroAutorizacao,
  ROLE_PARA_PERFIL,
} = await import("@/lib/rbac.server");

/** Registro cru do banco, com todos os relacionamentos vazios por padrão. */
function usuarioNoBanco(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    nomeCompleto: "Pessoa Teste",
    email: "pessoa@teste.com",
    avatarUrl: null,
    ativo: true,
    selo: null,
    cargo: null,
    empresaNome: null,
    senhaProvisoriaHash: null,
    perfis: [{ perfil: PerfilUsuario.gratuito }],
    ingressos: [],
    assinaturas: [],
    resgatesDeVoucher: [],
    ...over,
  };
}

beforeEach(() => {
  limparPrismaFalso(prisma);
  getSession.mockReset().mockResolvedValue({ user: { id: "u1" } });
});

describe("roleEfetivo", () => {
  it("sem perfil algum a pessoa é guest", () => {
    expect(roleEfetivo([])).toBe("guest");
  });

  it("traduz cada perfil do banco para o papel da interface", () => {
    expect(roleEfetivo([PerfilUsuario.admin])).toBe("admin");
    expect(roleEfetivo([PerfilUsuario.operadorCredenciamento])).toBe("operator");
    expect(roleEfetivo([PerfilUsuario.curador])).toBe("curator");
    expect(roleEfetivo([PerfilUsuario.patrocinador])).toBe("curator");
    expect(roleEfetivo([PerfilUsuario.palestrante])).toBe("speaker");
    expect(roleEfetivo([PerfilUsuario.participante])).toBe("attendee");
    expect(roleEfetivo([PerfilUsuario.startup])).toBe("attendee");
    expect(roleEfetivo([PerfilUsuario.investidor])).toBe("attendee");
    expect(roleEfetivo([PerfilUsuario.gratuito])).toBe("guest");
  });

  it("com mais de um perfil vale o mais poderoso", () => {
    expect(roleEfetivo([PerfilUsuario.participante, PerfilUsuario.admin])).toBe("admin");
    expect(roleEfetivo([PerfilUsuario.gratuito, PerfilUsuario.curador])).toBe("curator");
    expect(roleEfetivo([PerfilUsuario.palestrante, PerfilUsuario.participante])).toBe("speaker");
  });

  it("perfil desconhecido é descartado em vez de virar papel", () => {
    expect(roleEfetivo(["inventado" as PerfilUsuario])).toBe("guest");
  });
});

describe("ROLE_PARA_PERFIL", () => {
  it("é o inverso canônico — todo papel tem um perfil de gravação", () => {
    expect(ROLE_PARA_PERFIL).toEqual({
      guest: PerfilUsuario.gratuito,
      attendee: PerfilUsuario.participante,
      speaker: PerfilUsuario.palestrante,
      curator: PerfilUsuario.curador,
      operator: PerfilUsuario.operadorCredenciamento,
      admin: PerfilUsuario.admin,
    });
  });

  it("cada perfil gravado volta ao papel de origem", () => {
    for (const [role, perfil] of Object.entries(ROLE_PARA_PERFIL)) {
      expect(roleEfetivo([perfil])).toBe(role);
    }
  });
});

describe("tipoDeConta", () => {
  it("guest sem ingresso e sem assinatura é gratuito", () => {
    expect(tipoDeConta("guest", false, false)).toBe("gratuito");
  });

  it("qualquer papel concedido pela organização já é assinante", () => {
    for (const role of ["attendee", "speaker", "curator", "operator", "admin"] as const) {
      expect(tipoDeConta(role, false, false)).toBe("assinante");
    }
  });

  it("ingresso pago ou assinatura ativa promovem o guest", () => {
    expect(tipoDeConta("guest", true, false)).toBe("assinante");
    expect(tipoDeConta("guest", false, true)).toBe("assinante");
  });
});

describe("podeServidor", () => {
  it("admin tem a capacidade de gestão", () => {
    expect(podeServidor("admin", "manage:platform")).toBe(true);
  });

  it("guest não gerencia a plataforma", () => {
    expect(podeServidor("guest", "manage:platform")).toBe(false);
  });

  it("papel fora da matriz devolve false em vez de estourar", () => {
    expect(podeServidor("inexistente" as never, "manage:platform")).toBe(false);
  });
});

describe("getSessaoServidor", () => {
  const headers = new Headers();

  it("sem sessão do Better Auth devolve null", async () => {
    getSession.mockResolvedValue(null);
    await expect(getSessaoServidor(headers)).resolves.toBeNull();
  });

  it("sessão sem id de usuário devolve null", async () => {
    getSession.mockResolvedValue({ user: {} });
    await expect(getSessaoServidor(headers)).resolves.toBeNull();
  });

  it("usuário não encontrado no banco devolve null", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    await expect(getSessaoServidor(headers)).resolves.toBeNull();
  });

  it("conta desativada pelo Admin perde o acesso mesmo com cookie válido", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioNoBanco({ ativo: false }));
    await expect(getSessaoServidor(headers)).resolves.toBeNull();
  });

  it("monta a sessão a partir do banco, não do cliente", async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioNoBanco({ perfis: [{ perfil: PerfilUsuario.admin }] }),
    );

    const sessao = await getSessaoServidor(headers);

    expect(sessao).toMatchObject({
      id: "u1",
      email: "pessoa@teste.com",
      role: "admin",
      tipoConta: "assinante",
      isPaid: false,
      hasCredential: false,
      senhaProvisoria: false,
    });
    expect(sessao?.capabilities).toContain("manage:platform");
  });

  it("cai no e-mail quando o cadastro está sem nome", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioNoBanco({ nomeCompleto: null }));
    await expect(getSessaoServidor(headers)).resolves.toMatchObject({
      nome: "pessoa@teste.com",
    });
  });

  it("ingresso pago com QR libera a credencial", async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioNoBanco({ ingressos: [{ qrCode: "QR-1" }] }),
    );

    await expect(getSessaoServidor(headers)).resolves.toMatchObject({
      isPaid: true,
      hasCredential: true,
      ticketCode: "QR-1",
      tipoConta: "assinante",
    });
  });

  it("ingresso sem QR conta como pago, mas não gera credencial", async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioNoBanco({ ingressos: [{ qrCode: null }] }),
    );

    await expect(getSessaoServidor(headers)).resolves.toMatchObject({
      isPaid: true,
      hasCredential: false,
    });
  });

  it("assinatura ativa tira o guest do plano gratuito", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioNoBanco({ assinaturas: [{ id: "a1" }] }));
    await expect(getSessaoServidor(headers)).resolves.toMatchObject({ tipoConta: "assinante" });
  });

  it("resgate pendente vira o aviso de voucher aguardando o curador", async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioNoBanco({
        resgatesDeVoucher: [{ voucher: { codigo: "VERDE", empresaNome: "ACME" } }],
      }),
    );

    await expect(getSessaoServidor(headers)).resolves.toMatchObject({
      voucherPendente: { codigo: "VERDE", empresaNome: "ACME" },
    });
  });

  it("sem resgate pendente o aviso é null", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioNoBanco());
    await expect(getSessaoServidor(headers)).resolves.toMatchObject({ voucherPendente: null });
  });

  it("hash de senha provisória sinaliza o primeiro acesso pendente", async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioNoBanco({ senhaProvisoriaHash: "hash" }),
    );
    await expect(getSessaoServidor(headers)).resolves.toMatchObject({ senhaProvisoria: true });
  });
});

describe("exigirCapacidade", () => {
  const headers = new Headers();

  it("sem sessão lança 401", async () => {
    getSession.mockResolvedValue(null);
    await expect(exigirCapacidade(headers)).rejects.toMatchObject({ status: 401 });
  });

  it("sessão válida sem capacidade pedida passa", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioNoBanco());
    await expect(exigirCapacidade(headers)).resolves.toMatchObject({ role: "guest" });
  });

  it("papel sem a capacidade lança 403", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioNoBanco());
    await expect(exigirCapacidade(headers, "manage:platform")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("papel com a capacidade devolve a sessão", async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      usuarioNoBanco({ perfis: [{ perfil: PerfilUsuario.admin }] }),
    );
    await expect(exigirCapacidade(headers, "manage:platform")).resolves.toMatchObject({
      role: "admin",
    });
  });
});

describe("ErroAutorizacao", () => {
  it("guarda o status HTTP junto da mensagem", () => {
    const erro = new ErroAutorizacao(403, "sem permissão");
    expect(erro).toBeInstanceOf(Error);
    expect(erro.name).toBe("ErroAutorizacao");
    expect(erro.status).toBe(403);
  });
});
