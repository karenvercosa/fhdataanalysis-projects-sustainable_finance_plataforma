/**
 * Proteção contra open redirect nos retornos de autenticação.
 *
 * O destino pós-login (`callbackURL` do Better Auth, `?next=` do middleware) é
 * montado no navegador a partir da URL corrente. Se esse valor for repassado
 * sem normalização, um link preparado por terceiros consegue transformar o
 * retorno do OAuth num salto para fora do site — a vítima sai do provedor de
 * identidade e cai numa página controlada pelo atacante, ainda confiando no
 * domínio de origem.
 *
 * A regra aqui é a mais restritiva possível: só passa caminho relativo à
 * própria origem. Tudo que puder virar outra origem no navegador é descartado.
 */

// Caracteres de controle e espaços são removidos antes das checagens: o
// navegador os ignora ao resolver a URL, então `/\t/evil.com` viraria
// `//evil.com`. A classe é aplicada caractere a caractere (sem quantificador
// aninhado), então não há risco de backtracking.
const CONTROLE_E_ESPACOS = /[\u0000-\u0020\u007F]/g;

/** Prefixos que o navegador resolve como uma origem diferente. */
const PREFIXOS_EXTERNOS = ["//", "/\\", "/%2f", "/%5c"];

/**
 * Devolve um caminho interno seguro para redirecionamento.
 *
 * Aceita apenas caminhos que começam com uma única `/`. Rejeita (caindo em
 * `padrao`):
 *  - URLs absolutas — `https://evil.com`, `javascript:...`, `data:...`;
 *  - URLs protocol-relative — `//evil.com`;
 *  - a variante com barra invertida — `/\evil.com` —, que os navegadores
 *    normalizam para `//evil.com`;
 *  - as mesmas formas percent-encoded — `/%2fevil.com`, `/%5cevil.com`.
 */
export function caminhoInternoSeguro(
  destino: string | null | undefined,
  padrao = "/",
): string {
  if (!destino) return padrao;

  const limpo = destino.replace(CONTROLE_E_ESPACOS, "");
  if (!limpo.startsWith("/")) return padrao;

  const minusculo = limpo.toLowerCase();
  if (PREFIXOS_EXTERNOS.some((prefixo) => minusculo.startsWith(prefixo))) {
    return padrao;
  }

  return limpo;
}
