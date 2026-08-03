/** Idiomas suportados pela plataforma (arquivos em `src/messages`). */
export const LOCALES = ["pt", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";

/** Cookie lido pelo `getRequestConfig` e escrito pelo middleware/UI. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
