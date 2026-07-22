import { useNavigate } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { Button, Modal } from "@/components/ui";

const BENEFICIOS = [
  "Hub de Conhecimento: relatórios, vídeos e PDFs para download",
  "Networking completo: perfis, contatos e favoritos",
  "Agenda personalizada com as pautas que você escolher",
  "Acesso ilimitado à plataforma, antes e depois do evento"
];

/**
 * Paywall dos recursos exclusivos de membro. Um único componente para todos os
 * pontos de bloqueio — o `recurso` só ajusta a frase de contexto.
 */
export function PaywallModal({
  open,
  onClose,
  recurso
}: {
  open: boolean;
  onClose: () => void;
  /** O que a pessoa tentou acessar, para a mensagem não ficar genérica. */
  recurso?: string;
}) {
  const navigate = useNavigate();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🔒 Recurso exclusivo para Membros Premium"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Agora não
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate("/ingressos");
            }}
          >
            Garantir acesso completo
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary-400/20 text-secondary-600">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-body text-neutral-700">
            {recurso ? (
              <>
                <strong>{recurso}</strong> faz parte do acesso de membro. Tenha acesso ilimitado ao
                Hub de Conhecimento e ao networking do Summit.
              </>
            ) : (
              "Tenha acesso ilimitado ao Hub de Conhecimento e ao networking do Summit."
            )}
          </p>
        </div>

        <ul className="space-y-1.5">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-body-sm text-neutral-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              {b}
            </li>
          ))}
        </ul>

        <p className="rounded-md bg-neutral-50 p-3 text-body-sm text-neutral-600">
          O <strong>ao vivo</strong> continua liberado no Plano Gratuito.
        </p>
      </div>
    </Modal>
  );
}
