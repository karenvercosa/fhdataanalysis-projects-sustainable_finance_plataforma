import { Download, Info } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

/**
 * Transparência antes do download: avisa quais dados vão para o patrocinador
 * autor do material e dá a chance de desistir. Exigência de finalidade e
 * transparência da LGPD (arts. 6º e 9º).
 */
export function SponsorShareNotice({
  open,
  onClose,
  onConfirm,
  patrocinador,
  material
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Autor do conteúdo — quem recebe os dados. */
  patrocinador: string;
  material?: string;
}) {
  const { user } = useAuth();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Antes de baixar"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button leftIcon={<Download className="h-4 w-4" />} onClick={onConfirm}>
            Concordar e baixar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-md border border-info-500/30 bg-info-50 p-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info-500" />
          <p className="text-body-sm leading-relaxed text-neutral-700">
            Ao baixar {material ? <strong>{material}</strong> : "este material"}, seus dados públicos
            de perfil (<strong>Nome, Cargo e Empresa</strong>) serão compartilhados com o autor do
            conteúdo (<strong>{patrocinador}</strong>).
          </p>
        </div>

        <div className="rounded-md bg-neutral-50 p-3">
          <p className="text-body-sm font-medium text-neutral-900">O que será compartilhado</p>
          <p className="mt-1 text-body-sm text-neutral-600">
            {user.name} · {user.email}
          </p>
          <p className="mt-1 text-body-sm text-neutral-500">
            Seu histórico de navegação e demais dados não são compartilhados.
          </p>
        </div>
      </div>
    </Modal>
  );
}
