"use client";

import dynamic from "next/dynamic";
import { type SessaoCliente } from "@/types";

// O app é uma SPA client-side (react-router + contextos com localStorage),
// então é carregado só no cliente para evitar SSR de APIs de browser.
const ClientRoot = dynamic(() => import("@/ClientRoot"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-neutral-50" />
});

/**
 * Ponte entre o Server Component que autorizou a rota e a SPA.
 *
 * A sessão chega pronta do servidor — papel e capacidades já resolvidos a
 * partir do banco —, então a primeira renderização já sai com o usuário certo,
 * sem piscar a tela de login enquanto o `/api/sessao` responde.
 */
export default function SpaRoot({ sessao }: Readonly<{ sessao: SessaoCliente | null }>) {
  return <ClientRoot sessao={sessao} />;
}
