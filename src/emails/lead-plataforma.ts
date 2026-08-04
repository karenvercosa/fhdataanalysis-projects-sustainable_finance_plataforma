/**
 * E-mail dos formulários de interesse do Plano Gratuito.
 *
 * Atende os três de uma vez — pré-inscrição no presencial, "quero ser curador"
 * e "quero patrocinar" — porque os três coletam os mesmos campos e vão para a
 * mesma caixa. O que muda é o título, e isso é dado.
 *
 * Antes esses formulários só gravavam no `localStorage` de quem preencheu: o
 * lead morria no navegador da pessoa e nunca chegava a ninguém.
 *
 * HTML puro e estilos inline pelo mesmo motivo dos outros templates: clientes
 * de e-mail ignoram `<style>` externo, flexbox e grid.
 */

export type TipoLead = "presencial" | "curador" | "patrocinador";

export interface LeadPlataformaEmailProps {
  tipo: TipoLead;
  nome: string;
  email: string;
  empresa: string;
  cargo: string;
  telefone: string;
  mensagem: string;
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

const TEXTOS: Record<TipoLead, { assunto: string; titulo: string; chamada: string }> = {
  presencial: {
    assunto: "Pré-inscrição no presencial — Sustainable Finance 2026",
    titulo: "Pré-inscrição no presencial",
    chamada:
      "Esta pessoa quer participar presencialmente e não tem voucher corporativo. Acione um curador/patrocinador para viabilizar a vaga.",
  },
  curador: {
    assunto: "Interesse em ser Curador — Sustainable Finance 2026",
    titulo: "Interesse em ser Curador",
    chamada: "Esta pessoa se candidatou a curar painéis do Summit.",
  },
  patrocinador: {
    assunto: "Interesse em patrocinar — Sustainable Finance 2026",
    titulo: "Interesse em patrocinar",
    chamada: "Esta pessoa quer conhecer as cotas de patrocínio do Summit.",
  },
};

/** Escapa o que foi digitado no formulário antes de entrar no HTML. */
function esc(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

export function assuntoLead(tipo: TipoLead): string {
  return TEXTOS[tipo].assunto;
}

export function leadPlataformaEmail({
  tipo,
  nome,
  email,
  empresa,
  cargo,
  telefone,
  mensagem,
}: Readonly<LeadPlataformaEmailProps>): { html: string; text: string } {
  const copy = TEXTOS[tipo];
  const divisor = `<tr><td style="padding:24px 0;"><div style="height:1px;background:${COR.borda};"></div></td></tr>`;

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(copy.assunto)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COR.fundo};font-family:Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${esc(nome)} — ${esc(copy.titulo)}
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
                      <h1 style="margin:12px 0 8px 0;font-size:22px;font-weight:700;color:${COR.titulo};">${esc(copy.titulo)}</h1>
                      <p style="margin:0;font-size:14px;line-height:22px;color:${COR.texto};">${esc(copy.chamada)}</p>
                    </td>
                  </tr>
                  ${divisor}
                  ${bloco("Nome", nome)}
                  ${bloco("E-mail", email)}
                  ${bloco("Empresa", empresa)}
                  ${bloco("Cargo", cargo)}
                  ${bloco("Telefone / WhatsApp", telefone)}
                  ${
                    mensagem
                      ? `<tr>
                    <td style="padding:4px 0 0 0;">
                      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${COR.rotulo};">Mensagem</p>
                      <div style="border-left:3px solid ${COR.borda};padding:4px 0 4px 12px;font-size:15px;line-height:23px;color:${COR.titulo};">${paragrafo(mensagem)}</div>
                    </td>
                  </tr>`
                      : ""
                  }
                  ${divisor}
                  <tr>
                    <td>
                      <p style="margin:0;font-size:13px;line-height:20px;color:${COR.texto};">
                        Responda este e-mail para falar direto com a pessoa.
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
    copy.titulo,
    "",
    copy.chamada,
    "",
    `Nome: ${nome}`,
    `E-mail: ${email}`,
    `Empresa: ${empresa}`,
    `Cargo: ${cargo}`,
    `Telefone / WhatsApp: ${telefone}`,
    ...(mensagem ? ["", "Mensagem:", mensagem] : []),
    "",
    "Responda este e-mail para falar direto com a pessoa.",
    "",
    "E-mail gerado automaticamente pela plataforma do Sustainable Finance 2026.",
  ].join("\n");

  return { html, text };
}
