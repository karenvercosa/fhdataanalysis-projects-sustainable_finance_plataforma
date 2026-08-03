import { type RegraRota } from "@/types";

/**
 * Mapa rota -> capacidade exigida.
 *
 * É a MESMA tabela consultada em três lugares, para não haver duas verdades:
 *  - `src/middleware.ts` — corta o acesso antes de servir a página;
 *  - `src/app/[[...slug]]/page.tsx` — reconfere no servidor com o papel real
 *    lido do banco (o middleware roda no Edge e não alcança o Prisma);
 *  - `src/App.tsx` — os guards do react-router, que só cuidam da experiência
 *    durante a navegação client-side.
 *
 * Este arquivo não pode importar nada de servidor: o middleware roda no Edge.
 */

/** Rotas acessíveis sem sessão. */
export const ROTAS_PUBLICAS = ["/login", "/cadastro"] as const;

/** Ordem não importa: a busca escolhe sempre o prefixo mais longo que casar. */
export const REGRAS_ROTAS: RegraRota[] = [
  { prefixo: "/inicio", capacidade: null },
  { prefixo: "/perfil", capacidade: null },
  { prefixo: "/conteudos", capacidade: null },
  { prefixo: "/programacao", capacidade: "view:public-content" },
  { prefixo: "/ingressos", capacidade: "view:public-content" },
  { prefixo: "/streaming", capacidade: "view:streaming" },
  { prefixo: "/certificado", capacidade: "view:certificate" },
  { prefixo: "/curador", capacidade: "view:curator-dashboard" },
  { prefixo: "/operacao", capacidade: "operate:checkin" },
  { prefixo: "/admin", capacidade: "manage:platform" },

  // Telas com amostra para o Plano Gratuito.
  { prefixo: "/app", capacidade: "manage:personal-agenda", previewGratuito: true },
  { prefixo: "/credencial", capacidade: "view:ticket-qr", previewGratuito: true },
  { prefixo: "/mapa", capacidade: "view:event-map", previewGratuito: true },
  { prefixo: "/networking", capacidade: "view:networking", previewGratuito: true },
];

/** Destino de quem está autenticado mas não tem a capacidade da rota. */
export const ROTA_SEM_PERMISSAO = "/conteudos";

/** Destino de quem não tem sessão. */
export const ROTA_LOGIN = "/login";

export function ehRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Caminhos que não são telas e portanto nunca podem ser redirecionados para o
 * login: bundles, arquivos de `public/` e rotas de API.
 *
 * Usado nos DOIS pontos por onde uma requisição pode passar:
 *
 *  - no middleware, porque o `config.matcher` não é aplicado em `next dev`
 *    nesta configuração (`withPWA` + `withNextIntl`) — sem isto, os chunks
 *    recebem 307 para `/login`, o navegador tenta executar HTML como
 *    JavaScript e a SPA morre com "Cannot read properties of undefined
 *    (reading 'call')";
 *  - no Server Component do catch-all, porque um arquivo inexistente em
 *    `public/` (o clássico `/favicon.ico` que todo navegador pede) cai no
 *    `[[...slug]]` e viraria um redirect para o login em vez de um 404.
 */
export function ehRequisicaoDeInfraestrutura(pathname: string): boolean {
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel/")
  ) {
    return true;
  }

  // Um ponto no ÚLTIMO segmento indica arquivo. Checar só o último segmento
  // evita liberar uma rota real por causa de um ponto no meio do caminho.
  const ultimoSegmento = pathname.slice(pathname.lastIndexOf("/") + 1);
  return ultimoSegmento.includes(".");
}

/**
 * Regra que governa o caminho, ou `undefined` quando nenhuma casa (rotas
 * novas caem no padrão "basta estar autenticado", tratado por quem chama).
 */
export function regraDaRota(pathname: string): RegraRota | undefined {
  return REGRAS_ROTAS.filter(
    (r) => pathname === r.prefixo || pathname.startsWith(`${r.prefixo}/`),
  ).sort((a, b) => b.prefixo.length - a.prefixo.length)[0];
}
