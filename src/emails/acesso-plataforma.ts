/**
 * E-mail com a senha provisória do primeiro acesso.
 *
 * Escrito em HTML puro, e não com `@react-email/components`: aquele pacote
 * está deprecado no npm em TODAS as versões publicadas (inclusive a `latest`),
 * e arrastava 21 subpacotes também deprecados para o `yarn install`. Como aqui
 * há um único template, montar o HTML à mão sai mais barato do que carregar
 * uma árvore de dependências sem manutenção.
 *
 * O layout usa tabela e estilos inline porque clientes de e-mail (Outlook,
 * Gmail) ignoram `<style>` externo, flexbox e grid.
 */

export interface AcessoPlataformaEmailProps {
  nome: string;
  email: string;
  senha: string;
  /** Endereço da plataforma, para a pessoa saber onde usar a senha. */
  url?: string;
  /**
   * Link do botão "Criar minha senha": abre direto a tela de nova senha, sem
   * precisar entrar antes com a provisória. É o caminho curto do cadastro à
   * plataforma — a senha provisória fica como alternativa.
   */
  linkCriarSenha?: string;
}

const COR = {
  fundo: "#f4f6f5",
  borda: "#e3e8e6",
  marca: "#02976E",
  botao: "#8DD596",
  botaoTexto: "#102823",
  titulo: "#102823",
  texto: "#4b5651",
  rotulo: "#8a938f",
  rodape: "#9aa39f",
} as const;

/**
 * Escapa o conteúdo que vem do cadastro antes de entrar no HTML.
 *
 * O nome é digitado pela própria pessoa: sem isto, um cadastro com
 * `<img src=x onerror=...>` no nome viraria markup dentro do e-mail. O JSX do
 * react-email fazia esse escape automaticamente — em HTML montado à mão, é
 * responsabilidade nossa.
 */
function esc(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bloco(rotulo: string, valor: string, estiloValor: string): string {
  return `
        <tr>
          <td style="padding:0 0 12px 0;">
            <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${COR.rotulo};">${esc(rotulo)}</p>
            <p style="${estiloValor}">${esc(valor)}</p>
          </td>
        </tr>`;
}

export const ASSUNTO_ACESSO_PLATAFORMA =
  "Sua senha de primeiro acesso — Sustainable Finance 2026";

/** Versão HTML e versão texto puro do mesmo e-mail. */
export function acessoPlataformaEmail({
  nome,
  email,
  senha,
  url,
  linkCriarSenha,
}: Readonly<AcessoPlataformaEmailProps>): { html: string; text: string } {
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome;

  const valorPadrao = `margin:0;font-size:15px;line-height:22px;color:${COR.titulo};`;
  const valorSenha = `margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;font-weight:700;line-height:28px;letter-spacing:2px;color:${COR.marca};`;
  const valorUrl = `margin:0;font-size:15px;line-height:22px;color:${COR.marca};`;
  const divisor = `<tr><td style="padding:24px 0;"><div style="height:1px;background:${COR.borda};"></div></td></tr>`;

  // Botão de criar a senha definitiva. Fica antes dos dados de acesso porque é
  // o caminho recomendado; a senha provisória logo abaixo é o plano B.
  const botao = linkCriarSenha
    ? `
                  <tr>
                    <td align="center" style="padding:24px 0 4px 0;">
                      <a href="${esc(linkCriarSenha)}" style="display:inline-block;padding:14px 28px;border-radius:6px;background:${COR.botao};color:${COR.botaoTexto};font-size:15px;font-weight:700;text-decoration:none;">Criar minha senha e entrar</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p style="margin:0;font-size:12px;line-height:20px;color:${COR.rodape};">
                        Ao criar a senha por este botão, você já entra na plataforma.
                      </p>
                    </td>
                  </tr>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(ASSUNTO_ACESSO_PLATAFORMA)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COR.fundo};font-family:Helvetica,Arial,sans-serif;">
    <!-- Texto de pré-visualização, escondido na caixa de entrada. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Sua senha de primeiro acesso ao Sustainable Finance 2026
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
                      <h1 style="margin:12px 0 8px 0;font-size:22px;font-weight:700;color:${COR.titulo};">Cadastro confirmado, ${esc(primeiroNome)}!</h1>
                      <p style="margin:0;font-size:14px;line-height:22px;color:${COR.texto};">
                        Sua conta foi criada com sucesso. Clique no botão abaixo para criar a sua
                        senha e entrar direto na plataforma.
                      </p>
                    </td>
                  </tr>
                  ${botao}
                  ${divisor}
                  ${bloco("E-mail de acesso", email, valorPadrao)}
                  ${bloco("Senha provisória (alternativa)", senha, valorSenha)}
                  ${url ? bloco("Endereço da plataforma", url, valorUrl) : ""}
                  ${divisor}
                  <tr>
                    <td>
                      <p style="margin:0;font-size:13px;line-height:20px;color:${COR.texto};">
                        Prefere entrar pelo formulário? Use o e-mail acima com a senha provisória — a
                        plataforma vai pedir que você crie a sua senha definitiva em seguida.
                      </p>
                      <p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:${COR.texto};">
                        Guarde este e-mail em local seguro e não compartilhe a senha com ninguém.
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
    `Cadastro confirmado, ${primeiroNome}!`,
    "",
    "Sua conta foi criada com sucesso. Use o link abaixo para criar a sua senha e",
    "entrar direto na plataforma.",
    ...(linkCriarSenha ? ["", `Criar minha senha e entrar: ${linkCriarSenha}`] : []),
    "",
    `E-mail de acesso: ${email}`,
    `Senha provisória (alternativa): ${senha}`,
    ...(url ? [`Endereço da plataforma: ${url}`] : []),
    "",
    "Prefere entrar pelo formulário? Use o e-mail acima com a senha provisória — a",
    "plataforma vai pedir que você crie a sua senha definitiva em seguida.",
    "",
    "Guarde este e-mail em local seguro e não compartilhe a senha com ninguém.",
    "",
    "E-mail gerado automaticamente pela plataforma do Sustainable Finance 2026.",
  ].join("\n");

  return { html, text };
}
