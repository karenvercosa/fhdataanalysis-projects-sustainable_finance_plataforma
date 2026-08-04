import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ErroApi } from "@/lib/admin-api";

function resposta(corpo: unknown, ok = true) {
  return { ok, json: async () => corpo } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("admin-api", () => {
  it("nunca cacheia — a tela do admin não pode ler resposta velha", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/api/admin/x");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("GET não manda corpo nem Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({}));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/api/admin/x");

    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("devolve o corpo já desserializado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta({ itens: [1, 2] })));
    await expect(api.get("/api/x")).resolves.toEqual({ itens: [1, 2] });
  });

  it.each([
    ["post", "POST"],
    ["patch", "PATCH"],
    ["put", "PUT"],
  ] as const)("%s serializa o corpo e declara o Content-Type", async (metodo, verbo) => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({}));
    vi.stubGlobal("fetch", fetchMock);

    await api[metodo]("/api/x", { a: 1 });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: verbo,
      body: JSON.stringify({ a: 1 }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("remove usa DELETE e não manda corpo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta({}));
    vi.stubGlobal("fetch", fetchMock);

    await api.remove("/api/x/1");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
  });

  it("traduz a falha da API para ErroApi com a mensagem do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta({ error: "Selo inválido." }, false)));

    await expect(api.get("/api/x")).rejects.toThrowError(
      new ErroApi("Selo inválido."),
    );
  });

  it("usa uma mensagem genérica quando o servidor não manda `error`", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta({}, false)));
    await expect(api.get("/api/x")).rejects.toThrow(/Não foi possível concluir a operação/);
  });

  it("corpo que não é JSON não derruba o cliente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new SyntaxError("resposta vazia");
        },
      } as unknown as Response),
    );

    await expect(api.get("/api/x")).rejects.toBeInstanceOf(ErroApi);
  });
});
