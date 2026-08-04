import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatena classes Tailwind resolvendo conflitos (ex.: p-2 + p-4 => p-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Adiciona ou remove um id de uma lista, sem duplicar. Vive aqui porque três
 * contexts (favoritos, favoritos de networking e interesses) repetiam o mesmo
 * `prev.includes(id) ? filter : [...prev, id]` embutido em quatro níveis de
 * closure dentro do `useMemo` — ver SonarQube S2004.
 */
export function alternarNaLista(lista: string[], id: string): string[] {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

/** Formata CPF para 000.000.000-00 enquanto digita. */
export function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Prefixo do código de credencial por papel. */
const PREFIXO_CREDENCIAL: Record<string, string> = { curator: "CUR", speaker: "SPK" };

/** Código de credencial estável por perfil (prefixo por papel + hash do e-mail). */
export function credentialCode(role: string, email: string, existing?: string): string {
  if (existing) return existing;
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + (email.codePointAt(i) ?? 0)) >>> 0;
  const block = (n: number) => (n % 46656).toString(36).toUpperCase().padStart(3, "0").slice(0, 3);
  const prefix = PREFIXO_CREDENCIAL[role] ?? "SF26";
  return `${prefix}-${block(h)}-${block(h >> 7)}`;
}

/** Validação de CPF (dígitos verificadores) — Prevenção de erros (Heurística 5). */
export function isValidCPF(cpf: string) {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i++) total += Number(c[i]) * (factor - i);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(10) === Number(c[9]) && calc(11) === Number(c[10]);
}
