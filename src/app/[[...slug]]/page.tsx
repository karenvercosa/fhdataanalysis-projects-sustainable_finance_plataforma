"use client";

import dynamic from "next/dynamic";

// O app é uma SPA client-side (react-router + contextos com localStorage),
// então é carregado só no cliente para evitar SSR de APIs de browser.
const ClientRoot = dynamic(() => import("@/ClientRoot"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-neutral-50" />
});

export default function CatchAllPage() {
  return <ClientRoot />;
}
