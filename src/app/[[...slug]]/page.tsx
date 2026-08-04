import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { tokenDeTrocaDeSenhaValido } from "@/lib/auth";
import { getSessaoServidor, podeServidor } from "@/lib/rbac.server";
import { type Role } from "@/lib/roles";
import { cotaDoSelo } from "@/data/sponsorTiers";
import {
  ROTA_HOME,
  ROTA_LOGIN,
  ROTA_PRIMEIRO_ACESSO,
  ROTA_SEM_PERMISSAO,
  ROTA_TROCAR_SENHA,
  ehRequisicaoDeInfraestrutura,
  ehRotaPublica,
  regraDaRota,
} from "@/lib/rotas";
import { type SessaoCliente } from "@/types";
import SpaRoot from "./SpaRoot";

// Depende do cookie de sessão de cada visitante: nunca pode ser pré-renderizada.
export const dynamic = "force-dynamic";

/**
 * Primeiro acesso pendente: a senha gravada ainda é a provisória que foi
 * enviada por e-mail. Nenhuma outra tela abre até ela ser trocada — senão
 * bastaria digitar a URL para pular a etapa. E, uma vez trocada, a tela do
 * primeiro acesso deixa de existir para essa pessoa.
 *
 * Devolve para onde redirecionar, ou `null` quando a rota está liberada.
 */
function destinoPorSenhaProvisoria(pathname: string, senhaProvisoria: boolean): string | null {
  if (pathname === ROTA_PRIMEIRO_ACESSO) return senhaProvisoria ? null : ROTA_HOME;
  return senhaProvisoria ? ROTA_PRIMEIRO_ACESSO : null;
}

/**
 * Capacidade exigida pela rota. Devolve o destino do bloqueio, ou `null`
 * quando o papel pode entrar.
 */
function destinoPorPermissao(pathname: string, role: Role): string | null {
  const regra = regraDaRota(pathname);
  if (!regra?.capacidade || podeServidor(role, regra.capacidade)) return null;
  // O Plano Gratuito entra nas telas de conversão para ver a amostra.
  const amostraLiberada = regra.previewGratuito && role === "guest";
  return amostraLiberada ? null : ROTA_SEM_PERMISSAO;
}

/**
 * Porta de entrada de TODAS as telas da plataforma.
 *
 * A aplicação é uma SPA (react-router) montada só no cliente, então este
 * Server Component é o único ponto do fluxo em que o servidor ainda manda
 * antes de a página existir no navegador. É aqui que a autorização acontece
 * de verdade:
 *
 *   1. resolve a sessão pelo cookie assinado do Better Auth;
 *   2. lê o papel real do usuário na tabela `usuario_perfil`;
 *   3. compara com a capacidade exigida pela rota (`src/lib/rotas.ts`);
 *   4. redireciona quem não pode — a página nem chega a ser enviada.
 *
 * Os guards do react-router continuam existindo, mas para experiência: evitam
 * o flash de tela proibida durante a navegação client-side. Quem adulterar o
 * `localStorage` para virar "admin" no navegador vai ver o menu, e receberá
 * 401/403 de toda rota de API — que refaz esta mesma checagem em
 * `exigirCapacidade`.
 */
export default async function CatchAllPage({
  params,
  searchParams,
}: Readonly<{
  params: { slug?: string[] };
  searchParams: Record<string, string | string[] | undefined>;
}>) {
  const pathname = `/${(params.slug ?? []).join("/")}`;

  // Arquivo que não existe em `public/` cai aqui pelo catch-all — é o caso do
  // `/favicon.ico` que todo navegador pede sozinho (temos só `favicon.svg`).
  // Sem isto ele viraria um redirect para o login em vez de um 404 honesto.
  if (ehRequisicaoDeInfraestrutura(pathname)) notFound();

  // A troca de senha é pública (quem esqueceu a senha chega deslogado), mas
  // não é aberta: só entra quem veio do botão do e-mail de confirmação. O
  // token que o Better Auth acabou de validar é a prova disso, e é conferido
  // de novo aqui — sem ele a tela nem chega a ser enviada ao navegador.
  if (pathname === ROTA_TROCAR_SENHA) {
    const token = primeiroValor(searchParams.token);
    if (!(await tokenDeTrocaDeSenhaValido(token))) {
      redirect(`${ROTA_LOGIN}?erro=token-invalido`);
    }
    return <SpaRoot sessao={null} />;
  }

  // Login e cadastro são as únicas telas servidas sem sessão.
  if (ehRotaPublica(pathname)) {
    // Quem já está autenticado não volta para o login: é a mesma regra do
    // middleware, repetida aqui porque uma navegação client-side da SPA não
    // passa por ele.
    if (pathname === ROTA_LOGIN && (await getSessaoServidor(headers()))) {
      redirect(ROTA_HOME);
    }
    return <SpaRoot sessao={null} />;
  }

  const sessao = await getSessaoServidor(headers());
  if (!sessao) {
    redirect(`${ROTA_LOGIN}?next=${encodeURIComponent(pathname)}`);
  }

  const destinoDaSenha = destinoPorSenhaProvisoria(pathname, sessao.senhaProvisoria);
  if (destinoDaSenha) redirect(destinoDaSenha);

  const destinoDaPermissao = destinoPorPermissao(pathname, sessao.role);
  if (destinoDaPermissao) redirect(destinoDaPermissao);

  const sessaoCliente: SessaoCliente = {
    user: {
      id: sessao.id,
      name: sessao.nome,
      email: sessao.email,
      role: sessao.role,
      avatarUrl: sessao.avatarUrl ?? undefined,
      isPaid: sessao.isPaid,
      hasCredential: sessao.hasCredential,
      ticketCode: sessao.ticketCode,
      tipoConta: sessao.tipoConta,
      selo: sessao.selo,
      cargo: sessao.cargo,
      empresaNome: sessao.empresaNome,
      // A cota de patrocínio É o selo concedido pelo Admin. Sem esta
      // linha o curador chega sem cota e a plataforma o trata como Bronze.
      tier: cotaDoSelo(sessao.selo),
      voucherPendente: sessao.voucherPendente,
    },
    capabilities: sessao.capabilities,
    senhaProvisoria: sessao.senhaProvisoria,
  };

  return <SpaRoot sessao={sessaoCliente} />;
}

/** `?token=a&token=b` chega como array; para nós só o primeiro valor conta. */
function primeiroValor(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? "";
  return valor ?? "";
}
