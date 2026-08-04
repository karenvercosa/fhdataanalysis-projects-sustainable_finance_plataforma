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

const signUpEmail = vi.fn();
const criarLinkDeTrocaDeSenha = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: { api: { signUpEmail: (...a: unknown[]) => signUpEmail(...a) } },
  criarLinkDeTrocaDeSenha: (...a: unknown[]) => criarLinkDeTrocaDeSenha(...a),
}));

const sendAcessoPlataformaEmail = vi.fn();
vi.mock("@/services/email.service", () => ({
  sendAcessoPlataformaEmail: (...a: unknown[]) => sendAcessoPlataformaEmail(...a),
}));

const { ErroAutorizacao } = await import("@/lib/rbac.server");
const { GET, POST } = await import("@/app/api/admin/usuarios/route");
const { PATCH, DELETE } = await import("@/app/api/admin/usuarios/[id]/route");

const REGISTRO = {
  id: "u1",
  nomeCompleto: "Marina Costa",
  email: "marina@teste.com",
  selo: "Ouro",
  ativo: true,
  empresaNome: "ACME",
  voucher: null,
  perfis: [{ perfil: "participante" }],
};

const FORMULARIO = {
  nome: "Marina Costa",
  email: "Marina@Teste.com",
  role: "attendee",
  selo: "Ouro",
};

const ctx = (id: string) => ({ params: { id } });

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa({ role: "admin" }));
  signUpEmail.mockReset().mockResolvedValue({ user: { id: "u1" } });
  criarLinkDeTrocaDeSenha.mockReset().mockResolvedValue("https://x/link");
  sendAcessoPlataformaEmail.mockReset().mockResolvedValue({ success: true });
  prisma.account.findFirst.mockResolvedValue({ password: "hash-provisorio" });
  prisma.usuario.findUniqueOrThrow.mockResolvedValue(REGISTRO);
});

describe("GET /api/admin/usuarios", () => {
  it("exige a capacidade de gestão da plataforma", async () => {
    prisma.usuario.findMany.mockResolvedValue([]);
    await GET(requisicao("http://x/api/admin/usuarios"));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything(), "manage:platform");
  });

  it("devolve a lista já no formato das telas", async () => {
    prisma.usuario.findMany.mockResolvedValue([REGISTRO]);

    const { usuarios } = await (await GET(requisicao("http://x"))).json();

    expect(usuarios).toEqual([
      {
        id: "u1",
        nome: "Marina Costa",
        email: "marina@teste.com",
        role: "attendee",
        selo: "Ouro",
        ativo: true,
        empresaNome: "ACME",
        voucher: null,
      },
    ]);
  });

  it("traduz falha de autorização no status dela, e não em 500", async () => {
    exigirCapacidade.mockRejectedValue(new ErroAutorizacao(403, "Sem permissão."));

    const res = await GET(requisicao("http://x"));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: "Sem permissão." });
  });

  it("devolve 500 quando o banco falha", async () => {
    prisma.usuario.findMany.mockRejectedValue(new Error("banco fora"));

    const res = await GET(requisicao("http://x"));

    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/usuarios", () => {
  const criar = (json: unknown) =>
    POST(requisicao("http://x/api/admin/usuarios", { json }));

  it("recusa formulário inválido com 400", async () => {
    expect((await criar({ ...FORMULARIO, nome: "x" })).status).toBe(400);
    expect((await criar({ ...FORMULARIO, email: "semarroba" })).status).toBe(400);
    expect((await criar({ ...FORMULARIO, role: "inventado" })).status).toBe(400);
    expect((await criar({ ...FORMULARIO, selo: "Platina" })).status).toBe(400);
  });

  it("recusa e-mail já cadastrado", async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: "outro" });

    const res = await criar(FORMULARIO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Já existe um usuário"),
    });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("cria pelo Better Auth para a conta nascer com credencial", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await criar(FORMULARIO);

    expect(signUpEmail).toHaveBeenCalledWith({
      body: { email: "marina@teste.com", password: expect.any(String), name: "Marina Costa" },
    });
  });

  it("copia o hash da credencial para a senha provisória", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await criar(FORMULARIO);

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senhaHash: "hash-provisorio",
          senhaProvisoriaHash: "hash-provisorio",
        }),
      }),
    );
  });

  it("aplica o perfil escolhido sobrepondo o gratuito do gancho", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await criar(FORMULARIO);

    expect(prisma.usuarioPerfil.deleteMany).toHaveBeenCalled();
    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { usuarioId: "u1", perfil: "participante" } }),
    );
  });

  it("informa se o e-mail de acesso saiu", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    sendAcessoPlataformaEmail.mockResolvedValue({ success: false });

    const corpo = await (await criar(FORMULARIO)).json();

    expect(corpo.emailEnviado).toBe(false);
    expect(corpo.usuario.email).toBe("marina@teste.com");
  });

  it("segue sem hash quando a credencial não é encontrada", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.account.findFirst.mockResolvedValue(null);

    const res = await criar(FORMULARIO);

    expect(res.status).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senhaHash: undefined }),
      }),
    );
  });
});

describe("PATCH /api/admin/usuarios/[id]", () => {
  const editar = (json: unknown, id = "u1") =>
    PATCH(requisicao("http://x", { method: "PATCH", json }), ctx(id));

  it("recusa usuário inexistente", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await editar(FORMULARIO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Usuário não encontrado." });
  });

  it("recusa e-mail que já é de outra conta", async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: "u1" });
    prisma.usuario.findFirst.mockResolvedValue({ id: "u2" });

    const res = await editar(FORMULARIO);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Já existe um usuário"),
    });
  });

  it("grava os campos do formulário e o perfil", async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: "u1" });
    prisma.usuario.findFirst.mockResolvedValue(null);

    const res = await editar({ ...FORMULARIO, role: "curator", ativo: false });

    expect(res.status).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        nomeCompleto: "Marina Costa",
        email: "marina@teste.com",
        selo: "Ouro",
        ativo: false,
      },
    });
    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { usuarioId: "u1", perfil: "curador" } }),
    );
  });
});

describe("DELETE /api/admin/usuarios/[id]", () => {
  const excluir = (id: string) =>
    DELETE(requisicao("http://x", { method: "DELETE" }), ctx(id));

  it("impede o admin de excluir a própria conta", async () => {
    const sessao = sessaoFalsa({ role: "admin" });
    exigirCapacidade.mockResolvedValue(sessao);

    const res = await excluir(sessao.id);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("própria conta"),
    });
    expect(prisma.usuario.delete).not.toHaveBeenCalled();
  });

  it("recusa id que não existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await excluir("u9");

    expect(res.status).toBe(400);
    expect(prisma.usuario.delete).not.toHaveBeenCalled();
  });

  it("exclui e responde ok", async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: "u9" });

    const res = await excluir("u9");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(prisma.usuario.delete).toHaveBeenCalledWith({ where: { id: "u9" } });
  });
});
