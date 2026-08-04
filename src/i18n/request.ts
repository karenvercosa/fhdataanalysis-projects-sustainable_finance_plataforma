import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./routing";

/**
 * Traduções da plataforma.
 *
 * As mensagens vêm dos arquivos estáticos `src/messages/{pt,en}.json` — os
 * mesmos textos da landing page, copiados sem alteração. A landing page lê o
 * conteúdo do banco/Redis porque o time edita a copy pelo CMS; aqui os textos
 * são de interface (formulários, botões), então o arquivo basta e evita
 * acoplar o boot da plataforma ao Redis.
 */
export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const bruto = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(bruto) ? bruto : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
