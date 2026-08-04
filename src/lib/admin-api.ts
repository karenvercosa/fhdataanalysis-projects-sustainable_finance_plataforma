/**
 * Cliente das rotas de administração.
 *
 * Todas respondem no mesmo formato — o corpo esperado em caso de sucesso e
 * `{ error }` em caso de falha —, então vale a pena ter um único lugar que
 * traduz isso para uma exceção com mensagem legível. As telas ficam só com o
 * `try/catch`, sem repetir a checagem de `resp.ok` em cada chamada.
 */
export class ErroApi extends Error {}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });

  const dados = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new ErroApi(dados?.error || "Não foi possível concluir a operação.");
  }

  return dados as T;
}

export const api = {
  get: <T,>(url: string) => pedir<T>(url),
  post: <T,>(url: string, corpo: unknown) =>
    pedir<T>(url, { method: "POST", body: JSON.stringify(corpo) }),
  patch: <T,>(url: string, corpo: unknown) =>
    pedir<T>(url, { method: "PATCH", body: JSON.stringify(corpo) }),
  put: <T,>(url: string, corpo: unknown) =>
    pedir<T>(url, { method: "PUT", body: JSON.stringify(corpo) }),
  remove: <T,>(url: string) => pedir<T>(url, { method: "DELETE" }),
};
