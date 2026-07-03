"use client";

import { useEffect } from "react";

// Flag por navegador: a limpeza roda UMA única vez (evita loop de reload).
const CLEANED_FLAG = "sf_pwa_legacy_cleaned_v1";

/**
 * Limpeza de emergência do PWA.
 *
 * Remove Service Workers e caches LEGADOS (herdados do antigo PWA do Vite)
 * que podem estar servindo um bundle desatualizado e "presos" no navegador do
 * usuário. Roda uma vez por navegador; ao encontrar algo legado, desregistra
 * tudo, limpa os caches e força um reload limpo — deixando o Next.js/next-pwa
 * assumir 100% do controle.
 *
 * Em produção, o next-pwa registra o SW novo em seguida (com skipWaiting +
 * clientsClaim), então futuras atualizações passam a ser imediatas.
 */
export default function PwaCleaner() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Já migrado neste navegador → não faz nada (sem loop).
    try {
      if (localStorage.getItem(CLEANED_FLAG)) return;
    } catch {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1) Desregistra todos os Service Workers atuais (inclui o legado do Vite).
        const registrations = await navigator.serviceWorker.getRegistrations();
        let removed = 0;
        await Promise.all(
          registrations.map(async (reg) => {
            const ok = await reg.unregister();
            if (ok) removed += 1;
          })
        );

        // 2) Apaga todos os caches (precaches do Workbox antigo).
        let cachesCleared = 0;
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
          cachesCleared = keys.length;
        }

        // 3) Marca como limpo e recarrega SOMENTE se havia resíduo legado.
        //    (navegador limpo não sofre reload desnecessário.)
        localStorage.setItem(CLEANED_FLAG, "1");
        if (!cancelled && (removed > 0 || cachesCleared > 0)) {
          window.location.reload();
        }
      } catch {
        // Em qualquer falha, marca como limpo para não entrar em loop.
        try {
          localStorage.setItem(CLEANED_FLAG, "1");
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
