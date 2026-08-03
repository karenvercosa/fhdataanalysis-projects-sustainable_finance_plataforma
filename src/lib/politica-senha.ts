/**
 * Política de senha da plataforma.
 *
 * Mora num módulo próprio — e não em `src/lib/senha.ts` — porque a mesma regra
 * é aplicada nos dois lados: o formulário de troca de senha valida enquanto a
 * pessoa digita, e o servidor reconfere antes de gravar. `senha.ts` importa
 * `node:crypto` e não pode ir para o bundle do navegador.
 *
 * É a mesma exigência que `gerarSenhaProvisoria` já respeita ao sortear a
 * senha do primeiro acesso.
 */

export const TAMANHO_MINIMO_SENHA = 8;

const REGRAS: ReadonlyArray<{ testa: RegExp; falta: string }> = [
  { testa: /[a-z]/, falta: "uma letra minúscula" },
  { testa: /[A-Z]/, falta: "uma letra maiúscula" },
  { testa: /\d/, falta: "um número" },
  { testa: /[^a-zA-Z0-9]/, falta: "um caractere especial" },
];

/**
 * Devolve a mensagem do que falta para a senha ser aceita, ou `null` quando
 * ela já atende a todos os critérios.
 */
export function validarSenha(senha: string): string | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }

  const faltando = REGRAS.filter((r) => !r.testa.test(senha)).map((r) => r.falta);
  if (faltando.length === 0) return null;

  return `A senha precisa conter ${listar(faltando)}.`;
}

/** "a, b e c" — junta a lista do que falta em português. */
function listar(itens: string[]): string {
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}
