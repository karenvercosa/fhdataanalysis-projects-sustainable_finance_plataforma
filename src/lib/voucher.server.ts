import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ErroDeEntrada } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { TipoVoucher, type VoucherAdmin } from "@/types";

/**
 * ============================================================================
 *  VOUCHERS — regras de servidor
 * ============================================================================
 *
 * O voucher é o convite corporativo: quem se cadastra com o código passa a
 * pertencer à empresa que o distribuiu. Por isso o resgate não é só um
 * contador — ele grava o vínculo (`usuario.voucher_id`) e copia a empresa
 * para o cadastro da pessoa.
 */

/** Formato devolvido às telas. `Decimal` não atravessa JSON: vira número. */
export function voucherParaJson(v: {
  id: string;
  codigo: string;
  tipo: TipoVoucher;
  valor: Prisma.Decimal | null;
  usosMaximos: number;
  usosFeitos: number;
  empresaNome: string;
  empresaCnpj: string | null;
  ativo: boolean;
}): VoucherAdmin {
  return {
    id: v.id,
    codigo: v.codigo,
    tipo: v.tipo,
    valor: v.valor === null ? null : Number(v.valor),
    usosMaximos: v.usosMaximos,
    usosFeitos: v.usosFeitos,
    empresaNome: v.empresaNome,
    empresaCnpj: v.empresaCnpj,
    ativo: v.ativo,
  };
}

export const SELECAO_VOUCHER = {
  id: true,
  codigo: true,
  tipo: true,
  valor: true,
  usosMaximos: true,
  usosFeitos: true,
  empresaNome: true,
  empresaCnpj: true,
  ativo: true,
} as const;

/** Normaliza o código digitado: sem espaços nas pontas e sempre em maiúsculas. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

const TIPOS_VALIDOS = Object.values(TipoVoucher) as string[];

/**
 * Valida e normaliza o formulário de voucher do Admin.
 *
 * O código é guardado em maiúsculas para que a busca no cadastro seja exata:
 * quem digitar `verde2026` encontra o mesmo voucher de `VERDE2026`, sem
 * depender de comparação insensível a maiúsculas no banco.
 */
export function lerFormularioVoucher(body: any) {
  const codigo = normalizarCodigo(texto(body?.codigo));
  const tipo = texto(body?.tipo) as TipoVoucher;
  const empresaNome = texto(body?.empresaNome);
  const empresaCnpj = texto(body?.empresaCnpj);
  const usosMaximos = Number(body?.usosMaximos);
  const valorBruto = body?.valor;

  if (!codigo) throw new ErroDeEntrada("Informe o código do voucher.");
  if (codigo.length > 60) throw new ErroDeEntrada("O código deve ter no máximo 60 caracteres.");
  if (!TIPOS_VALIDOS.includes(tipo)) throw new ErroDeEntrada("Tipo de voucher inválido.");
  if (!empresaNome) throw new ErroDeEntrada("Informe a empresa dona do voucher.");
  if (!Number.isInteger(usosMaximos) || usosMaximos < 1) {
    throw new ErroDeEntrada("Os usos máximos devem ser um número inteiro maior que zero.");
  }

  // O voucher gratuito não tem valor: guardar um número ali só criaria a
  // dúvida de qual dos dois manda na hora de aplicar o desconto.
  let valor: number | null = null;
  if (tipo !== TipoVoucher.gratuito) {
    valor = Number(valorBruto);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new ErroDeEntrada("Informe o valor do desconto.");
    }
    if (tipo === TipoVoucher.descontoPercentual && valor > 100) {
      throw new ErroDeEntrada("O desconto percentual não pode passar de 100%.");
    }
  }

  return {
    codigo,
    tipo,
    valor,
    usosMaximos,
    empresaNome,
    empresaCnpj: empresaCnpj || null,
    ativo: body?.ativo !== false,
  };
}

/**
 * O código serve? Conferência somente-leitura, feita ANTES de criar a conta.
 *
 * Existe para não deixar um cadastro pela metade: se a validação do voucher
 * acontecesse só no resgate, um código digitado errado abortaria o cadastro
 * com a conta já criada — e a segunda tentativa esbarraria em "e-mail já
 * cadastrado", sem saída. O resgate de verdade continua sendo o
 * `resgatarVoucher`, que é quem decide de fato (esta checagem pode ficar
 * desatualizada se o último uso for consumido no meio do caminho).
 */
export async function voucherUtilizavel(codigo: string): Promise<boolean> {
  const normalizado = normalizarCodigo(codigo);
  if (!normalizado) return false;

  const voucher = await prisma.voucher.findUnique({
    where: { codigo: normalizado },
    select: { ativo: true, usosMaximos: true, usosFeitos: true },
  });

  return Boolean(voucher?.ativo && voucher.usosFeitos < voucher.usosMaximos);
}

/**
 * Resgata o voucher para um usuário, dentro de uma transação.
 *
 * A contagem de usos e o vínculo precisam cair juntos, e a checagem do limite
 * precisa acontecer no mesmo passo do incremento: o `updateMany` com
 * `usosFeitos < usosMaximos` no filtro faz o próprio banco recusar o resgate
 * que estouraria a cota, sem a janela de corrida que um "lê e depois grava"
 * abriria entre dois cadastros simultâneos.
 *
 * Devolve a empresa dona quando o resgate valeu, ou `null` quando o código não
 * existe, está inativo ou esgotou.
 */
export async function resgatarVoucher(
  usuarioId: string,
  codigo: string,
): Promise<{ empresaNome: string } | null> {
  const normalizado = normalizarCodigo(codigo);
  if (!normalizado) return null;

  return prisma.$transaction(async (tx) => {
    const voucher = await tx.voucher.findUnique({
      where: { codigo: normalizado },
      select: { id: true, empresaNome: true, ativo: true, usosMaximos: true },
    });

    if (!voucher?.ativo) return null;

    const consumido = await tx.voucher.updateMany({
      where: { id: voucher.id, ativo: true, usosFeitos: { lt: voucher.usosMaximos } },
      data: { usosFeitos: { increment: 1 } },
    });

    if (consumido.count === 0) return null;

    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        voucherId: voucher.id,
        voucher: normalizado,
        // O vínculo pedido: a empresa da pessoa passa a ser a dona do voucher.
        empresaNome: voucher.empresaNome,
      },
    });

    return { empresaNome: voucher.empresaNome };
  });
}
