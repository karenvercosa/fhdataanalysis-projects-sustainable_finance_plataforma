import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

// Traduções: o arquivo aponta o next-intl para `src/i18n/request.ts`, que lê
// o idioma do cookie `NEXT_LOCALE` (a plataforma não usa prefixo de locale na
// URL — ver o comentário em `src/i18n/routing.ts`).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// PWA nativo do Next.js (App Router) — @ducanh2912/next-pwa.
// A "blindagem" anti-cache vem das opções do Workbox: skipWaiting + clientsClaim
// fazem o Service Worker novo assumir o controle IMEDIATAMENTE a cada deploy,
// e cleanupOutdatedCaches remove os precaches de builds anteriores.
const withPWA = withPWAInit({
  dest: "public", // gera o sw.js e os assets do Workbox em /public
  register: true, // registra o SW automaticamente no cliente
  // Em desenvolvimento o SW fica DESATIVADO: evita que o cache atrapalhe o dia a dia.
  disable: process.env.NODE_ENV === "development",
  // Recarrega quando a conexão volta (garante bundle atualizado).
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true, // não espera as abas fecharem para ativar a nova versão
    clientsClaim: true, // o SW novo assume o controle das abas abertas na hora
    cleanupOutdatedCaches: true, // apaga precaches de versões antigas
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O type-check roda no build; o lint fica separado.
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(withPWA(nextConfig));
