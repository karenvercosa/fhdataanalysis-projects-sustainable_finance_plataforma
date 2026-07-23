import { useEffect, useState } from "react";
import { Cookie, FileText, ShieldCheck } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useCookieConsent } from "@/context/CookieConsentContext";
import { LEGAL_DOCS, LEGAL_ORDER, type LegalDocId } from "@/data/legal";
import { cn } from "@/lib/utils";

const ICONE: Record<LegalDocId, typeof FileText> = {
  termos: FileText,
  privacidade: ShieldCheck,
  cookies: Cookie
};

/** Leitor dos documentos legais, com troca entre eles sem sair do modal. */
export function LegalModal({
  open,
  onClose,
  docInicial = "termos"
}: {
  open: boolean;
  onClose: () => void;
  docInicial?: LegalDocId;
}) {
  const [atual, setAtual] = useState<LegalDocId>(docInicial);
  const { revisar } = useCookieConsent();
  const doc = LEGAL_DOCS[atual];

  // O modal fica montado, então `docInicial` precisa ser reaplicado a cada
  // abertura — senão todo clique cai no documento da primeira montagem.
  useEffect(() => {
    if (open) setAtual(docInicial);
  }, [open, docInicial]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Legal & Privacidade"
      className="max-w-2xl"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => {
              // Reabre o banner para a pessoa decidir de novo.
              revisar();
              onClose();
            }}
          >
            Preferências de cookies
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Atalhos entre os documentos */}
        <div className="flex flex-wrap gap-2">
          {LEGAL_ORDER.map((id) => {
            const Icone = ICONE[id];
            return (
              <button
                key={id}
                onClick={() => setAtual(id)}
                aria-current={id === atual}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm transition-colors",
                  id === atual ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                <Icone className="h-3.5 w-3.5" /> {LEGAL_DOCS[id].title}
              </button>
            );
          })}
        </div>

        <div>
          <p className="text-body-sm text-neutral-500">
            Atualizado em {doc.updatedAt} · {doc.summary}
          </p>
        </div>

        {/* Corpo do documento — a rolagem é do próprio Modal */}
        <div className="space-y-4">
          {doc.sections.map((s) => (
            <section key={s.heading} className="space-y-1.5">
              <h3 className="text-h5 text-neutral-900">{s.heading}</h3>
              {s.body.map((p, i) => (
                <p key={i} className="text-body-sm leading-relaxed text-neutral-700">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
