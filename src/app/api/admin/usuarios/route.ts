import prisma from "@/lib/prisma";
import { auth, criarLinkDeTrocaDeSenha } from "@/lib/auth";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { sendAcessoPlataformaEmail } from "@/services/email.service";
import {
  SELECAO_USUARIO,
  aplicarPerfil,
  lerFormularioUsuario,
  usuarioParaJson,
} from "@/lib/usuarios-admin.server";

// Prisma e nodemailer não rodam no Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista as contas da plataforma, da mais recente para a mais antiga. */
export async function GET(req: Request) {
  return rotaAdmin("api/admin/usuarios GET", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const usuarios = await prisma.usuario.findMany({
      select: SELECAO_USUARIO,
      orderBy: { criadoEm: "desc" },
    });

    return { usuarios: usuarios.map(usuarioParaJson) };
  });
}

/**
 * Cria a conta pelo painel do Admin.
 *
 * Passa pelo MESMO caminho do cadastro público (`auth.api.signUpEmail` + senha
 * provisória por e-mail), e não por um `prisma.usuario.create` direto, para a
 * conta nascer com a credencial do Better Auth na tabela `account`. Uma conta
 * criada só na tabela `usuario` não teria senha nenhuma: a pessoa não
 * conseguiria entrar, e o convite por e-mail não teria o que confirmar.
 *
 * O perfil escolhido no formulário é aplicado depois — o gancho de criação do
 * Better Auth concede `gratuito` a toda conta nova, e aqui o Admin sobrepõe.
 */
export async function POST(req: Request) {
  return rotaAdmin("api/admin/usuarios POST", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const dados = lerFormularioUsuario(await req.json());

    const jaExiste = await prisma.usuario.findUnique({
      where: { email: dados.email },
      select: { id: true },
    });
    if (jaExiste) throw new ErroDeEntrada("Já existe um usuário com este e-mail.");

    const senha = gerarSenhaProvisoria();
    const cadastro = await auth.api.signUpEmail({
      body: { email: dados.email, password: senha, name: dados.nome },
    });
    const usuarioId = cadastro.user.id;

    const credencial = await prisma.account.findFirst({
      where: { userId: usuarioId, providerId: "credential" },
      select: { password: true },
    });

    const usuario = await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          selo: dados.selo,
          ativo: dados.ativo,
          senhaHash: credencial?.password ?? undefined,
          senhaProvisoriaHash: credencial?.password ?? undefined,
        },
      });

      await aplicarPerfil(tx, usuarioId, dados.role);

      return tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: SELECAO_USUARIO });
    });

    const envio = await sendAcessoPlataformaEmail({
      nome: dados.nome,
      email: dados.email,
      senha,
      linkCriarSenha: await criarLinkDeTrocaDeSenha(usuarioId),
    });

    return { usuario: usuarioParaJson(usuario), emailEnviado: envio.success };
  });
}
