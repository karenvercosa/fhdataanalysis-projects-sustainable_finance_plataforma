import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { exigirCapacidade } from "@/lib/rbac.server";
import { sendSolicitacaoVouchersEmail } from "@/services/email.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Teto por pedido. Acima disso a conversa é comercial, não um formulário. */
const QUANTIDADE_MAXIMA = 1000;
const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 2000;

/**
 * Pedido de vouchers adicionais do curador/patrocinador.
 *
 * Não cria nem altera voucher nenhum: apenas manda o pedido por e-mail para o
 * time comercial. Quem decide é uma pessoa, e o voucher só aparece depois que
 * o Admin cadastrar — é por isso que a aba de Ingressos do curador virou um
 * formulário, e não um checkout.
 *
 * Nome, e-mail e empresa vêm da sessão e do banco, nunca do corpo enviado: o
 * pedido tem que identificar quem realmente está logado.
 */
export async function POST(req: Request) {
  return rotaAdmin("api/curador/solicitar-vouchers POST", async () => {
    const sessao = await exigirCapacidade(req.headers, "view:curator-dashboard");

    const corpo = await req.json().catch(() => ({}));
    const quantidade = Number((corpo as any)?.quantidade);
    const motivo = texto((corpo as any)?.motivo);

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw new ErroDeEntrada("Informe quantos vouchers a mais você precisa.");
    }
    if (quantidade > QUANTIDADE_MAXIMA) {
      throw new ErroDeEntrada(
        `Para mais de ${QUANTIDADE_MAXIMA} convites, fale direto com o time comercial.`,
      );
    }
    if (motivo.length < MOTIVO_MINIMO) {
      throw new ErroDeEntrada("Explique com um pouco mais de detalhe por que precisa deles.");
    }
    if (motivo.length > MOTIVO_MAXIMO) {
      throw new ErroDeEntrada(`A justificativa deve ter no máximo ${MOTIVO_MAXIMO} caracteres.`);
    }

    const perfil = await prisma.usuario.findUnique({
      where: { id: sessao.id },
      select: { empresaNome: true },
    });

    const envio = await sendSolicitacaoVouchersEmail({
      nome: sessao.nome,
      email: sessao.email,
      empresa: perfil?.empresaNome ?? null,
      quantidade,
      motivo,
    });

    if (!envio.success) {
      throw new ErroDeEntrada(
        "Não conseguimos enviar seu pedido agora. Tente novamente em instantes.",
      );
    }

    return { ok: true };
  });
}
