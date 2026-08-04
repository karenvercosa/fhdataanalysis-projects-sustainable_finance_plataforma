import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { confirmarPagamento } from "@/lib/premium.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { telefoneNacional } from "@/lib/telefone";
import { isPago, payWithCreditCard } from "@/services/asaas.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paga com cartão a cobrança aberta em `/api/assinatura/iniciar`.
 *
 * O `paymentId` é conferido contra o BANCO antes de ir ao Asaas: sem isso,
 * qualquer pessoa logada poderia pagar (e ativar) a cobrança de outra, ou
 * disparar tokenizações de cartão em cobranças que não são da plataforma.
 */
export async function POST(req: Request) {
  return rotaAdmin("api/assinatura/pagar-cartao POST", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const corpo = (await req.json().catch(() => ({}))) as any;
    const paymentId = texto(corpo?.paymentId);
    const card = corpo?.card;
    const titular = corpo?.titular ?? {};

    if (!paymentId || !card?.number || !card?.holderName) {
      throw new ErroDeEntrada("Dados do cartão incompletos.");
    }

    const cobranca = await prisma.assinaturaPlataforma.findFirst({
      where: { asaasPaymentId: paymentId, usuarioId: sessao.id },
      select: { id: true },
    });
    if (!cobranca) throw new ErroDeEntrada("Cobrança não encontrada.");

    // IP de origem (exigido pelo Asaas na tokenização do cartão).
    const remoteIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const payment = await payWithCreditCard({
      paymentId,
      card,
      titular: {
        name: texto(titular?.name) || sessao.nome,
        email: sessao.email,
        // O Asaas exige o CPF do titular sempre — inclusive no internacional.
        cpfCnpj: texto(titular?.cpfCnpj).replace(/\D/g, "") || undefined,
        postalCode: texto(titular?.postalCode) || undefined,
        addressNumber: texto(titular?.addressNumber) || undefined,
        // O celular chega em E.164 do seletor de país; o Asaas quer o número
        // nacional em `creditCardHolderInfo.phone`.
        phone: telefoneNacional(texto(titular?.phone)),
      },
      remoteIp,
    });

    const pago = isPago(payment.status);
    if (pago) await confirmarPagamento(paymentId);

    return { status: payment.status, pago };
  });
}
