import { randomInt } from "node:crypto";

const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
// Sem 0/1: quem digita a senha do e-mail confunde com O e l.
const NUMEROS = "23456789";
const ESPECIAIS = "!@#$%&*?";

const ALFABETO = MINUSCULAS + MAIUSCULAS + NUMEROS + ESPECIAIS;

/** Sorteia um caractere do conjunto usando o gerador criptográfico do Node. */
function sorteia(conjunto: string) {
  return conjunto[randomInt(conjunto.length)];
}

/**
 * Gera a senha provisória enviada por e-mail no cadastro.
 *
 * A senha respeita a mesma regra exigida pelo Better Auth e pelo formulário
 * (mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere
 * especial): um caractere de cada classe é garantido antes do sorteio livre,
 * e a ordem final é embaralhada para não deixar a posição das classes fixa.
 */
export function gerarSenhaProvisoria(tamanho = 12): string {
  const obrigatorios = [
    sorteia(MINUSCULAS),
    sorteia(MAIUSCULAS),
    sorteia(NUMEROS),
    sorteia(ESPECIAIS),
  ];

  const restante = Array.from({ length: Math.max(tamanho, 8) - obrigatorios.length }, () =>
    sorteia(ALFABETO),
  );

  const caracteres = [...obrigatorios, ...restante];

  // Fisher-Yates com `randomInt`: embaralhamento uniforme e sem Math.random.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }

  return caracteres.join("");
}
