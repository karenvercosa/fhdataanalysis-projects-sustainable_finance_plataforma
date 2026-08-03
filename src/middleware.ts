import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeDoAcceptLanguage,
} from "@/i18n/routing";
import { ROTA_LOGIN, ehRequisicaoDeInfraestrutura, ehRotaPublica } from "@/lib/rotas";

/**
 * Middleware da plataforma. Faz duas coisas, nesta ordem:
 *
 * 1. IDIOMA — grava o cookie `NEXT_LOCALE` na primeira visita, a partir do
 *    `Accept-Language`. Sem prefixo de locale na URL: as rotas da SPA
 *    (react-router) não sobrevivem a um segmento extra no caminho.
 *
 * 2. CONTROLE DE ROTAS — quem não tem cookie de sessão não recebe a página.
 *    É um corte de PRESENÇA de sessão, não de permissão: o middleware roda no
 *    Edge, onde não há Prisma para consultar os perfis do usuário. A checagem
 *    de papel/capacidade acontece logo em seguida, no Server Component do
 *    catch-all (`src/app/[[...slug]]/page.tsx`), que lê o papel real do banco.
 *
 * O cookie do Better Auth é assinado com `BETTER_AUTH_SECRET`; `getSessionCookie`
 * apenas confere se ele existe e está bem formado — a validação criptográfica
 * completa fica para o servidor Node, no `getSessaoServidor`.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // O `config.matcher` no fim do arquivo é só otimização: nesta configuração
  // (`withPWA` + `withNextIntl`) o Next NÃO o aplica em `next dev` — o
  // middleware-manifest sai com `/:path*`, ou seja, o middleware roda em tudo.
  // Quando isso acontece, os bundles (`/_next/static/*.js`) recebem 307 para
  // `/login`, o navegador tenta executar HTML como JavaScript e a página
  // quebra com "Cannot read properties of undefined (reading 'call')".
  // Por isso a exclusão é feita aqui dentro, onde vale em qualquer ambiente.
  if (ehRequisicaoDeInfraestrutura(pathname)) return NextResponse.next();

  const resposta = aplicarIdioma(req);

  // Rotas públicas (login, cadastro, recuperação de senha e o retorno do
  // OAuth) passam direto.
  //
  // Barrar aqui quem já está logado seria um laço: este corte enxerga só a
  // PRESENÇA do cookie, e um cookie obsoleto (sessão expirada, conta apagada
  // ou desativada) existe sem valer nada. O middleware mandaria de `/login`
  // para `/inicio`, o Server Component não acharia sessão e mandaria de volta
  // para `/login`, indefinidamente. Quem já entrou é devolvido em
  // `src/app/[[...slug]]/page.tsx`, que resolve a sessão de verdade contra o
  // banco e por isso sabe a diferença entre "logado" e "tem cookie".
  if (ehRotaPublica(pathname)) return resposta;

  const temSessao = getSessionCookie(req);
  if (!temSessao) {
    const destino = req.nextUrl.clone();
    destino.pathname = ROTA_LOGIN;
    destino.search = "";
    // Preserva para onde a pessoa queria ir, para voltar depois do login.
    // Só o caminho relativo — nunca uma URL absoluta vinda de fora.
    destino.searchParams.set("next", `${pathname}${search}`);

    const redirecionamento = NextResponse.redirect(destino);
    copiarCookies(resposta, redirecionamento);
    return redirecionamento;
  }

  return resposta;
}

/** Define o cookie de idioma quando ele ainda não existe (ou está inválido). */
function aplicarIdioma(req: NextRequest): NextResponse {
  const resposta = NextResponse.next();
  const atual = req.cookies.get(LOCALE_COOKIE)?.value;

  if (!isLocale(atual)) {
    const locale = localeDoAcceptLanguage(req.headers.get("accept-language")) || DEFAULT_LOCALE;
    resposta.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return resposta;
}

/** Leva os cookies definidos em `origem` para a resposta de redirecionamento. */
function copiarCookies(origem: NextResponse, destino: NextResponse) {
  origem.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
}

export const config = {
  // Mantido para o build de produção, onde o Next honra o matcher e nem chega
  // a invocar o middleware para estáticos. A correção de verdade é o
  // `ehRequisicaoDeInfraestrutura` acima — este matcher é só desempenho.
  matcher: ["/((?!api|_next|_vercel|.*[.].*).*)"],
};
