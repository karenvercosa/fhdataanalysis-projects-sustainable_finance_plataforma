import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { sessaoFalsa, requisicao } from "@/test/sessao";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const exigirCapacidade = vi.fn();
vi.mock("@/lib/rbac.server", async (real) => ({
  ...(await real<typeof import("@/lib/rbac.server")>()),
  exigirCapacidade: (...args: unknown[]) => exigirCapacidade(...args),
}));

const { GET, POST } = await import("@/app/api/interesses/route");
const { DELETE } = await import("@/app/api/interesses/[id]/route");

beforeEach(() => {
  limparPrismaFalso(prisma);
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa({ role: "admin" }));
});

describe("GET /api/interesses", () => {
  it("é PÚBLICO — o formulário de cadastro precisa dele sem sessão", async () => {
    prisma.interesse.findMany.mockResolvedValue([{ id: "i1", nome: "ESG" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ interesses: [{ id: "i1", nome: "ESG" }] });
    // Não pode exigir sessão: quem se cadastra ainda não tem conta.
    expect(exigirCapacidade).not.toHaveBeenCalled();
  });

  it("devolve só os temas ativos, na ordem definida pelo Admin", async () => {
    prisma.interesse.findMany.mockResolvedValue([]);
    await GET();
    expect(prisma.interesse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ativo: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
    );
  });
});

describe("POST /api/interesses", () => {
  it("exige a capacidade de gestão", async () => {
    prisma.interesse.findFirst.mockResolvedValue(null);
    prisma.interesse.findFirst.mockResolvedValueOnce(null);
    prisma.interesse.create.mockResolvedValue({ id: "i9", nome: "Novo" });

    await POST(requisicao("http://x/api/interesses", { json: { nome: "Novo" } }));

    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything(), "manage:platform");
  });

  it("recusa nome vazio", async () => {
    const res = await POST(requisicao("http://x/api/interesses", { json: { nome: "   " } }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("nome") });
  });

  it("recusa nome longo demais", async () => {
    const res = await POST(
      requisicao("http://x/api/interesses", { json: { nome: "x".repeat(81) } }),
    );
    expect(res.status).toBe(400);
  });

  it("reativa em vez de duplicar quando o tema já existiu", async () => {
    prisma.interesse.findFirst.mockResolvedValue({ id: "i1", nome: "ESG", ativo: false });

    const res = await POST(requisicao("http://x/api/interesses", { json: { nome: "esg" } }));

    expect(prisma.interesse.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { ativo: true },
    });
    expect(prisma.interesse.create).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({ interesse: { id: "i1", nome: "ESG" } });
  });

  it("compara sem diferenciar maiúsculas — ESG e esg são o mesmo tema", async () => {
    prisma.interesse.findFirst.mockResolvedValue({ id: "i1", nome: "ESG", ativo: true });
    await POST(requisicao("http://x/api/interesses", { json: { nome: "esg" } }));
    expect(prisma.interesse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { nome: { equals: "esg", mode: "insensitive" } },
      }),
    );
  });

  it("põe o tema novo no fim da nuvem", async () => {
    prisma.interesse.findFirst
      .mockResolvedValueOnce(null) // busca por nome
      .mockResolvedValueOnce({ ordem: 7 }); // último da lista
    prisma.interesse.create.mockResolvedValue({ id: "i9", nome: "Novo" });

    await POST(requisicao("http://x/api/interesses", { json: { nome: "Novo" } }));

    expect(prisma.interesse.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nome: "Novo", ordem: 8 } }),
    );
  });
});

describe("DELETE /api/interesses/[id]", () => {
  it("DESATIVA em vez de apagar — o histórico dos relatórios não pode sumir", async () => {
    prisma.interesse.findUnique.mockResolvedValue({ id: "i1" });

    const res = await DELETE(requisicao("http://x", { method: "DELETE" }), { params: { id: "i1" } });

    expect(res.status).toBe(200);
    expect(prisma.interesse.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { ativo: false },
    });
    expect(prisma.interesse.delete).not.toHaveBeenCalled();
  });

  it("404 lógico quando o tema não existe", async () => {
    prisma.interesse.findUnique.mockResolvedValue(null);
    const res = await DELETE(requisicao("http://x", { method: "DELETE" }), { params: { id: "x" } });
    expect(res.status).toBe(400);
  });
});
