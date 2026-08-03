import { createAuthClient } from "better-auth/react";

/**
 * Sem `baseURL`: o client usa a origem atual do navegador
 * (`window.location.origin`).
 *
 * Qualquer valor vindo de env `NEXT_PUBLIC_*` seria inlinado no bundle durante
 * o `next build` — não em runtime —, então a imagem Docker publicada carregaria
 * a URL de desenvolvimento fixa. Usando a origem do navegador, a mesma imagem
 * funciona em dev, em produção e atrás de proxy, sem variável de build.
 */
export const authClient = createAuthClient();
