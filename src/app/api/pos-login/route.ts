import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { pedirTrocaDeSenha } from "@/lib/auth";
import { getSessaoServidor } from "@/lib/rbac.server";
import { destinoPorTipoConta } from "@/lib/roles";
import { ROTA_LOGIN, ROTA_PRIMEIRO_ACESSO } from "@/lib/rotas";
import { caminhoInternoSeguro } from "@/lib/safe-redirect";

// O Prisma e o nodemailer não rodam no Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Destino do OAuth quando o cadastro pelo Google ainda está pela metade. */
const ROTA_COMPLETAR_CADASTRO = "/cadastro?cadastro=sucesso";

/**
 * Triagem do login social.
 *
 * O botão "Continuar com Google" da tela de login manda o OAuth voltar para
 * cá, e não direto para uma tela: é aqui que o servidor decide para onde a
 * pessoa vai, na ordem que o fluxo exige.
 *
 *   1. NÃO EXISTIA no banco — o OAuth acabou de criar a conta com nome e
 *      e-mail e nada mais, sem senha e sem o vínculo corporativo obrigatório.
 *      Vai para a segunda etapa do cadastro, que completa os dados e gera a
 *      senha provisória. A conta em si já nasceu no Plano Gratuito.
 *   2. EXISTE e a senha gravada ainda é a PROVISÓRIA — dispara o e-mail de
 *      confirmação e leva à tela do primeiro acesso, de onde só se sai
 *      trocando a senha.
 *   3. EXISTE com senha definitiva — segue para a home do seu tipo de conta
 *      (Plano Gratuito ou assinante), ou para o `?next=` que o middleware
 *      guardou quando barrou a navegação original.
 *
 * O e-mail nunca é conferido a partir do que o navegador manda: a sessão do
 * Better Auth é lida do cookie assinado e o registro vem do Postgres.
 */
export async function GET(req: NextRequest) {
  const destino = (caminho: string) => NextResponse.redirect(new URL(caminho, req.url));

  const sessao = await getSessaoServidor(req.headers);
  if (!sessao) {
    // Sem sessão o OAuth falhou (ou a conta está desativada). Mensagem
    // genérica: a tela de login não revela qual das duas coisas aconteceu.
    return destino(`${ROTA_LOGIN}?erro=login-social`);
  }

  // A marca de "conta recém-criada pelo Google" é não ter credencial de
  // e-mail/senha: o OAuth cria a conta sem senha, e é a segunda etapa do
  // cadastro que gera a provisória junto com o vínculo corporativo. Checar a
  // credencial, e não os campos do formulário, evita mandar para o cadastro
  // quem já tem conta e apenas não preencheu empresa/cargo — o administrador
  // semeado, por exemplo.
  const credencial = await prisma.account.findFirst({
    where: { userId: sessao.id, providerId: "credential" },
    select: { id: true },
  });
  if (!credencial) return destino(ROTA_COMPLETAR_CADASTRO);

  if (sessao.senhaProvisoria) {
    // O disparo falha em silêncio quando o SMTP está fora: a tela do primeiro
    // acesso mostra o estado e oferece o reenvio.
    await pedirTrocaDeSenha(sessao.email).catch((erro) => {
      console.error("[api/pos-login] Falha ao enviar a confirmação:", erro);
    });
    return destino(ROTA_PRIMEIRO_ACESSO);
  }

  // `next` vem do middleware (a rota que a pessoa tentou abrir antes de
  // entrar) e passa pelo mesmo saneamento do resto dos redirecionamentos de
  // autenticação, para não virar um salto para fora do site.
  const pedido = req.nextUrl.searchParams.get("next");
  const padrao = destinoPorTipoConta(sessao.role, sessao.tipoConta);
  return destino(caminhoInternoSeguro(pedido, padrao));
}
