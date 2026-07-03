import withPWAInit from "@ducanh2912/next-pwa";

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

export default withPWA(nextConfig);
