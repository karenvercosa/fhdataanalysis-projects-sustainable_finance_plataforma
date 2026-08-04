import { isValidPhoneNumber } from "libphonenumber-js";
import { type DadosCorporativos } from "@/types";

// E-mail precisa obrigatoriamente ter "@" e um domínio válido.
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/**
 * Normaliza um campo de texto do corpo JSON, que pode chegar com qualquer
 * tipo. Só string vira valor; o resto vira string vazia, em vez de ser
 * coagido para algo como `"[object Object]"` (SonarQube typescript:S6551).
 */
export function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function lerDadosCorporativos(body: any): DadosCorporativos {
  return {
    phone: texto(body?.phone),
    empresa: texto(body?.empresa),
    cargo: texto(body?.cargo),
    voucher: texto(body?.voucher),
  };
}

/**
 * Validação do vínculo corporativo, refeita no servidor. O voucher é o único
 * campo opcional — os demais são obrigatórios.
 */
export function validarDadosCorporativos(dados: DadosCorporativos): string | null {
  // O celular chega em E.164 do seletor de país, então a validação é a mesma
  // da biblioteca usada no formulário.
  if (!isValidPhoneNumber(dados.phone)) return "Informe um celular válido.";
  if (!dados.empresa || !dados.cargo) return "Preencha todos os campos obrigatórios.";
  return null;
}
