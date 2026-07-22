import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button, Card, CardBody, Modal } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

/** Palavra que o usuário digita para confirmar — evita exclusão por engano. */
const PALAVRA_CONFIRMACAO = "EXCLUIR";

const PERDAS = [
  "Seu perfil, foto e interesses",
  "Sua agenda e as pautas favoritadas",
  "Seu histórico de participação e downloads",
  "Ingressos, credencial e vouchers resgatados"
];

/**
 * Exclusão de conta. É irreversível, então a confirmação exige uma ação
 * deliberada (digitar a palavra) — não basta um clique a mais.
 */
export function DeleteAccount() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");

  const confirmado = texto.trim().toUpperCase() === PALAVRA_CONFIRMACAO;

  const fechar = () => {
    setAberto(false);
    setTexto("");
  };

  const excluir = () => {
    deleteAccount();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <Card className="border-error-500/40">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-h4 text-neutral-900">
              <AlertTriangle className="h-4 w-4 text-error-500" /> Excluir conta
            </p>
            <p className="text-body-sm text-neutral-600">
              Apaga seus dados da plataforma. Esta ação não pode ser desfeita.
            </p>
          </div>
          <Button
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setAberto(true)}
          >
            Excluir minha conta
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={aberto}
        onClose={fechar}
        title="Tem certeza que quer excluir sua conta?"
        footer={
          <>
            {/* Cancelar em destaque: o caminho seguro é o mais fácil de acertar. */}
            <Button onClick={fechar}>Cancelar</Button>
            <Button variant="danger" disabled={!confirmado} onClick={excluir}>
              Excluir conta
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-md border border-error-500/40 bg-error-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-500" />
            <p className="text-body-sm text-neutral-700">
              A exclusão é <strong>permanente</strong>. Não é possível recuperar a conta
              <strong> {user.email}</strong> depois.
            </p>
          </div>

          <div>
            <p className="text-body-sm font-medium text-neutral-900">Você vai perder:</p>
            <ul className="mt-1.5 space-y-1">
              {PERDAS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-body-sm text-neutral-700">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmar-exclusao" className="block text-h5 text-neutral-900">
              Para confirmar, digite <strong>{PALAVRA_CONFIRMACAO}</strong>
            </label>
            <input
              id="confirmar-exclusao"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={PALAVRA_CONFIRMACAO}
              autoComplete="off"
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-error-500 focus:ring-2 focus:ring-error-50"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
