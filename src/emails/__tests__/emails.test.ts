import { describe, it, expect } from "vitest";
import { acessoPlataformaEmail } from "@/emails/acesso-plataforma";
import { confirmarTrocaSenhaEmail, assuntoConfirmarTrocaSenha } from "@/emails/confirmar-troca-senha";
import { leadPlataformaEmail, assuntoLead } from "@/emails/lead-plataforma";
import { solicitacaoVouchersEmail } from "@/emails/solicitacao-vouchers";

const XSS = '<img src=x onerror="alert(1)">';

describe("escape nos templates de e-mail", () => {
  it("não deixa markup do nome virar HTML no e-mail de acesso", () => {
    const { html } = acessoPlataformaEmail({
      nome: XSS, email: "a@b.com", senha: "Senha#1", linkCriarSenha: "https://x/y",
    });
    expect(html).not.toContain("<img src=x");
    // O template trata a pessoa pelo PRIMEIRO nome, então só `<img` sobra —
    // já escapado.
    expect(html).toContain("&lt;img");
  });

  it("escapa o nome no e-mail de troca de senha", () => {
    const { html } = confirmarTrocaSenhaEmail({
      nome: XSS, motivo: "primeiro-acesso", url: "https://x/y", validadeMinutos: 60,
    });
    expect(html).not.toContain("<img src=x");
  });

  it("escapa a justificativa do lead e preserva as quebras de linha", () => {
    const { html } = leadPlataformaEmail({
      tipo: "presencial", nome: "N", email: "a@b.com",
      empresa: "E", cargo: "C", telefone: "1", mensagem: `linha1\nlinha2 ${XSS}`,
    });
    expect(html).toContain("linha1<br />linha2");
    expect(html).not.toContain("<img src=x");
  });

  it("escapa a justificativa do pedido de vouchers", () => {
    const { html } = solicitacaoVouchersEmail({
      nome: "N", email: "a@b.com", empresa: null, quantidade: 5, motivo: XSS,
    });
    expect(html).not.toContain("<img src=x");
  });
});

describe("conteúdo dos e-mails", () => {
  it("o e-mail de acesso leva a senha e o botão de criar a definitiva", () => {
    const { html, text } = acessoPlataformaEmail({
      nome: "Maria Silva", email: "maria@x.com", senha: "Provisoria#1",
      linkCriarSenha: "https://plat/api/auth/reset-password/abc",
    });
    expect(html).toContain("Provisoria#1");
    expect(html).toContain("https://plat/api/auth/reset-password/abc");
    expect(text).toContain("Criar minha senha e entrar");
    // Trata a pessoa pelo primeiro nome.
    expect(html).toContain("Maria");
  });

  it("omite o botão quando não há link", () => {
    const { html } = acessoPlataformaEmail({ nome: "N", email: "a@b.com", senha: "S" });
    expect(html).not.toContain("Criar minha senha e entrar");
  });

  it("muda o texto conforme o motivo da troca de senha", () => {
    const primeiro = confirmarTrocaSenhaEmail({
      nome: "N", motivo: "primeiro-acesso", url: "https://x", validadeMinutos: 60,
    });
    const esqueci = confirmarTrocaSenhaEmail({
      nome: "N", motivo: "esqueci-senha", url: "https://x", validadeMinutos: 60,
    });
    expect(primeiro.html).toContain("senha provisória");
    expect(esqueci.html).toContain("redefinir a senha");
    expect(assuntoConfirmarTrocaSenha("primeiro-acesso")).not.toBe(
      assuntoConfirmarTrocaSenha("esqueci-senha"),
    );
  });

  it("informa a validade do link em minutos", () => {
    const { html, text } = confirmarTrocaSenhaEmail({
      nome: "N", motivo: "esqueci-senha", url: "https://x", validadeMinutos: 60,
    });
    expect(html).toContain("60 minutos");
    expect(text).toContain("60 minutos");
  });

  it("tem um assunto próprio por tipo de lead", () => {
    const assuntos = (["presencial", "curador", "patrocinador"] as const).map(assuntoLead);
    expect(new Set(assuntos).size).toBe(3);
  });

  it("omite a seção de mensagem quando ela vem vazia", () => {
    const { html, text } = leadPlataformaEmail({
      tipo: "curador", nome: "N", email: "a@b.com",
      empresa: "E", cargo: "C", telefone: "1", mensagem: "",
    });
    expect(html).not.toContain("Mensagem");
    expect(text).not.toContain("Mensagem:");
  });
});
