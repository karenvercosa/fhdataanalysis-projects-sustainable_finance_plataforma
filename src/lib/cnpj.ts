/**
 * CNPJ alfanumérico.
 *
 * A partir de 2026 o CNPJ deixa de ser só numérico: as 12 primeiras posições
 * (raiz + ordem) passam a aceitar letras, e apenas os 2 dígitos verificadores
 * continuam numéricos. O formato impresso não muda — `AA.AAA.AAA/AAAA-NN`.
 *
 * Este módulo é client-safe de propósito: a máscara roda enquanto a pessoa
 * digita no formulário e a mesma normalização é reaplicada no servidor, para
 * que o banco nunca guarde duas grafias do mesmo documento.
 */

/** Posições 1–12 aceitam letra ou dígito; 13–14, só dígito. */
const TAMANHO = 14;
const TAMANHO_BASE = 12;

/**
 * Só o conteúdo do documento, sem pontuação e em maiúsculas.
 *
 * Descarta o que não pode existir na posição: letra depois da 12ª posição não
 * entra, então quem digitar algo inválido no fim vê o caractere simplesmente
 * não aparecer, em vez de ser aceito e recusado no envio.
 */
export function apenasCnpj(valor: string): string {
  const limpo = valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
  let saida = "";

  for (const caractere of limpo) {
    if (saida.length >= TAMANHO) break;
    const soDigito = saida.length >= TAMANHO_BASE;
    if (soDigito && !/\d/.test(caractere)) continue;
    saida += caractere;
  }

  return saida;
}

/**
 * Aplica a máscara `AA.AAA.AAA/AAAA-NN` ao que já foi digitado.
 *
 * Formata parcialmente: a pontuação aparece conforme os blocos se completam,
 * sem forçar o campo a ficar cheio antes da hora.
 */
export function formatarCnpj(valor: string): string {
  const base = apenasCnpj(valor);
  if (!base) return "";

  const partes = [
    base.slice(0, 2),
    base.slice(2, 5),
    base.slice(5, 8),
    base.slice(8, 12),
    base.slice(12, 14),
  ].filter(Boolean);

  let saida = partes[0];
  if (partes[1]) saida += `.${partes[1]}`;
  if (partes[2]) saida += `.${partes[2]}`;
  if (partes[3]) saida += `/${partes[3]}`;
  if (partes[4]) saida += `-${partes[4]}`;

  return saida;
}

/**
 * O documento está completo?
 *
 * Confere só o formato (14 posições, com os 2 últimos numéricos). Os dígitos
 * verificadores não são calculados: o campo é opcional no cadastro do voucher
 * e serve para identificação, não para validação fiscal.
 */
export function cnpjCompleto(valor: string): boolean {
  const base = apenasCnpj(valor);
  return base.length === TAMANHO && /^\d{2}$/.test(base.slice(TAMANHO_BASE));
}
