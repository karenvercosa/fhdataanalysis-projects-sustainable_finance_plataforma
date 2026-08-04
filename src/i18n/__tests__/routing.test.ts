import { describe, it, expect } from "vitest";
import {
  isLocale,
  localeDoAcceptLanguage,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
} from "@/i18n/routing";

describe("constantes reexportadas", () => {
  it("o padrão está entre os idiomas suportados", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
    expect(LOCALE_COOKIE).toBe("NEXT_LOCALE");
  });
});

describe("isLocale", () => {
  it("aceita os idiomas suportados", () => {
    for (const l of LOCALES) expect(isLocale(l)).toBe(true);
  });

  it("recusa idioma não suportado, vazio ou ausente", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("é sensível à forma exata — `pt-BR` não é um locale da lista", () => {
    expect(isLocale("pt-BR")).toBe(false);
  });
});

describe("localeDoAcceptLanguage", () => {
  it("sem cabeçalho cai no padrão", () => {
    expect(localeDoAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
    expect(localeDoAcceptLanguage(undefined)).toBe(DEFAULT_LOCALE);
    expect(localeDoAcceptLanguage("")).toBe(DEFAULT_LOCALE);
  });

  it("cabeçalho simples é resolvido direto", () => {
    expect(localeDoAcceptLanguage("en")).toBe("en");
    expect(localeDoAcceptLanguage("pt")).toBe("pt");
  });

  it("a variante regional casa com o idioma base", () => {
    expect(localeDoAcceptLanguage("pt-BR")).toBe("pt");
    expect(localeDoAcceptLanguage("en-US")).toBe("en");
    expect(localeDoAcceptLanguage("EN-GB")).toBe("en");
  });

  it("respeita o peso `q` em vez da ordem escrita", () => {
    expect(localeDoAcceptLanguage("pt;q=0.2,en;q=0.9")).toBe("en");
    expect(localeDoAcceptLanguage("en;q=0.3,pt;q=0.8")).toBe("pt");
  });

  it("sem `q` explícito o peso é 1", () => {
    expect(localeDoAcceptLanguage("en,pt;q=0.9")).toBe("en");
  });

  it("pula idiomas não suportados até achar um que sirva", () => {
    expect(localeDoAcceptLanguage("fr-FR,de;q=0.9,en;q=0.5")).toBe("en");
  });

  it("nenhum idioma suportado cai no padrão", () => {
    expect(localeDoAcceptLanguage("fr-FR,de-DE,es")).toBe(DEFAULT_LOCALE);
  });

  it("`q` malformado é tratado como zero, não como erro", () => {
    expect(localeDoAcceptLanguage("en;q=abc,pt;q=0.1")).toBe("pt");
  });

  it("tolera espaços em volta das partes", () => {
    expect(localeDoAcceptLanguage("  fr ,  en ; q=0.7 ")).toBe("en");
  });
});
