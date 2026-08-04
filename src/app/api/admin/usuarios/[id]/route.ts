import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import {
  SELECAO_USUARIO,
  aplicarPerfil,
  lerFormularioUsuario,
  usuarioParaJson,
} from "@/lib/usuarios-admin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: { id: string } };

/** Edição de uma conta pelo painel do Admin. */
export async function PATCH(req: Request, { params }: Contexto) {
  return rotaAdmin("api/admin/usuarios PATCH", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const dados = lerFormularioUsuario(await req.json());

    const atual = await prisma.usuario.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!atual) throw new ErroDeEntrada("Usuário não encontrado.");

    // O e-mail é a chave de login: trocar para um já usado quebraria a conta
    // do outro. O banco tem o índice único, mas a mensagem sai melhor daqui.
    const conflito = await prisma.usuario.findFirst({
      where: { email: dados.email, id: { not: params.id } },
      select: { id: true },
    });
    if (conflito) throw new ErroDeEntrada("Já existe um usuário com este e-mail.");

    const usuario = await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: params.id },
        data: {
          nomeCompleto: dados.nome,
          email: dados.email,
          selo: dados.selo,
          ativo: dados.ativo,
        },
      });

      await aplicarPerfil(tx, params.id, dados.role);

      return tx.usuario.findUniqueOrThrow({ where: { id: params.id }, select: SELECAO_USUARIO });
    });

    return { usuario: usuarioParaJson(usuario) };
  });
}

/**
 * Exclui a conta.
 *
 * As tabelas dependentes (`account`, `session`, `usuario_perfil`, agenda...)
 * caem em cascata pelo próprio banco. O Admin não pode excluir a si mesmo: é o
 * jeito mais fácil de ficar sem nenhum administrador na plataforma.
 */
export async function DELETE(req: Request, { params }: Contexto) {
  return rotaAdmin("api/admin/usuarios DELETE", async () => {
    const sessao = await exigirCapacidade(req.headers, "manage:platform");

    if (sessao.id === params.id) {
      throw new ErroDeEntrada("Você não pode excluir a sua própria conta por aqui.");
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!usuario) throw new ErroDeEntrada("Usuário não encontrado.");

    await prisma.usuario.delete({ where: { id: params.id } });

    return { ok: true };
  });
}
