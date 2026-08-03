import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { lerDadosCorporativos, validarDadosCorporativos } from "@/lib/cadastro";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { sendAcessoPlataformaEmail } from "@/services/email.service";
import { PerfilUsuario } from "@/types";

export const runtime = "nodejs";

/**
 * Conclui o cadastro de quem entrou pelo Google.
 *
 * O fluxo OAuth cria a conta com nome e e-mail e nada mais: empresa, cargo e
 * celular — obrigatórios no formulário — não passam por lá, e a conta nasce
 * sem senha, já que o login é pelo próprio Google. Esta rota fecha as pontas:
 * grava o vínculo corporativo, concede o perfil `participante` e gera a senha
 * provisória do primeiro acesso, mandando-a para o e-mail da conta.
 */
export async function POST(req: Request) {
  try {
    const sessao = await auth.api.getSession({ headers: req.headers });
    if (!sessao?.user?.id) {
      return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
    }

    const dados = lerDadosCorporativos(await req.json());
    const erro = validarDadosCorporativos(dados);
    if (erro) {
      return NextResponse.json({ error: erro }, { status: 400 });
    }

    const usuarioId = sessao.user.id;
    const email = sessao.user.email;
    const nome = sessao.user.name || email;

    // Quem já tem senha (cadastrou-se antes pelo formulário e agora ligou o
    // Google) não pode ter a senha trocada por baixo dos panos — a que já foi
    // enviada por e-mail continua valendo.
    const credencial = await prisma.account.findFirst({
      where: { userId: usuarioId, providerId: "credential", password: { not: null } },
      select: { password: true },
    });

    let emailEnviado: boolean | undefined;
    let senhaHash = credencial?.password ?? undefined;

    if (!credencial) {
      const senha = gerarSenhaProvisoria();
      // `setPassword` cria a credencial de e-mail/senha para uma conta que só
      // tinha login social.
      await auth.api.setPassword({ body: { newPassword: senha }, headers: req.headers });

      const nova = await prisma.account.findFirst({
        where: { userId: usuarioId, providerId: "credential" },
        select: { password: true },
      });
      senhaHash = nova?.password ?? undefined;

      const envio = await sendAcessoPlataformaEmail({ nome, email, senha });
      emailEnviado = envio.success;
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          telefone: dados.phone,
          empresaNome: dados.empresa,
          cargo: dados.cargo,
          voucher: dados.voucher || null,
          senhaHash,
        },
      }),
      prisma.usuarioPerfil.upsert({
        where: {
          usuarioId_perfil: { usuarioId, perfil: PerfilUsuario.participante },
        },
        create: { usuarioId, perfil: PerfilUsuario.participante },
        update: {},
      }),
    ]);

    return NextResponse.json({ success: true, email, emailEnviado });
  } catch (error: any) {
    console.error("[api/cadastro/completar]", error);
    return NextResponse.json(
      { error: error?.message || "Não foi possível concluir o cadastro." },
      { status: 500 },
    );
  }
}
