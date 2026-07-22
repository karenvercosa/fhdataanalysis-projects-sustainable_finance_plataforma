import { useState } from "react";
import { CheckCircle2, ClipboardList, MapPin } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { usePersistentState } from "@/hooks/usePersistentState";
import { AVISO_FORMULARIO_B2B } from "@/data/legal";
import { cn } from "@/lib/utils";

export const PRE_INSCRICOES_KEY = "sf_preinscricoes";

/** Interessado em ir presencialmente que ainda não tem voucher. */
export interface PreInscricao {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  cargo: string;
  telefone: string;
  mensagem: string;
  criadoEm: string;
}

interface Props {
  nome: string;
  email: string;
  empresaInicial?: string;
  cargoInicial?: string;
  /**
   * Versão de destaque, para a tela inicial: usa o âmbar que a plataforma já
   * reserva às chamadas do Plano Gratuito. No checkout, onde o contexto já
   * está dado, o convite fica discreto.
   */
  destaque?: boolean;
}

/**
 * Saída para quem quer o ingresso Presencial mas não recebeu voucher: registra
 * o interesse para a organização acionar um curador/patrocinador depois.
 */
export function PreInscricaoPresencial({
  nome,
  email,
  empresaInicial = "",
  cargoInicial = "",
  destaque = false
}: Props) {
  const [lista, setLista] = usePersistentState<PreInscricao[]>(PRE_INSCRICOES_KEY, []);
  const jaEnviada = lista.some((p) => p.email.toLowerCase() === email.toLowerCase());

  const [aberto, setAberto] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [form, setForm] = useState({
    empresa: empresaInicial,
    cargo: cargoInicial,
    telefone: "",
    mensagem: ""
  });

  const podeEnviar = form.empresa.trim() && form.cargo.trim() && form.telefone.trim();

  const enviar = () => {
    setLista((prev) => [
      ...prev.filter((p) => p.email.toLowerCase() !== email.toLowerCase()),
      {
        id: `pre_${prev.length + 1}_${email}`,
        nome,
        email,
        empresa: form.empresa.trim(),
        cargo: form.cargo.trim(),
        telefone: form.telefone.trim(),
        mensagem: form.mensagem.trim(),
        criadoEm: new Date().toLocaleDateString("pt-BR")
      }
    ]);
    setEnviada(true);
  };

  const fechar = () => {
    setAberto(false);
    window.setTimeout(() => setEnviada(false), 200);
  };

  return (
    <>
      {jaEnviada ? (
        // Já registrado: devolutiva persistente no lugar do convite.
        <div className="flex items-start gap-2 rounded-md border border-primary-500 bg-primary-50 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <div>
            <p className="text-body font-medium text-neutral-900">Pré-inscrição registrada</p>
            <p className="text-body-sm text-neutral-700">
              A organização entra em contato assim que houver voucher disponível para você.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3",
            destaque
              ? "rounded-md border border-secondary-500 bg-secondary-400/15 p-4"
              : "rounded-md border border-dashed border-neutral-300 p-3"
          )}
        >
          {destaque ? (
            <div className="flex min-w-0 items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-secondary-600" />
              <div className="min-w-0">
                <p className="text-h4 text-neutral-900">Garanta sua vaga presencial</p>
                <p className="text-body-sm text-neutral-600">
                  Sem voucher corporativo? Faça sua pré-inscrição para que nossa organização entre
                  em contato e viabilize sua participação.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-body-sm text-neutral-600">
              Quer ir presencialmente e não tem voucher?
            </p>
          )}
          <Button
            /* Destaque: verde claro sobre o fundo âmbar suave da chamada. */
            variant={destaque ? "secondary" : "outline"}
            size={destaque ? "md" : "sm"}
            className="shrink-0"
            leftIcon={<ClipboardList className="h-4 w-4" />}
            onClick={() => setAberto(true)}
          >
            Não tenho voucher, preencha aqui
          </Button>
        </div>
      )}

      <Modal
        open={aberto}
        onClose={fechar}
        title={enviada ? "Pré-inscrição enviada" : "Pré-inscrição — Presencial"}
        footer={
          enviada ? (
            <Button onClick={fechar}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button onClick={enviar} disabled={!podeEnviar}>
                Enviar pré-inscrição
              </Button>
            </>
          )
        }
      >
        {enviada ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary-600" />
            <div>
              <p className="text-body font-medium text-neutral-900">Recebemos seu interesse, {nome.split(" ")[0]}.</p>
              <p className="text-body-sm text-neutral-600">
                Você entrou na lista de espera do ingresso Presencial. Assim que um patrocinador
                liberar voucher, a organização entra em contato por {email}.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-body-sm text-neutral-700">
              O ingresso Presencial é liberado por voucher de patrocinador. Deixe seus dados que a
              organização aciona um curador — sem compromisso.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Empresa"
                placeholder="Onde você trabalha"
                value={form.empresa}
                onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
              />
              <Input
                label="Cargo"
                placeholder="Ex.: Analista ESG"
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </div>
            <Input
              label="Telefone / WhatsApp"
              placeholder="+55 62 99999-0000"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label htmlFor="pre-msg" className="block text-h5 text-neutral-900">
                Por que quer participar? (opcional)
              </label>
              <textarea
                id="pre-msg"
                value={form.mensagem}
                onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                rows={3}
                placeholder="Conte seu interesse no evento…"
                className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            {!podeEnviar && (
              <p className="text-body-sm text-neutral-600">
                Preencha empresa, cargo e telefone para enviar.
              </p>
            )}
            <p className="rounded-md bg-neutral-50 p-3 text-body-sm text-neutral-500">
              {AVISO_FORMULARIO_B2B}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
