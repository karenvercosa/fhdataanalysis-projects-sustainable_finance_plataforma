import { Link } from "react-router-dom";
import { Lock, Ticket } from "lucide-react";

/**
 * Pré-visualização limitada para o Não Pago: ele VÊ o que teria acesso,
 * mas o conteúdo fica somente-leitura, com um CTA de aquisição no topo.
 */
export function PreviewLock({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-secondary-500 bg-secondary-400/15 p-4">
        <Lock className="h-6 w-6 shrink-0 text-secondary-600" />
        <div className="min-w-0 flex-1">
          <p className="text-h4 text-neutral-900">Acesso limitado</p>
          <p className="text-body-sm text-neutral-600">
            {message ??
              "Você pode explorar a plataforma livremente. Adquira seu ingresso para liberar o acesso total."}
          </p>
        </div>
        <Link
          to="/ingressos"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-secondary-500 px-4 text-button text-[#102823] transition hover:brightness-95"
        >
          <Ticket className="h-4 w-4" /> Adquirir ingresso
        </Link>
      </div>

      <div className="relative">
        <div className="pointer-events-none select-none">{children}</div>
        {/* Esmaecimento inferior reforçando o estado de amostra */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-neutral-50 to-transparent" />
      </div>
    </div>
  );
}
