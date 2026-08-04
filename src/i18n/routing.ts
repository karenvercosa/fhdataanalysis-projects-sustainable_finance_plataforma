import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/types";

/**
 * Regras de idioma da plataforma.
 *
 * Diferente da landing page, aqui NÃO há prefixo de locale na URL
 * (`/en/...`): a plataforma é uma SPA servida por um catch-all e todas as
 * rotas internas do react-router seriam quebradas por um segmento a mais.
 * O idioma vem do cookie `NEXT_LOCALE`, definido pelo middleware a partir do
 * `Accept-Language` do navegador na primeira visita e trocável pela UI.
 *
 * Os valores em si (lista de idiomas, padrão, nome do cookie) moram em
 * `types/i18n.ts`; aqui ficam só as funções que operam sobre eles.
 */
export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale } from "@/types";

export function isLocale(valor: string | undefined | null): valor is Locale {
  return !!valor && (LOCALES as readonly string[]).includes(valor);
}

/**
 * Melhor idioma suportado a partir do cabeçalho `Accept-Language`.
 * Sem correspondência, cai no padrão (pt).
 */
export function localeDoAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const preferidos = header
    .split(",")
    .map((parte) => {
      const [tag, ...params] = parte.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferidos) {
    // `pt-BR` também casa com `pt`.
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
