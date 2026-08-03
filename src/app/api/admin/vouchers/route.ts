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

/** Lista os vouchers cadastrados, do mais recente para o mais antigo. */
export async function GET(req: Request) {
  return rotaAdmin("api/admin/vouchers GET", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const vouchers = await prisma.voucher.findMany({
      select: SELECAO_VOUCHER,
      orderBy: { criadoEm: "desc" },
    });

    return { vouchers: vouchers.map(voucherParaJson) };
  });
}

/** Cadastra um voucher corporativo. */
export async function POST(req: Request) {
  return rotaAdmin("api/admin/vouchers POST", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const dados = lerFormularioVoucher(await req.json());

    const jaExiste = await prisma.voucher.findUnique({
      where: { codigo: dados.codigo },
      select: { id: true },
    });
    if (jaExiste) throw new ErroDeEntrada("Já existe um voucher com este código.");

    const voucher = await prisma.voucher.create({
      data: dados,
      select: SELECAO_VOUCHER,
    });

    return { voucher: voucherParaJson(voucher) };
  });
}
