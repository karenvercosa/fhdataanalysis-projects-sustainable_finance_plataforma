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

const { GET, PUT } = await import("@/app/api/perfil/route");

const SESSAO = sessaoFalsa({ id: "u1" });

const REGISTRO = {
  nomeCompleto: "Marina",
  email: "marina@x.com",
  cargo: "CTO",
  empresaNome: "ACME",
  telefone: "+5562999998888",
  bio: "Bio",
  linkedinUrl: "https://linkedin.com/in/marina",
  avatarUrl: null,
  capaUrl: null,
  interesses: [{ interesseId: "i1" }],
};

const PNG = "data:image/png;base64,iVBORw0KGgo=";

const salvar = (json: unknown) => PUT(requisicao("http://x", { method: "PUT", json }));

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  exigirCapacidade.mockReset().mockResolvedValue(SESSAO);
  prisma.usuario.findUniqueOrThrow.mockResolvedValue(REGISTRO);
  prisma.interesse.findMany.mockResolvedValue([]);
});

describe("GET /api/perfil", () => {
  it("basta estar autenticado — o perfil é sempre o da sessão", async () => {
    await GET(requisicao("http://x/api/perfil"));

    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything());
    expect(prisma.usuario.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" } }),
    );
  });

  it("troca nulo por string vazia para o formulário não receber undefined", async () => {
    prisma.usuario.findUniqueOrThrow.mockResolvedValue({
      ...REGISTRO,
      nomeCompleto: null,
      cargo: null,
      empresaNome: null,
      telefone: null,
      bio: null,
      linkedinUrl: null,
      interesses: [],
    });

    const { perfil } = await (await GET(requisicao("http://x"))).json();

    expect(perfil).toEqual({
      nome: "",
      email: "marina@x.com",
      cargo: "",
      empresa: "",
      telefone: "",
      bio: "",
      linkedin: "",
      foto: "",
      capa: "",
      interesseIds: [],
    });
  });
});

describe("PUT /api/perfil", () => {
  it("recusa bio acima do limite", async () => {
    const res = await salvar({ bio: "a".repeat(2001) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("2000 caracteres"),
    });
  });

  it("recusa LinkedIn que não é http(s) — bloqueia javascript: no perfil", async () => {
    const res = await salvar({ linkedin: "javascript:alert(1)" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("http://"),
    });
  });

  it("recusa imagem que não é data URL de imagem", async () => {
    const res = await salvar({ foto: "https://exemplo.com/rastreio.png" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("foto de perfil"),
    });
  });

  it("recusa imagem grande demais", async () => {
    const grande = `data:image/png;base64,${"a".repeat(2_000_001)}`;

    const res = await salvar({ capa: grande });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("grande demais"),
    });
  });

  it("aceita data URL de imagem e string vazia como remoção", async () => {
    const res = await salvar({ foto: PNG, capa: "" });

    expect(res.status).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avatarUrl: PNG, capaUrl: null }),
      }),
    );
  });

  it("grava campos vazios como ausência, e não como string vazia", async () => {
    await salvar({ cargo: "", empresa: "", telefone: "", bio: "" });

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cargo: null,
          empresaNome: null,
          telefone: null,
          bio: null,
          linkedinUrl: null,
        }),
      }),
    );
  });

  it("substitui os interesses por inteiro — desmarcar apaga a linha", async () => {
    prisma.interesse.findMany.mockResolvedValue([{ id: "i1" }, { id: "i2" }]);

    await salvar({ interesseIds: ["i1", "i2"] });

    expect(prisma.usuarioInteresse.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1" },
    });
    expect(prisma.usuarioInteresse.createMany).toHaveBeenCalledWith({
      data: [
        { usuarioId: "u1", interesseId: "i1" },
        { usuarioId: "u1", interesseId: "i2" },
      ],
    });
  });

  it("ignora id de interesse inventado — só entra o que existe e está ativo", async () => {
    prisma.interesse.findMany.mockResolvedValue([]);

    await salvar({ interesseIds: ["inventado"] });

    expect(prisma.interesse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["inventado"] }, ativo: true } }),
    );
    expect(prisma.usuarioInteresse.createMany).not.toHaveBeenCalled();
  });

  it("descarta itens que não são texto na lista de interesses", async () => {
    await salvar({ interesseIds: [1, null, { id: "x" }] });

    expect(prisma.interesse.findMany).not.toHaveBeenCalled();
  });

  it("não consulta interesses quando o campo não é uma lista", async () => {
    await salvar({ interesseIds: "i1" });

    expect(prisma.interesse.findMany).not.toHaveBeenCalled();
    expect(prisma.usuarioInteresse.deleteMany).toHaveBeenCalled();
  });

  it("não deixa o e-mail ser trocado por este caminho", async () => {
    await salvar({ email: "outro@x.com" });

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ email: expect.anything() }) }),
    );
  });

  it("aguenta corpo que não é JSON", async () => {
    const res = await PUT(new Request("http://x", { method: "PUT", body: "x" }));
    expect(res.status).toBe(200);
  });
});
