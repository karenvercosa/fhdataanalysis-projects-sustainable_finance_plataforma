import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ErroDeEntrada } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { apenasCnpj, cnpjCompleto, formatarCnpj } from "@/lib/cnpj";
import {
  PerfilUsuario,
  TipoVoucher,
  type StatusResgateVoucher,
  type VoucherAdmin,
} from "@/types";

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
  curadorId: string | null;
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
    curadorId: v.curadorId,
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
  curadorId: true,
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
  const cnpjBruto = texto(body?.empresaCnpj);
  const curadorId = texto(body?.curadorId);
  const usosMaximos = Number(body?.usosMaximos);
  const valorBruto = body?.valor;

  if (!codigo) throw new ErroDeEntrada("Informe o código do voucher.");
  if (codigo.length > 60) throw new ErroDeEntrada("O código deve ter no máximo 60 caracteres.");
  if (!TIPOS_VALIDOS.includes(tipo)) throw new ErroDeEntrada("Tipo de voucher inválido.");
  if (!empresaNome) throw new ErroDeEntrada("Informe a empresa dona do voucher.");
  if (!Number.isInteger(usosMaximos) || usosMaximos < 1) {
    throw new ErroDeEntrada("Os usos máximos devem ser um número inteiro maior que zero.");
  }

  // O CNPJ é opcional, mas se vier tem que estar completo — meio documento no
  // banco não identifica ninguém. A normalização é a mesma do formulário, para
  // o banco nunca guardar duas grafias do mesmo número.
  if (apenasCnpj(cnpjBruto) && !cnpjCompleto(cnpjBruto)) {
    throw new ErroDeEntrada("O CNPJ está incompleto — são 14 posições.");
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
    empresaCnpj: formatarCnpj(cnpjBruto) || null,
    curadorId: curadorId || null,
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
 * A contagem de usos e o registro do resgate precisam cair juntos, e a
 * checagem do limite precisa acontecer no mesmo passo do incremento: o
 * `updateMany` com `usosFeitos < usosMaximos` no filtro faz o próprio banco
 * recusar o resgate que estouraria a cota, sem a janela de corrida que um
 * "lê e depois grava" abriria entre dois cadastros simultâneos.
 *
 * O uso é RESERVADO já no pedido, mesmo quando ele fica pendente — caso
 * contrário um voucher de 10 convites poderia acumular 50 pedidos e o curador
 * aprovaria mais gente do que comprou. Negar devolve o uso à cota.
 *
 * Quem tem curador nasce `pendente` e ainda NÃO vale: o vínculo com a empresa
 * só é gravado na aprovação. Voucher institucional (sem curador) é aprovado na
 * hora, e aí sim a empresa é aplicada de imediato.
 *
 * Devolve `null` quando o código não existe, está inativo ou esgotou.
 */
export async function resgatarVoucher(
  usuarioId: string,
  codigo: string,
): Promise<{ empresaNome: string; status: StatusResgateVoucher } | null> {
  const normalizado = normalizarCodigo(codigo);
  if (!normalizado) return null;

  return prisma.$transaction(async (tx) => {
    const voucher = await tx.voucher.findUnique({
      where: { codigo: normalizado },
      select: {
        id: true,
        empresaNome: true,
        ativo: true,
        usosMaximos: true,
        curadorId: true,
        // Sem o tipo aqui, a exceção do `vinculo` logo abaixo não teria o que
        // checar — e a regra voltaria a ser "tem curador, então espera".
        tipo: true,
      },
    });

    if (!voucher?.ativo) return null;

    const consumido = await tx.voucher.updateMany({
      where: { id: voucher.id, ativo: true, usosFeitos: { lt: voucher.usosMaximos } },
      data: { usosFeitos: { increment: 1 } },
    });

    if (consumido.count === 0) return null;

    // Ter curador NÃO basta para exigir aprovação.
    //
    // O que o curador autoriza é o DESCONTO — é dinheiro dele. O voucher de
    // `vinculo` não abate nada: quem o usa paga o valor cheio, e o convite só
    // liga a pessoa à empresa. Não há o que autorizar, então ele entra na hora.
    //
    // Sem esta exceção, quem se cadastrava por aqui com um convite de vínculo
    // via "seu voucher foi enviado para aprovação" e ficava numa fila que não
    // deveria existir — enquanto a plataforma, que compartilha este banco, já
    // aplicava a regra certa desde 18/08. Eram duas cópias da mesma decisão, e
    // só uma tinha sido corrigida.
    const status: StatusResgateVoucher =
      voucher.curadorId && voucher.tipo !== TipoVoucher.vinculo ? "pendente" : "aprovado";

    await tx.voucherResgate.upsert({
      where: { voucherId_usuarioId: { voucherId: voucher.id, usuarioId } },
      create: {
        voucherId: voucher.id,
        usuarioId,
        status,
        decididoEm: status === "aprovado" ? new Date() : null,
      },
      update: { status, decididoEm: status === "aprovado" ? new Date() : null },
    });

    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        // O código declarado fica registrado dos dois jeitos; o VÍNCULO
        // (`voucherId` + empresa) só existe depois de aprovado.
        voucher: normalizado,
        ...(status === "aprovado"
          ? { voucherId: voucher.id, empresaNome: voucher.empresaNome }
          : {}),
      },
    });

    return { empresaNome: voucher.empresaNome, status };
  });
}

