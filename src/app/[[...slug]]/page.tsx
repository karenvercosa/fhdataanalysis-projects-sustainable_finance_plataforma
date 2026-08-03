import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessaoServidor, podeServidor } from "@/lib/rbac.server";
import {
  ROTA_LOGIN,
  ROTA_SEM_PERMISSAO,
  ehRequisicaoDeInfraestrutura,
  ehRotaPublica,
  regraDaRota,
} from "@/lib/rotas";
import { type SessaoCliente } from "@/types";
import SpaRoot from "./SpaRoot";

// Depende do cookie de sessão de cada visitante: nunca pode ser pré-renderizada.
export const dynamic = "force-dynamic";

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
}: Readonly<{ params: { slug?: string[] } }>) {
  const pathname = `/${(params.slug ?? []).join("/")}`;

  // Arquivo que não existe em `public/` cai aqui pelo catch-all — é o caso do
  // `/favicon.ico` que todo navegador pede sozinho (temos só `favicon.svg`).
  // Sem isto ele viraria um redirect para o login em vez de um 404 honesto.
  if (ehRequisicaoDeInfraestrutura(pathname)) notFound();

  // Login e cadastro são as únicas telas servidas sem sessão.
  if (ehRotaPublica(pathname)) {
    return <SpaRoot sessao={null} />;
  }

  const sessao = await getSessaoServidor(await headers());
  if (!sessao) {
    redirect(`${ROTA_LOGIN}?next=${encodeURIComponent(pathname)}`);
  }

  const regra = regraDaRota(pathname);
  if (regra?.capacidade && !podeServidor(sessao.role, regra.capacidade)) {
    // O Plano Gratuito entra nas telas de conversão para ver a amostra.
    const amostraLiberada = regra.previewGratuito && sessao.role === "guest";
    if (!amostraLiberada) redirect(ROTA_SEM_PERMISSAO);
  }

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
    },
    capabilities: sessao.capabilities,
  };

  return <SpaRoot sessao={sessaoCliente} />;
}
