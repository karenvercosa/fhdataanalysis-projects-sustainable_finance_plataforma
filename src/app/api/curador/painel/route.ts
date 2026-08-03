import prisma from "@/lib/prisma";
import { rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { SELECAO_VOUCHER, voucherParaJson } from "@/lib/voucher.server";
import { type PainelCurador } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Painel do curador/patrocinador: os vouchers dele e quem os resgatou.
 *
 * O recorte é sempre `curadorId = sessão`, resolvido no servidor — a tela não
 * manda de quem quer ver os dados. Um curador nunca enxerga o voucher de
 * outro, nem os resgates alheios.
 */
export async function GET(req: Request) {
  return rotaAdmin("api/curador/painel GET", async () => {
    const sessao = await exigirCapacidade(req.headers, "view:curator-dashboard");

    const [vouchers, resgates] = await Promise.all([
      prisma.voucher.findMany({
        where: { curadorId: sessao.id },
        select: SELECAO_VOUCHER,
        orderBy: { criadoEm: "desc" },
      }),
      prisma.voucherResgate.findMany({
        where: { voucher: { curadorId: sessao.id } },
        select: {
          id: true,
          status: true,
          criadoEm: true,
          voucher: { select: { codigo: true } },
          usuario: {
            select: { nomeCompleto: true, email: true, empresaNome: true, cargo: true },
          },
        },
        // Pendentes primeiro: são os que exigem uma decisão.
        orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
      }),
    ]);

    const corpo: PainelCurador = {
      vouchers: vouchers.map(voucherParaJson),
      resgates: resgates.map((r) => ({
        id: r.id,
        status: r.status,
        criadoEm: r.criadoEm.toISOString(),
        voucherCodigo: r.voucher.codigo,
        pessoaNome: r.usuario.nomeCompleto ?? r.usuario.email,
        pessoaEmail: r.usuario.email,
        pessoaEmpresa: r.usuario.empresaNome,
        pessoaCargo: r.usuario.cargo,
      })),
    };

    return corpo;
  });
}
