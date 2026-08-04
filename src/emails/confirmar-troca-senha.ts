/**
 * E-mail de confirmação da troca de senha.
 *
 * É o único caminho para a tela `/trocar-senha`: o link carrega o token gerado
 * pelo Better Auth, que a rota `/api/auth/reset-password/:token` valida antes
 * de devolver a pessoa à plataforma. Sem clicar no botão daqui não existe
 * token — e sem token a tela não abre.
 *
 * Serve aos dois fluxos, que só mudam de texto:
 *  - `primeiro-acesso` — a senha gravada ainda é a provisória do cadastro;
 *  - `esqueci-senha`   — pedido espontâneo de recuperação.
 *
 * HTML puro e estilos inline pelo mesmo motivo de `acesso-plataforma.ts`:
 * clientes de e-mail ignoram `<style>` externo, flexbox e grid.
 */

export type MotivoTrocaSenha = "primeiro-acesso" | "esqueci-senha";

export interface ConfirmarTrocaSenhaEmailProps {
  nome: string;
  motivo: MotivoTrocaSenha;
  /** Link do Better Auth que valida o token e devolve para `/trocar-senha`. */
  url: string;
  /** Validade do link, em minutos — informada no corpo do e-mail. */
  validadeMinutos: number;
}

const COR = {
  fundo: "#f4f6f5",
  borda: "#e3e8e6",
  marca: "#02976E",
  botao: "#8DD596",
  botaoTexto: "#102823",
  titulo: "#102823",
  texto: "#4b5651",
  rodape: "#9aa39f",
} as const;

/** Escapa o que vem do cadastro (o nome é digitado pela própria pessoa). */
function esc(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const TEXTOS: Record<
  MotivoTrocaSenha,
  { assunto: string; titulo: string; chamada: string; botao: string }
> = {
  "primeiro-acesso": {
    assunto: "Confirme seu e-mail para criar sua senha — Sustainable Finance 2026",
    titulo: "Confirme seu e-mail",
    chamada:
      "Você entrou com a senha provisória que enviamos no cadastro. Para criar a sua senha definitiva, confirme que este e-mail é seu clicando no botão abaixo.",
    botao: "Confirmar e-mail e criar senha",
  },
  "esqueci-senha": {
    assunto: "Redefinição de senha — Sustainable Finance 2026",
    titulo: "Redefinir sua senha",
    chamada:
      "Recebemos um pedido para redefinir a senha da sua conta. Confirme que este e-mail é seu clicando no botão abaixo para escolher uma nova senha.",
    botao: "Confirmar e-mail e redefinir senha",
  },
};

export function assuntoConfirmarTrocaSenha(motivo: MotivoTrocaSenha): string {
  return TEXTOS[motivo].assunto;
}

/** Versão HTML e versão texto puro do mesmo e-mail. */
export function confirmarTrocaSenhaEmail({
  nome,
  motivo,
  url,
  validadeMinutos,
}: Readonly<ConfirmarTrocaSenhaEmailProps>): { html: string; text: string } {
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome;
  const copy = TEXTOS[motivo];
  const divisor = `<tr><td style="padding:24px 0;"><div style="height:1px;background:${COR.borda};"></div></td></tr>`;

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(copy.assunto)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COR.fundo};font-family:Helvetica,Arial,sans-serif;">
    <!-- Texto de pré-visualização, escondido na caixa de entrada. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${esc(copy.titulo)} — Sustainable Finance 2026
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${COR.borda};border-radius:8px;">
            <tr>
              <td style="padding:32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${COR.marca};">Sustainable Finance 2026</p>
                      <h1 style="margin:12px 0 8px 0;font-size:22px;font-weight:700;color:${COR.titulo};">${esc(copy.titulo)}, ${esc(primeiroNome)}</h1>
                      <p style="margin:0;font-size:14px;line-height:22px;color:${COR.texto};">${esc(copy.chamada)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:28px 0 8px 0;">
                      <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;border-radius:6px;background:${COR.botao};color:${COR.botaoTexto};font-size:15px;font-weight:700;text-decoration:none;">${esc(copy.botao)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style="margin:0;font-size:12px;line-height:20px;color:${COR.rodape};">
                        Se o botão não funcionar, copie e cole este endereço no navegador:<br />
                        <span style="color:${COR.marca};word-break:break-all;">${esc(url)}</span>
                      </p>
                    </td>
                  </tr>
                  ${divisor}
                  <tr>
                    <td>
                      <p style="margin:0;font-size:13px;line-height:20px;color:${COR.texto};">
                        O link vale por ${validadeMinutos} minutos e só pode ser usado uma vez. A tela de troca de
                        senha da plataforma abre exclusivamente por ele.
                      </p>
                      <p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:${COR.texto};">
                        Se não foi você quem pediu, ignore este e-mail: nada muda e sua senha atual continua valendo.
                      </p>
                      <p style="margin:16px 0 0 0;font-size:11px;line-height:18px;color:${COR.rodape};">
                        E-mail gerado automaticamente pela plataforma do Sustainable Finance 2026.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  // Alternativa em texto puro: reduz a chance de cair em spam e atende
  // clientes que não renderizam HTML. Sem escape — não é markup.
  const text = [
    "SUSTAINABLE FINANCE 2026",
    "",
    `${copy.titulo}, ${primeiroNome}`,
    "",
    copy.chamada,
    "",
    `${copy.botao}: ${url}`,
    "",
    `O link vale por ${validadeMinutos} minutos e só pode ser usado uma vez.`,
    "A tela de troca de senha da plataforma abre exclusivamente por ele.",
    "",
    "Se não foi você quem pediu, ignore este e-mail: nada muda e sua senha atual continua valendo.",
    "",
    "E-mail gerado automaticamente pela plataforma do Sustainable Finance 2026.",
  ].join("\n");

  return { html, text };
}