/** Cliente do Prisma ou o handle de uma transação — os dois servem. */
type ClienteResgate = Pick<typeof prisma, "usuarioPerfil" | "voucherResgate">;

/**
 * Promove a conta a Participante Premium ao aprovar o resgate.
 *
 * Só mexe em quem está no Plano Gratuito: um palestrante, curador ou admin que
 * por acaso resgate um voucher não pode ser rebaixado ao perfil de
 * participante. A troca é feita perfil a perfil porque `roleEfetivo` vale o
 * perfil mais poderoso — deixar `gratuito` para trás é o que muda o papel.
 */
async function promoverParaPremium(tx: ClienteResgate, usuarioId: string) {
  const perfis = await tx.usuarioPerfil.findMany({
    where: { usuarioId },
    select: { perfil: true },
  });

  // `every` já devolve true para lista vazia — o teste de tamanho era redundante.
  const somenteGratuito = perfis.every((p) => p.perfil === PerfilUsuario.gratuito);

  if (!somenteGratuito) return;

  await tx.usuarioPerfil.deleteMany({ where: { usuarioId, perfil: PerfilUsuario.gratuito } });
  await tx.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId, perfil: PerfilUsuario.participante } },
    create: { usuarioId, perfil: PerfilUsuario.participante },
    update: {},
  });
}

/**
 * Devolve a conta ao Plano Gratuito quando o resgate é negado ou desativado.
 *
 * O rebaixamento só acontece se o acesso Premium tiver vindo DESTE voucher: se
 * a pessoa ainda tem OUTRO resgate aprovado, ou um perfil concedido pela
 * organização, ela continua onde está.
 *
 * `resgateId` é excluído da busca de propósito: esta função roda antes de a
 * negação ser gravada, então o próprio resgate ainda consta como aprovado no
 * banco — sem o `not`, ele se contaria como "outro" e ninguém seria rebaixado.
 */
async function rebaixarParaGratuito(
  tx: ClienteResgate,
  usuarioId: string,
  resgateId: string,
) {
  const outroAprovado = await tx.voucherResgate.findFirst({
    where: { usuarioId, status: "aprovado", id: { not: resgateId } },
    select: { id: true },
  });
  if (outroAprovado) return;

  const perfis = await tx.usuarioPerfil.findMany({
    where: { usuarioId },
    select: { perfil: true },
  });

  const somenteParticipante = perfis.every((p) => p.perfil === PerfilUsuario.participante);
  if (!somenteParticipante) return;

  await tx.usuarioPerfil.deleteMany({ where: { usuarioId, perfil: PerfilUsuario.participante } });
  await tx.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId, perfil: PerfilUsuario.gratuito } },
    create: { usuarioId, perfil: PerfilUsuario.gratuito },
    update: {},
  });
}

/**
 * Aplica a decisão do curador sobre um resgate.
 *
 * As três transições que interessam:
 *
 *  - **aprovar** — grava o vínculo (`usuario.voucher_id` + empresa do voucher).
 *    Se o resgate estava negado, o uso volta a ser consumido da cota, e a
 *    aprovação é recusada quando não há convite sobrando.
 *  - **negar** — desfaz o vínculo e devolve o uso à cota. É também o botão
 *    "desativar" de quem já estava aprovado.
 *  - repetir a mesma decisão não faz nada, para um duplo clique não contar
 *    duas vezes na cota.
 *
 * `curadorId` não é confiança: a consulta exige que o voucher seja daquele
 * curador, então um id de resgate alheio simplesmente não é encontrado.
 */
export async function decidirResgate(
  curadorId: string,
  resgateId: string,
  decisao: Extract<StatusResgateVoucher, "aprovado" | "negado">,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  return prisma.$transaction(async (tx) => {
    const resgate = await tx.voucherResgate.findFirst({
      where: { id: resgateId, voucher: { curadorId } },
      select: {
        id: true,
        status: true,
        usuarioId: true,
        voucher: {
          select: { id: true, empresaNome: true, usosMaximos: true, usosFeitos: true },
        },
      },
    });

    if (!resgate) return { ok: false as const, erro: "Resgate não encontrado." };
    if (resgate.status === decisao) return { ok: true as const };

    const { voucher } = resgate;

    if (decisao === "aprovado") {
      // Só volta a consumir a cota quem estava negado — pendente já reservou.
      if (resgate.status === "negado") {
        if (voucher.usosFeitos >= voucher.usosMaximos) {
          return { ok: false as const, erro: "O voucher não tem convites disponíveis." };
        }
        await tx.voucher.update({
          where: { id: voucher.id },
          data: { usosFeitos: { increment: 1 } },
        });
      }

      await tx.usuario.update({
        where: { id: resgate.usuarioId },
        data: { voucherId: voucher.id, empresaNome: voucher.empresaNome },
      });

      // É a aprovação que transforma o convite em acesso: a conta sai do Plano
      // Gratuito e vira Participante Premium.
      await promoverParaPremium(tx, resgate.usuarioId);
    } else {
      // Negar devolve o convite para a cota — o uso deixa de existir.
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { usosFeitos: { decrement: 1 } },
      });

      await tx.usuario.update({
        where: { id: resgate.usuarioId },
        data: { voucherId: null },
      });

      await rebaixarParaGratuito(tx, resgate.usuarioId, resgate.id);
    }

    await tx.voucherResgate.update({
      where: { id: resgate.id },
      data: { status: decisao, decididoEm: new Date() },
    });

    return { ok: true as const };
  });
}
