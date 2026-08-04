import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import {
  SELECAO_VOUCHER,
  lerFormularioVoucher,
  voucherParaJson,
} from "@/lib/voucher.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: { id: string } };

/** Edição de um voucher pelo painel do Admin. */
export async function PATCH(req: Request, { params }: Contexto) {
  return rotaAdmin("api/admin/vouchers PATCH", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const dados = lerFormularioVoucher(await req.json());

    const atual = await prisma.voucher.findUnique({
      where: { id: params.id },
      select: { usosFeitos: true },
    });
    if (!atual) throw new ErroDeEntrada("Voucher não encontrado.");

    // Baixar o limite abaixo do que já foi resgatado deixaria o voucher num
    // estado impossível (usos maiores que o máximo) e sem forma de corrigir.
    if (dados.usosMaximos < atual.usosFeitos) {
      throw new ErroDeEntrada(
        `Este voucher já teve ${atual.usosFeitos} resgate(s): o limite não pode ser menor que isso.`,
      );
    }

    const conflito = await prisma.voucher.findFirst({
      where: { codigo: dados.codigo, id: { not: params.id } },
      select: { id: true },
    });
    if (conflito) throw new ErroDeEntrada("Já existe um voucher com este código.");

    const voucher = await prisma.voucher.update({
      where: { id: params.id },
      data: dados,
      select: SELECAO_VOUCHER,
    });

    return { voucher: voucherParaJson(voucher) };
  });
}

/**
 * Exclui o voucher.
 *
 * Quem já se cadastrou com ele não é afetado: `usuario.voucher_id` fica nulo
 * pela regra `ON DELETE SET NULL`, e a empresa que a pessoa herdou continua
 * gravada em `usuario.empresa_nome`. Ainda assim, um voucher já usado guarda
 * histórico — desativar costuma ser melhor do que apagar, e é o que a tela
 * sugere.
 */
export async function DELETE(req: Request, { params }: Contexto) {
  return rotaAdmin("api/admin/vouchers DELETE", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const voucher = await prisma.voucher.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!voucher) throw new ErroDeEntrada("Voucher não encontrado.");

    await prisma.voucher.delete({ where: { id: params.id } });

    return { ok: true };
  });
}
