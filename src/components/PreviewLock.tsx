import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Lock, Sparkles, Ticket } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

const MEMBER_BENEFITS = [
  "Conectar-se com participantes e empresas do evento",
  "Ver perfis completos e favoritar contatos",
  "Baixar relatórios, vídeos e materiais das sessões",
  "Montar sua agenda personalizada do dia"
];

/**
 * Pré-visualização limitada para o Plano Gratuito: ele VÊ o que teria acesso,
 * mas as interações são interceptadas — qualquer clique no conteúdo bloqueado
 * "puxa" o usuário para o CTA de virar membro.
 */
export function PreviewLock({
  children,
  message,
  blur = false
}: {
  children: React.ReactNode;
  message?: string;
  blur?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-secondary-500 bg-secondary-400/15 p-4">
        <Lock className="h-6 w-6 shrink-0 text-secondary-600" />
        <div className="min-w-0 flex-1">
          <p className="text-h4 text-neutral-900">Acesso limitado</p>
          <p className="text-body-sm text-neutral-600">
            {message ??
              "Você pode explorar a plataforma livremente. Torne-se membro para liberar o acesso total."}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-secondary-500 px-4 text-button text-[#102823] transition hover:brightness-95"
        >
          <Sparkles className="h-4 w-4" /> Torne-se membro
        </button>
      </div>

      <div className="relative">
        {/* Conteúdo em amostra: sem interação própria (pointer-events-none)… */}
        <div className={cn("pointer-events-none select-none", blur && "blur-[6px]")} aria-hidden>
          {children}
        </div>
        {/* …e uma camada por cima que captura o clique e leva ao CTA. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Torne-se membro para acessar"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer"
        />
        {/* Esmaecimento inferior reforçando o estado de amostra */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-neutral-50 to-transparent" />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Torne-se membro"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Agora não
            </Button>
            <Link
              to="/ingressos"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-[#027D5B] px-6 py-3 text-button font-semibold text-white shadow-[0_2px_4px_0_rgba(30,30,30,0.12)] transition-colors hover:bg-[#19302B]"
            >
              <Ticket className="h-4 w-4" /> Quero ser membro
            </Link>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-body-sm text-neutral-700">
            Este recurso é exclusivo para membros. Com o ingresso você libera:
          </p>
          <ul className="space-y-1.5">
            {MEMBER_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-body-sm text-neutral-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
