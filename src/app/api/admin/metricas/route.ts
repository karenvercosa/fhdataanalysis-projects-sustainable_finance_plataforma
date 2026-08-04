import prisma from "@/lib/prisma";
import { rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { PerfilUsuario, type MetricasAdmin } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quantos interesses aparecem no gráfico de matchmaking. */
const TOP_INTERESSES = 6;

/**
 * Números do painel do Admin, contados no banco.
 *
 * Substituem os KPIs que eram texto fixo no código ("1.284 inscritos") e o
 * gráfico de interesses que vinha de uma lista inventada. Agora cada número
 * responde por uma linha real: se a plataforma tem 3 contas, o painel mostra 3.
 *
 * O top de interesses é o que a tabela `usuario_interesse` permite: é a
 * primeira métrica de audiência de verdade da plataforma.
 */
export async function GET(req: Request) {
  return rotaAdmin("api/admin/metricas GET", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const [
      inscritos,
      premium,
      vouchersAtivos,
      resgatesAprovados,
      resgatesPendentes,
      assinaturasAtivas,
      porInteresse,
      curadores,
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuarioPerfil.count({ where: { perfil: PerfilUsuario.participante } }),
      prisma.voucher.count({ where: { ativo: true } }),
      prisma.voucherResgate.count({ where: { status: "aprovado" } }),
      prisma.voucherResgate.count({ where: { status: "pendente" } }),
      prisma.assinaturaPlataforma.count({ where: { status: "ativa" } }),
      prisma.usuarioInteresse.groupBy({
        by: ["interesseId"],
        _count: { interesseId: true },
        orderBy: { _count: { interesseId: "desc" } },
        take: TOP_INTERESSES,
      }),
      prisma.usuario.findMany({
        where: { perfis: { some: { perfil: PerfilUsuario.curador } } },
        select: {
          id: true,
          nomeCompleto: true,
          email: true,
          empresaNome: true,
          ativo: true,
          vouchersDoCurador: {
            select: { id: true, usosFeitos: true },
          },
        },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    // O `groupBy` devolve ids; os nomes vêm numa segunda consulta para o
    // gráfico não precisar de um join que o Prisma não faz em agregação.
    const nomes = porInteresse.length
      ? await prisma.interesse.findMany({
          where: { id: { in: porInteresse.map((i) => i.interesseId) } },
          select: { id: true, nome: true },
        })
      : [];
    const nomePorId = new Map(nomes.map((i) => [i.id, i.nome]));

    const corpo: MetricasAdmin = {
      inscritos,
      premium,
      vouchersAtivos,
      resgatesAprovados,
      resgatesPendentes,
      assinaturasAtivas,
      topInteresses: porInteresse.map((i) => ({
        nome: nomePorId.get(i.interesseId) ?? "—",
        total: i._count.interesseId,
      })),
      curadores: curadores.map((c) => ({
        id: c.id,
        nome: c.nomeCompleto ?? c.email,
        email: c.email,
        empresa: c.empresaNome,
        ativo: c.ativo,
        vouchers: c.vouchersDoCurador.length,
        convitesUsados: c.vouchersDoCurador.reduce((s, v) => s + v.usosFeitos, 0),
      })),
    };

    return { metricas: corpo };
  });
}
