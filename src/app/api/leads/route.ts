import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { exigirCapacidade } from "@/lib/rbac.server";
import { sendLeadPlataformaEmail } from "@/services/email.service";
import { type TipoLead } from "@/emails/lead-plataforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = new Set<TipoLead>(["presencial", "curador", "patrocinador"]);
const MENSAGEM_MAXIMA = 2000;

/**
 * Formulários de interesse da tela inicial.
 *
 * Os três — pré-inscrição no presencial, "quero ser curador" e "quero
 * patrocinar" — caem aqui e viram e-mail para a caixa comercial. Antes cada um
 * só gravava no `localStorage` do navegador de quem preencheu, então o lead
 * nunca chegava a ninguém.
 *
 * Nome e e-mail vêm da SESSÃO, nunca do corpo enviado: o lead precisa
 * identificar quem realmente está logado. Basta estar autenticado — é um
 * formulário de interesse, aberto a qualquer plano.
 */
export async function POST(req: Request) {
  return rotaAdmin("api/leads POST", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const corpo = await req.json().catch(() => ({}));
    const tipo = texto((corpo as any)?.tipo) as TipoLead;
    const empresa = texto((corpo as any)?.empresa);
    const cargo = texto((corpo as any)?.cargo);
    const telefone = texto((corpo as any)?.telefone);
    const mensagem = texto((corpo as any)?.mensagem);

    if (!TIPOS.has(tipo)) throw new ErroDeEntrada("Tipo de solicitação inválido.");
    if (!empresa || !cargo || !telefone) {
      throw new ErroDeEntrada("Preencha empresa, cargo e telefone.");
    }
    if (mensagem.length > MENSAGEM_MAXIMA) {
      throw new ErroDeEntrada(`A mensagem deve ter no máximo ${MENSAGEM_MAXIMA} caracteres.`);
    }

    const envio = await sendLeadPlataformaEmail({
      tipo,
      nome: sessao.nome,
      email: sessao.email,
      empresa,
      cargo,
      telefone,
      mensagem,
    });

    if (!envio.success) {
      throw new ErroDeEntrada(
        "Não conseguimos enviar seus dados agora. Tente novamente em instantes.",
      );
    }

    return { ok: true };
  });
}
