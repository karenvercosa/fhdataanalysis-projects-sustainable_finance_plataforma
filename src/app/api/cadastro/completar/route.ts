import { NextResponse } from "next/server";
import { auth, criarLinkDeTrocaDeSenha } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { lerDadosCorporativos, validarDadosCorporativos } from "@/lib/cadastro";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { resgatarVoucher, voucherUtilizavel } from "@/lib/voucher.server";
import { sendAcessoPlataformaEmail } from "@/services/email.service";

export const runtime = "nodejs";

/**
 * Conclui o cadastro de quem entrou pelo Google.
 *
 * O fluxo OAuth cria a conta com nome e e-mail e nada mais: empresa, cargo e
 * celular — obrigatórios no formulário — não passam por lá, e a conta nasce
 * sem senha, já que o login é pelo próprio Google. Esta rota fecha as pontas:
 * grava o vínculo corporativo e gera a senha provisória do primeiro acesso,
 * mandando-a para o e-mail da conta.
 *
 * O perfil não é concedido aqui: a conta já nasceu `gratuito` pelo gancho
 * `databaseHooks.user.create` em `src/lib/auth.ts`.
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

    // Voucher conferido antes de qualquer gravação, para o formulário poder
    // ser corrigido sem deixar o cadastro num estado intermediário.
    if (dados.voucher && !(await voucherUtilizavel(dados.voucher))) {
      return NextResponse.json(
        { error: "Voucher inválido, inativo ou esgotado. Confira o código com quem o enviou." },
        { status: 400 },
      );
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
    // Só marca "primeiro acesso pendente" quando a senha provisória é gerada
    // agora. Quem já tinha senha definitiva não volta para esse estado.
    let senhaProvisoriaHash: string | undefined;

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
      senhaProvisoriaHash = senhaHash;

      const envio = await sendAcessoPlataformaEmail({
        nome,
        email,
        senha,
        linkCriarSenha: await criarLinkDeTrocaDeSenha(usuarioId),
      });
      emailEnviado = envio.success;
    }

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        telefone: dados.phone,
        empresaNome: dados.empresa,
        cargo: dados.cargo,
        voucher: dados.voucher || null,
        senhaHash,
        senhaProvisoriaHash,
      },
    });

    // Depois da gravação: a empresa dona do voucher sobrepõe a digitada.
    const resgate = dados.voucher ? await resgatarVoucher(usuarioId, dados.voucher) : null;

    return NextResponse.json({
      success: true,
      email,
      emailEnviado,
      empresaDoVoucher: resgate?.empresaNome,
      voucherAplicado: dados.voucher ? Boolean(resgate) : undefined,
      voucherPendente: resgate?.status === "pendente",
    });
  } catch (error: any) {
    console.error("[api/cadastro/completar]", error);
    return NextResponse.json(
      { error: error?.message || "Não foi possível concluir o cadastro." },
      { status: 500 },
    );
  }
}
