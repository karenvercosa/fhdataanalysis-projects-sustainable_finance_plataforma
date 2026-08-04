import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import PwaCleaner from "@/components/PwaCleaner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sustainable Finance 2026",
  description: "Hub digital do evento Sustainable Finance — Goiânia, 04/09/2026",
  // Registro nativo do manifest (App Router serve /manifest.webmanifest via app/manifest.ts).
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SF 2026"
  },
  icons: { icon: "/favicon.svg", apple: "/icons/icon-192.png" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1E8E5A"
};

/** `pt` -> `pt-BR` no atributo `lang`, que espera uma tag BCP 47 completa. */
const LANG_HTML: Record<string, string> = { pt: "pt-BR", en: "en" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Idioma e mensagens resolvidos no servidor (cookie `NEXT_LOCALE`), para o
  // provider entregá-los prontos aos Client Components — inclusive à SPA, que
  // é montada com `ssr: false`.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={LANG_HTML[locale] ?? locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Miriam+Libre:wght@400;700&family=Lexend:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Limpeza de emergência do SW/cache legado (Vite) — roda 1x por navegador. */}
        <PwaCleaner />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
