import { type SessaoServidor, type Role } from "@/types";
import { DEFAULT_MATRIX } from "@/lib/roles";

/**
 * Sessão de servidor pronta para os testes das rotas.
 *
 * As rotas só consomem `exigirCapacidade`, que devolve uma `SessaoServidor`
 * completa. Montar esse objeto à mão em cada teste esconderia o que importa em
 * cada caso, então o helper preenche o resto com valores neutros.
 */
export function sessaoFalsa(over: Partial<SessaoServidor> = {}): SessaoServidor {
  const role: Role = over.role ?? "guest";
  return {
    id: "11111111-1111-4111-8111-111111111111",
    nome: "Pessoa Teste",
    email: "pessoa@teste.com",
    avatarUrl: null,
    role,
    capabilities: DEFAULT_MATRIX[role] ?? [],
    perfis: [],
    selo: null,
    cargo: null,
    empresaNome: null,
    voucherPendente: null,
    tipoConta: role === "guest" ? "gratuito" : "assinante",
    senhaProvisoria: false,
    isPaid: false,
    hasCredential: false,
    ...over,
  };
}

/** Requisição mínima para um route handler: método, corpo e cabeçalhos. */
export function requisicao(url: string, init?: RequestInit & { json?: unknown }): Request {
  const { json, ...resto } = init ?? {};
  return new Request(url, {
    ...resto,
    ...(json !== undefined && { method: resto.method ?? "POST", body: JSON.stringify(json) }),
    headers: { "Content-Type": "application/json", ...(resto.headers ?? {}) },
  });
}
