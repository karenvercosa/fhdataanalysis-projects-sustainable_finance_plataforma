import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";
import { decidirResgate } from "@/lib/voucher.server";
import { StatusResgateVoucher } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: { id: string } };

const DECISOES = [StatusResgateVoucher.aprovado, StatusResgateVoucher.negado] as string[];

/**
 * Decisão do curador sobre um resgate: permitir ou negar.
 *
 * É o mesmo endpoint do botão "desativar" da lista — desativar alguém que já
 * estava aprovado é negar o resgate dele, e o convite volta para a cota.
 *
 * A posse é conferida dentro de `decidirResgate`, que só encontra o resgate se
 * o voucher for do curador da sessão. Assim um id de resgate alheio devolve
 * "não encontrado", sem vazar nem a existência do registro.
 */
export async function PATCH(req: Request, { params }: Contexto) {
  return rotaAdmin("api/curador/resgates PATCH", async () => {
    const sessao = await exigirCapacidade(req.headers, "view:curator-dashboard");

    const corpo = await req.json().catch(() => ({}));
    const status = (corpo as any)?.status;

    if (typeof status !== "string" || !DECISOES.includes(status)) {
      throw new ErroDeEntrada("Decisão inválida.");
    }

    const resultado = await decidirResgate(
      sessao.id,
      params.id,
      status as "aprovado" | "negado",
    );

    if (!resultado.ok) throw new ErroDeEntrada(resultado.erro);

    return { ok: true };
  });
}
