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

const { GET } = await import("@/app/api/admin/metricas/route");

/** Todos os contadores respondem o mesmo número, salvo quando o teste manda outro. */
function contadores(valor = 0) {
  prisma.usuario.count.mockResolvedValue(valor);
  prisma.usuarioPerfil.count.mockResolvedValue(valor);
  prisma.voucher.count.mockResolvedValue(valor);
  prisma.voucherResgate.count.mockResolvedValue(valor);
  prisma.assinaturaPlataforma.count.mockResolvedValue(valor);
  prisma.usuarioInteresse.groupBy.mockResolvedValue([]);
  prisma.usuario.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  exigirCapacidade.mockReset().mockResolvedValue(sessaoFalsa({ role: "admin" }));
  contadores();
});

describe("GET /api/admin/metricas", () => {
  it("exige a capacidade de gestão da plataforma", async () => {
    await GET(requisicao("http://x/api/admin/metricas"));
    expect(exigirCapacidade).toHaveBeenCalledWith(expect.anything(), "manage:platform");
  });

  it("devolve os contadores vindos do banco", async () => {
    contadores(7);

    const { metricas } = await (await GET(requisicao("http://x"))).json();

    expect(metricas).toMatchObject({
      inscritos: 7,
      premium: 7,
      vouchersAtivos: 7,
      assinaturasAtivas: 7,
      topInteresses: [],
      curadores: [],
    });
  });

  it("não consulta nomes quando não há interesse nenhum", async () => {
    await GET(requisicao("http://x"));
    expect(prisma.interesse.findMany).not.toHaveBeenCalled();
  });

  it("junta o nome do interesse ao total agrupado", async () => {
    prisma.usuarioInteresse.groupBy.mockResolvedValue([
      { interesseId: "i1", _count: { interesseId: 4 } },
      { interesseId: "i2", _count: { interesseId: 1 } },
    ]);
    prisma.interesse.findMany.mockResolvedValue([{ id: "i1", nome: "Energia" }]);

    const { metricas } = await (await GET(requisicao("http://x"))).json();

    expect(metricas.topInteresses).toEqual([
      { nome: "Energia", total: 4 },
      // Sem nome correspondente, o gráfico mostra o travessão em vez de quebrar.
      { nome: "—", total: 1 },
    ]);
  });

  it("resume os vouchers de cada curador", async () => {
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: "c1",
        nomeCompleto: "Curadoria S.A.",
        email: "c1@x.com",
        empresaNome: "ACME",
        ativo: true,
        vouchersDoCurador: [
          { id: "v1", usosFeitos: 3 },
          { id: "v2", usosFeitos: 2 },
        ],
      },
      {
        id: "c2",
        nomeCompleto: null,
        email: "c2@x.com",
        empresaNome: null,
        ativo: false,
        vouchersDoCurador: [],
      },
    ]);

    const { metricas } = await (await GET(requisicao("http://x"))).json();

    expect(metricas.curadores).toEqual([
      {
        id: "c1",
        nome: "Curadoria S.A.",
        email: "c1@x.com",
        empresa: "ACME",
        ativo: true,
        vouchers: 2,
        convitesUsados: 5,
      },
      // Sem nome cadastrado, o e-mail identifica a conta.
      {
        id: "c2",
        nome: "c2@x.com",
        email: "c2@x.com",
        empresa: null,
        ativo: false,
        vouchers: 0,
        convitesUsados: 0,
      },
    ]);
  });

  it("devolve 500 quando o banco falha", async () => {
    prisma.usuario.count.mockRejectedValue(new Error("banco fora"));

    expect((await GET(requisicao("http://x"))).status).toBe(500);
  });
});
