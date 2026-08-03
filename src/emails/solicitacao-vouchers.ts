/**
 * E-mail que o curador/patrocinador dispara pela aba "Ingressos" quando quer
 * mais convites do que a cota contratada.
 *
 * Vai para o time comercial, não para quem pediu: é um pedido a ser avaliado,
 * e a negociação acontece fora da plataforma. Por isso o `Reply-To` aponta
 * para o solicitante — responder o e-mail já fala com ele.
 *
 * HTML puro e estilos inline pelo mesmo motivo dos outros templates: clientes
 * de e-mail ignoram `<style>` externo, flexbox e grid.
 */

export interface SolicitacaoVouchersEmailProps {
  /** Quem pediu. */
  nome: string;
  email: string;
  empresa: string | null;
  /** Quantos convites A MAIS estão sendo pedidos. */
  quantidade: number;
  /** Justificativa escrita pelo próprio curador. */
  motivo: string;
}

const COR = {
  fundo: "#f4f6f5",
  borda: "#e3e8e6",
  marca: "#02976E",
  titulo: "#102823",
  texto: "#4b5651",
  rotulo: "#8a938f",
  rodape: "#9aa39f",
} as const;

/** Escapa o que foi digitado pelo curador antes de entrar no HTML. */
function esc(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Quebras de linha do textarea viram `<br>` — depois do escape, nunca antes. */
function paragrafo(valor: string): string {
  return esc(valor).replace(/\r?\n/g, "<br />");
}

function bloco(rotulo: string, valor: string): string {
  return `
        <tr>
          <td style="padding:0 0 12px 0;">
            <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${COR.rotulo};">${esc(rotulo)}</p>
            <p style="margin:0;font-size:15px;line-height:22px;color:${COR.titulo};">${esc(valor)}</p>
          </td>
        </tr>`;
}

export const ASSUNTO_SOLICITACAO_VOUCHERS =
  "Pedido de vouchers adicionais — Sustainable Finance 2026";

export function solicitacaoVouchersEmail({
  nome,
  email,
  empresa,
  quantidade,
  motivo,
}: Readonly<SolicitacaoVouchersEmailProps>): { html: string; text: string } {
  const divisor = `<tr><td style="padding:24px 0;"><div style="height:1px;background:${COR.borda};"></div></td></tr>`;
  const destaque = `margin:0;font-size:28px;font-weight:700;line-height:34px;color:${COR.marca};`;

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(ASSUNTO_SOLICITACAO_VOUCHERS)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COR.fundo};font-family:Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${esc(nome)} pediu ${quantidade} voucher(s) a mais
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
                      <h1 style="margin:12px 0 8px 0;font-size:22px;font-weight:700;color:${COR.titulo};">Pedido de vouchers adicionais</h1>
                      <p style="margin:0;font-size:14px;line-height:22px;color:${COR.texto};">
                        Um curador/patrocinador solicitou mais convites pela plataforma.
                      </p>
                    </td>
                  </tr>
                  ${divisor}
                  <tr>
                    <td style="padding:0 0 16px 0;">
                      <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${COR.rotulo};">Vouchers a mais</p>
                      <p style="${destaque}">${quantidade}</p>
                    </td>
                  </tr>
                  ${bloco("Solicitante", nome)}
                  ${bloco("E-mail", email)}
                  ${empresa ? bloco("Empresa", empresa) : ""}
                  <tr>
                    <td style="padding:4px 0 0 0;">
                      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${COR.rotulo};">Justificativa</p>
                      <div style="border-left:3px solid ${COR.borda};padding:4px 0 4px 12px;font-size:15px;line-height:23px;color:${COR.titulo};">${paragrafo(motivo)}</div>
                    </td>
                  </tr>
                  ${divisor}
                  <tr>
                    <td>
                      <p style="margin:0;font-size:13px;line-height:20px;color:${COR.texto};">
                        Responda este e-mail para falar direto com quem pediu.
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

  const text = [
    "SUSTAINABLE FINANCE 2026",
    "",
    "Pedido de vouchers adicionais",
    "",
    `Vouchers a mais: ${quantidade}`,
    `Solicitante: ${nome}`,
    `E-mail: ${email}`,
    ...(empresa ? [`Empresa: ${empresa}`] : []),
    "",
    "Justificativa:",
    motivo,
    "",
    "Responda este e-mail para falar direto com quem pediu.",
    "",
    "E-mail gerado automaticamente pela plataforma do Sustainable Finance 2026.",
  ].join("\n");

  return { html, text };
}
