import prisma from "@/lib/prisma";
import { rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { type DadosParaPagamento } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O que a plataforma já sabe sobre quem vai pagar.
 *
 * A tela de "Seus dados" só pergunta o que FALTA: nome, e-mail, telefone,
 * empresa e cargo vêm do cadastro, e o formulário chega preenchido. O CPF é a
 * exceção — ele é guardado mascarado por privacidade (`139.***.***-**`), então
 * não há como recuperá-lo; só quem já tem cliente no Asaas escapa de informá-lo
 * de novo.
 */
export async function GET(req: Request) {
  return rotaAdmin("api/assinatura/dados GET", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: sessao.id },
      select: {
        nomeCompleto: true,
        email: true,
        telefone: true,
        empresaNome: true,
        cargo: true,
        asaasCustomerId: true,
      },
    });

    const corpo: DadosParaPagamento = {
      nome: usuario.nomeCompleto ?? "",
      email: usuario.email,
      telefone: usuario.telefone ?? "",
      empresa: usuario.empresaNome ?? "",
      cargo: usuario.cargo ?? "",
      precisaCpf: !usuario.asaasCustomerId,
      // `guest` é o Plano Gratuito; qualquer outro papel já tem acesso.
      jaEhPremium: sessao.role !== "guest",
    };

    return { dados: corpo };
  });
}
