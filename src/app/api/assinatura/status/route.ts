import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { confirmarPagamento } from "@/lib/premium.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { getPaymentStatus, isPago } from "@/services/asaas.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Status de uma cobrança — é o que a tela consulta enquanto aguarda o PIX ou o
 * boleto compensar.
 *
 * Em sandbox e em ambiente local o webhook do Asaas não chega, então esta rota
 * é a única confirmação que existe. A cobrança precisa ser da pessoa logada:
 * caso contrário o endpoint viraria um jeito de descobrir o status de
 * pagamentos alheios só chutando ids.
 */
export async function GET(req: Request) {
  return rotaAdmin("api/assinatura/status GET", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const paymentId = new URL(req.url).searchParams.get("paymentId");
    if (!paymentId) throw new ErroDeEntrada("paymentId é obrigatório.");

    const cobranca = await prisma.assinaturaPlataforma.findFirst({
      where: { asaasPaymentId: paymentId, usuarioId: sessao.id },
      select: { id: true },
    });
    if (!cobranca) throw new ErroDeEntrada("Cobrança não encontrada.");

    const status = await getPaymentStatus(paymentId);
    const pago = isPago(status);

    if (pago) await confirmarPagamento(paymentId);

    return { status, pago };
  });
}
