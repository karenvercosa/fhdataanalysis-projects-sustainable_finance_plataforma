import "server-only";

import prisma from "@/lib/prisma";
import { PerfilUsuario } from "@/types";

/**
 * Promoção a Participante Premium depois de um pagamento confirmado.
 *
 * É o mesmo destino do voucher aprovado pelo curador, mas por outro caminho: o
 * dinheiro entrou. Vale tanto para a assinatura anual quanto para o ingresso
 * presencial — os dois compram acesso completo.
 *
 * Idempotente de propósito: a confirmação chega por três vias que podem se
 * cruzar (retorno do cartão, polling do PIX/boleto e webhook do Asaas), então
 * a função é chamada mais de uma vez para o mesmo pagamento.
 *
 * Só mexe em quem está no Plano Gratuito: um palestrante, curador ou admin que
 * assine não pode ser rebaixado ao perfil de participante.
 */
export async function promoverPorPagamento(usuarioId: string): Promise<void> {
  const perfis = await prisma.usuarioPerfil.findMany({
    where: { usuarioId },
    select: { perfil: true },
  });

  const somenteGratuito =
    perfis.length === 0 || perfis.every((p) => p.perfil === PerfilUsuario.gratuito);

  if (!somenteGratuito) return;

  await prisma.$transaction([
    prisma.usuarioPerfil.deleteMany({ where: { usuarioId, perfil: PerfilUsuario.gratuito } }),
    prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfil: { usuarioId, perfil: PerfilUsuario.participante },
      },
      create: { usuarioId, perfil: PerfilUsuario.participante },
      update: {},
    }),
  ]);
}

/**
 * Marca a cobrança como paga e promove quem pagou.
 *
 * Concentra o "depois do pagamento" num lugar só: as três vias de confirmação
 * (cartão, polling e webhook) chamam esta função, então a regra de virar
 * Premium não pode divergir entre elas.
 *
 * Devolve `false` quando o `paymentId` não é de nenhuma cobrança conhecida —
 * é o caso de um webhook para uma cobrança de outra aplicação que compartilha
 * a mesma conta do Asaas (a landing page, por exemplo).
 */
export async function confirmarPagamento(paymentId: string): Promise<boolean> {
  const assinatura = await prisma.assinaturaPlataforma.findFirst({
    where: { asaasPaymentId: paymentId },
    select: { id: true, usuarioId: true, status: true },
  });

  if (!assinatura) return false;

  if (assinatura.status !== "ativa") {
    await prisma.assinaturaPlataforma.update({
      where: { id: assinatura.id },
      data: { status: "ativa" },
    });
  }

  await promoverPorPagamento(assinatura.usuarioId);
  return true;
}
