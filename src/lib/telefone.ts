import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Número nacional só com dígitos, sem o código do país.
 *
 * O formulário envia o celular em E.164 (`+5562999998888`, vindo do seletor de
 * país), mas o Asaas espera o número nacional em `mobilePhone` — mandar o `55`
 * junto faz a API recusar o cadastro do cliente. Quando o valor não é um
 * telefone reconhecível, cai para "só os dígitos".
 */
export function telefoneNacional(valor?: string | null): string | undefined {
  if (!valor) return undefined;

  const numero = parsePhoneNumberFromString(valor);
  if (numero) return numero.nationalNumber;

  return valor.replace(/\D/g, "") || undefined;
}
