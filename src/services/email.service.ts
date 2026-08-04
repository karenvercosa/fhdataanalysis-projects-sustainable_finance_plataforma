import nodemailer, { type Transporter } from "nodemailer";
import {
  ASSUNTO_ACESSO_PLATAFORMA,
  acessoPlataformaEmail,
  type AcessoPlataformaEmailProps,
} from "@/emails/acesso-plataforma";
import {
  assuntoConfirmarTrocaSenha,
  confirmarTrocaSenhaEmail,
  type ConfirmarTrocaSenhaEmailProps,
} from "@/emails/confirmar-troca-senha";
import {
  ASSUNTO_SOLICITACAO_VOUCHERS,
  solicitacaoVouchersEmail,
  type SolicitacaoVouchersEmailProps,
} from "@/emails/solicitacao-vouchers";
import {
  assuntoLead,
  leadPlataformaEmail,
  type LeadPlataformaEmailProps,
} from "@/emails/lead-plataforma";

// O transporter é criado sob demanda, e não no escopo do módulo: assim o
// `next build` roda sem nenhuma credencial de SMTP dentro da imagem Docker.
// Todos os segredos entram apenas em runtime, via env_file / K8s Secret.
let transporter: Transporter | null = null;

function getTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "SMTP não configurado: defina SMTP_USER e SMTP_PASSWORD no ambiente.",
    );
  }

  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    // 465 fala TLS desde o handshake; 587 sobe pra TLS via STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

// Remetente: precisa ser uma caixa que o servidor SMTP autorize a enviar.
// No Google Workspace, o mesmo endereço autenticado em SMTP_USER.
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "";

/**
 * Envia à pessoa recém-cadastrada a senha provisória do primeiro acesso.
 * Vai para o e-mail informado no cadastro.
 */
export async function sendAcessoPlataformaEmail(
  dados: Omit<AcessoPlataformaEmailProps, "url">,
) {
  try {
    const { html, text } = acessoPlataformaEmail({
      ...dados,
      url: process.env.BETTER_AUTH_URL_PLATAFORMA || undefined,
    });

    const info = await getTransporter().sendMail({
      from: `Sustainable Finance <${EMAIL_FROM}>`,
      to: dados.email,
      subject: ASSUNTO_ACESSO_PLATAFORMA,
      html,
      text,
    });

    return { success: true, id: info.messageId };
  } catch (error: any) {
    console.error("[email.service] Erro SMTP (acesso plataforma):", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail." };
  }
}

/**
 * Envia o e-mail de confirmação que libera a tela de troca de senha.
 *
 * Vale tanto para o primeiro acesso (senha ainda provisória) quanto para o
 * "esqueci a senha": o que muda é só o texto. O link é o do Better Auth, que
 * valida o token antes de devolver a pessoa para `/trocar-senha`.
 */
export async function sendConfirmacaoTrocaSenhaEmail(
  dados: ConfirmarTrocaSenhaEmailProps & { email: string },
) {
  try {
    const { html, text } = confirmarTrocaSenhaEmail(dados);

    const info = await getTransporter().sendMail({
      from: `Sustainable Finance <${EMAIL_FROM}>`,
      to: dados.email,
      subject: assuntoConfirmarTrocaSenha(dados.motivo),
      html,
      text,
    });

    return { success: true, id: info.messageId };
  } catch (error: any) {
    console.error("[email.service] Erro SMTP (confirmação de troca de senha):", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail." };
  }
}

/**
 * Envia ao time comercial o pedido de vouchers adicionais de um
 * curador/patrocinador.
 *
 * Vai para `EMAIL_TO` (a caixa comercial), com `replyTo` no solicitante: o
 * remetente continua sendo a conta autenticada no SMTP — usar o e-mail do
 * curador ali faria a mensagem ser barrada por SPF/DKIM.
 */
export async function sendSolicitacaoVouchersEmail(dados: SolicitacaoVouchersEmailProps) {
  try {
    const { html, text } = solicitacaoVouchersEmail(dados);

    const info = await getTransporter().sendMail({
      from: `Sustainable Finance <${EMAIL_FROM}>`,
      to: process.env.EMAIL_TO || EMAIL_FROM,
      replyTo: dados.email,
      subject: ASSUNTO_SOLICITACAO_VOUCHERS,
      html,
      text,
    });

    return { success: true, id: info.messageId };
  } catch (error: any) {
    console.error("[email.service] Erro SMTP (solicitação de vouchers):", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail." };
  }
}

/**
 * Envia um lead dos formulários da tela inicial (pré-inscrição no presencial,
 * curadoria e patrocínio) para a caixa comercial.
 *
 * Mesmo padrão do pedido de vouchers: remetente é a conta autenticada no SMTP
 * e `replyTo` é quem preencheu — usar o e-mail da pessoa como remetente faria
 * a mensagem ser barrada por SPF/DKIM.
 */
export async function sendLeadPlataformaEmail(dados: LeadPlataformaEmailProps) {
  try {
    const { html, text } = leadPlataformaEmail(dados);

    const info = await getTransporter().sendMail({
      from: `Sustainable Finance <${EMAIL_FROM}>`,
      to: process.env.EMAIL_TO || EMAIL_FROM,
      replyTo: dados.email,
      subject: assuntoLead(dados.tipo),
      html,
      text,
    });

    return { success: true, id: info.messageId };
  } catch (error: any) {
    console.error("[email.service] Erro SMTP (lead da plataforma):", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail." };
  }
}
