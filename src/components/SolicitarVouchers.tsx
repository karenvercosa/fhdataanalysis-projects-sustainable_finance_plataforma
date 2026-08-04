import { useState } from "react";
import { AlertCircle, CheckCircle2, Send, Ticket } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { api } from "@/lib/admin-api";

const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 2000;

/**
 * Aba "Ingressos" do curador/patrocinador.
 *
 * Não é um checkout: convite adicional não se compra sozinho no site, é
 * negociado. A tela só monta o pedido — quantos convites a mais e por quê — e
 * manda por e-mail para o time comercial, que responde direto ao curador.
 */
export function SolicitarVouchers() {
  const [quantidade, setQuantidade] = useState("10");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const quantidadeValida = Number.isInteger(Number(quantidade)) && Number(quantidade) >= 1;
  const motivoValido = motivo.trim().length >= MOTIVO_MINIMO;
  const podeEnviar = quantidadeValida && motivoValido && !enviando;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEnviar) return;

    setEnviando(true);
    setErro(null);

    try {
      await api.post("/api/curador/solicitar-vouchers", {
        quantidade: Number(quantidade),
        motivo: motivo.trim(),
      });
      setEnviado(true);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível enviar o pedido.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Ingressos" subtitle="Pedido de vouchers adicionais" icon={Ticket} />
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-success-500" />
            <h2 className="text-h2 text-neutral-900">Pedido enviado!</h2>
            <p className="max-w-md text-body text-neutral-600">
              Encaminhamos sua solicitação de <strong>{quantidade} voucher(s)</strong> para o time
              comercial. A resposta chega no seu e-mail — basta responder a mensagem para
              continuar a conversa.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEnviado(false);
                setMotivo("");
              }}
            >
              Fazer outro pedido
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Ingressos" subtitle="Peça mais vouchers para a sua rede" icon={Ticket} />

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Solicitar vouchers adicionais</p>
          <p className="text-body-sm text-neutral-600">
            Os convites da sua cota já estão no painel. Use este formulário para pedir mais —
            o time comercial avalia e responde por e-mail.
          </p>
        </CardHeader>

        <CardBody>
          <form onSubmit={enviar} className="space-y-4">
            {erro && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md bg-error-50 px-3 py-2 text-body-sm text-error-500"
              >
                <AlertCircle className="h-4 w-4 shrink-0" /> {erro}
              </div>
            )}

            <Input
              label="Quantos vouchers a mais você precisa?"
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              hint="Quantidade adicional, além dos convites que já estão na sua cota."
            />

            <div className="space-y-1.5">
              <label htmlFor="motivo-vouchers" className="block text-h5 text-neutral-900">
                Por que você precisa de mais vouchers?
              </label>
              <textarea
                id="motivo-vouchers"
                rows={6}
                maxLength={MOTIVO_MAXIMO}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Conte quem você quer convidar e qual o objetivo — isso ajuda o time comercial a avaliar o pedido."
                className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <div className="flex justify-between text-body-sm text-neutral-600">
                <span>
                  {motivoValido
                    ? " "
                    : `Escreva pelo menos ${MOTIVO_MINIMO} caracteres.`}
                </span>
                <span className="text-neutral-400">
                  {motivo.length}/{MOTIVO_MAXIMO}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!podeEnviar}
              leftIcon={<Send className="h-4 w-4" />}
              className="w-full"
            >
              {enviando ? "Enviando…" : "Enviar pedido"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
