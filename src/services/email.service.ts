import nodemailer, { type Transporter } from "nodemailer";
import {
  ASSUNTO_ACESSO_PLATAFORMA,
  acessoPlataformaEmail,
  type AcessoPlataformaEmailProps,
} from "@/emails/acesso-plataforma";

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
