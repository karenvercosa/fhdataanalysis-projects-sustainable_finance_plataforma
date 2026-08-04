import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `getRequestConfig` do next-intl só embrulha a função recebida; aqui ele é
 * substituído pela identidade para que a resolução do idioma possa ser
 * chamada diretamente.
 */
vi.mock("next-intl/server", () => ({ getRequestConfig: (fn: unknown) => fn }));

const get = vi.fn();
// No Next 14 `cookies()` é síncrono — o mock precisa ter a mesma forma da
// API instalada, senão testa um contrato que não existe aqui.
vi.mock("next/headers", () => ({ cookies: () => ({ get }) }));

const resolver = (await import("@/i18n/request")).default as unknown as () => Promise<{
  locale: string;
  messages: Record<string, unknown>;
}>;

beforeEach(() => get.mockReset());

describe("configuração de idioma da requisição", () => {
  it("usa o idioma do cookie quando ele é suportado", async () => {
    get.mockReturnValue({ value: "en" });

    const { locale, messages } = await resolver();

    expect(get).toHaveBeenCalledWith("NEXT_LOCALE");
    expect(locale).toBe("en");
    expect(Object.keys(messages).length).toBeGreaterThan(0);
  });

  it("sem cookie cai no português", async () => {
    get.mockReturnValue(undefined);
    await expect(resolver()).resolves.toMatchObject({ locale: "pt" });
  });

  it("cookie com idioma não suportado também cai no padrão", async () => {
    get.mockReturnValue({ value: "fr" });
    await expect(resolver()).resolves.toMatchObject({ locale: "pt" });
  });

  it("carrega o arquivo de mensagens do idioma resolvido", async () => {
    get.mockReturnValue({ value: "pt" });
    const pt = await resolver();

    get.mockReturnValue({ value: "en" });
    const en = await resolver();

    expect(Object.keys(pt.messages).sort()).toEqual(Object.keys(en.messages).sort());
  });
});
