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

const { GET, PUT } = await import("@/app/api/cotas/route");

const RECURSOS_OURO = {
  topBanner: true, about: true, showPhone: true, showEmail: true,
  showLinkedin: true, materialUpload: true, featuredVideo: true, scheduleMeeting: true,
};

beforeEach(() => {
  limparPrismaFalso(prisma);
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa({ role: "admin" }));
});

describe("GET /api/cotas", () => {
  it("basta estar autenticado — a matriz decide o perfil de todo mundo", async () => {
    prisma.cotaPlataforma.findMany.mockResolvedValue([]);
    await GET(requisicao("http://x/api/cotas"));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything());
  });

  it("normaliza recurso ausente para false em vez de undefined", async () => {
    prisma.cotaPlataforma.findMany.mockResolvedValue([
      { id: "c1", nome: "Bronze", recursos: { about: true } },
    ]);

    const { matriz } = await (await GET(requisicao("http://x/api/cotas"))).json();

    expect(matriz[0].features).toMatchObject({ about: true, topBanner: false, showPhone: false });
  });

  it("descarta chave desconhecida vinda do JSON", async () => {
    prisma.cotaPlataforma.findMany.mockResolvedValue([
      { id: "c1", nome: "Bronze", recursos: { about: true, recursoInventado: true } },
    ]);

    const { matriz } = await (await GET(requisicao("http://x/api/cotas"))).json();

    expect(matriz[0].features).not.toHaveProperty("recursoInventado");
  });

  it("aguenta recursos nulo sem quebrar", async () => {
    prisma.cotaPlataforma.findMany.mockResolvedValue([{ id: "c1", nome: "X", recursos: null }]);
    const res = await GET(requisicao("http://x/api/cotas"));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/cotas", () => {
  it("exige a capacidade de gestão", async () => {
    prisma.cotaPlataforma.findMany.mockResolvedValue([]);
    await PUT(requisicao("http://x/api/cotas", {
      method: "PUT",
      json: { matriz: [{ id: "c1", name: "Ouro", features: RECURSOS_OURO }] },
    }));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything(), "manage:platform");
  });

  it("recusa matriz vazia ou que não é lista", async () => {
    for (const matriz of [[], null, "x"]) {
      const res = await PUT(requisicao("http://x", { method: "PUT", json: { matriz } }));
      expect(res.status).toBe(400);
    }
  });

  it("recusa cota sem nome", async () => {
    const res = await PUT(requisicao("http://x", {
      method: "PUT", json: { matriz: [{ id: "c1", name: "  ", features: {} }] },
    }));
    expect(res.status).toBe(400);
  });

  it("recusa dois nomes iguais — a cota é referenciada pelo selo", async () => {
    const res = await PUT(requisicao("http://x", {
      method: "PUT",
      json: { matriz: [{ id: "a", name: "Ouro", features: {} }, { id: "b", name: "ouro", features: {} }] },
    }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("mesmo nome") });
  });

  it("grava a ordem a partir da posição na lista", async () => {
    prisma.cotaPlataforma.findMany.mockResolvedValue([]);
    await PUT(requisicao("http://x", {
      method: "PUT",
      json: {
        matriz: [
          { id: "a", name: "Bronze", features: {} },
          { id: "b", name: "Ouro", features: RECURSOS_OURO },
        ],
      },
    }));

    const chamadas = prisma.cotaPlataforma.upsert.mock.calls;
    expect(chamadas[0][0].update).toMatchObject({ nome: "Bronze", ordem: 0 });
    expect(chamadas[1][0].update).toMatchObject({ nome: "Ouro", ordem: 1 });
  });
});
