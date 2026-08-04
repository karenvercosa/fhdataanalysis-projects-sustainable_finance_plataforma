import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createTransport = vi.fn();
const sendMail = vi.fn();

vi.mock("nodemailer", () => ({
  default: { createTransport: (...a: unknown[]) => createTransport(...a) },
  createTransport: (...a: unknown[]) => createTransport(...a),
}));

const AMBIENTE = {
  SMTP_USER: "envio@sf.com",
  SMTP_PASSWORD: "segredo",
  EMAIL_FROM: "envio@sf.com",
  EMAIL_TO: "comercial@sf.com",
};

/**
 * O transporter é memoizado no módulo, então cada cenário reimporta o serviço
 * do zero — é o que permite testar a falta de configuração de SMTP sem que a
 * instância criada num teste anterior mascare o erro.
 */
async function importarServico() {
  vi.resetModules();
  createTransport.mockReturnValue({ sendMail });
  return import("@/services/email.service");
}

const ACESSO = { nome: "Pessoa", email: "p@t.com", senha: "Provisoria1!" };
const TROCA = { email: "p@t.com", nome: "Pessoa", motivo: "esqueci-senha" as const, url: "https://x", validadeMinutos: 60 };
const VOUCHERS = { nome: "Curador", email: "c@t.com", empresa: "ACME", quantidade: 50, motivo: "preciso de mais" };
const LEAD = {
  tipo: "presencial" as const,
  nome: "Pessoa",
  email: "p@t.com",
  telefone: "+5562999998888",
  empresa: "ACME",
  cargo: "CTO",
  mensagem: "quero participar",
};

beforeEach(() => {
  Object.assign(process.env, AMBIENTE);
  sendMail.mockReset().mockResolvedValue({ messageId: "msg-1" });
  createTransport.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const chave of Object.keys(AMBIENTE)) delete process.env[chave];
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.BETTER_AUTH_URL_PLATAFORMA;
});

describe("transporter", () => {
  it("porta 465 fala TLS desde o handshake", async () => {
    process.env.SMTP_PORT = "465";
    const { sendAcessoPlataformaEmail } = await importarServico();

    await sendAcessoPlataformaEmail(ACESSO);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true, host: "smtp.gmail.com" }),
    );
  });

  it("porta 587 sobe para TLS via STARTTLS", async () => {
    process.env.SMTP_PORT = "587";
    process.env.SMTP_HOST = "smtp.empresa.com";
    const { sendAcessoPlataformaEmail } = await importarServico();

    await sendAcessoPlataformaEmail(ACESSO);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false, host: "smtp.empresa.com" }),
    );
  });

  it("é criado uma única vez, mesmo com vários envios", async () => {
    const { sendAcessoPlataformaEmail, sendLeadPlataformaEmail } = await importarServico();

    await sendAcessoPlataformaEmail(ACESSO);
    await sendLeadPlataformaEmail(LEAD);

    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("sem credenciais o envio falha com mensagem clara, sem derrubar a rota", async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    const { sendAcessoPlataformaEmail } = await importarServico();

    await expect(sendAcessoPlataformaEmail(ACESSO)).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("SMTP não configurado"),
    });
    expect(createTransport).not.toHaveBeenCalled();
  });
});

describe("sendAcessoPlataformaEmail", () => {
  it("vai para o e-mail do cadastro, com o assunto do primeiro acesso", async () => {
    const { sendAcessoPlataformaEmail } = await importarServico();

    await expect(sendAcessoPlataformaEmail(ACESSO)).resolves.toEqual({
      success: true,
      id: "msg-1",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "p@t.com",
        from: "Sustainable Finance <envio@sf.com>",
        subject: expect.any(String),
        html: expect.stringContaining("<"),
        text: expect.any(String),
      }),
    );
  });

  it("repassa a URL da plataforma para o template", async () => {
    process.env.BETTER_AUTH_URL_PLATAFORMA = "https://plataforma.sf.com";
    const { sendAcessoPlataformaEmail } = await importarServico();

    await sendAcessoPlataformaEmail(ACESSO);

    expect(sendMail.mock.calls[0][0].html).toContain("https://plataforma.sf.com");
  });

  it("falha de SMTP vira `success: false` em vez de exceção", async () => {
    const { sendAcessoPlataformaEmail } = await importarServico();
    sendMail.mockRejectedValue(new Error("conexão recusada"));

    await expect(sendAcessoPlataformaEmail(ACESSO)).resolves.toEqual({
      success: false,
      error: "conexão recusada",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("erro sem mensagem ganha um texto genérico", async () => {
    const { sendAcessoPlataformaEmail } = await importarServico();
    sendMail.mockRejectedValue({});

    await expect(sendAcessoPlataformaEmail(ACESSO)).resolves.toMatchObject({
      error: "Erro ao enviar e-mail.",
    });
  });
});

describe("sendConfirmacaoTrocaSenhaEmail", () => {
  it("o assunto muda conforme o motivo", async () => {
    const { sendConfirmacaoTrocaSenhaEmail } = await importarServico();

    await sendConfirmacaoTrocaSenhaEmail(TROCA);
    const esqueci = sendMail.mock.calls[0][0].subject;

    await sendConfirmacaoTrocaSenhaEmail({ ...TROCA, motivo: "primeiro-acesso" });
    const primeiro = sendMail.mock.calls[1][0].subject;

    expect(esqueci).not.toBe(primeiro);
  });

  it("vai para o endereço da pessoa", async () => {
    const { sendConfirmacaoTrocaSenhaEmail } = await importarServico();

    await expect(sendConfirmacaoTrocaSenhaEmail(TROCA)).resolves.toMatchObject({ success: true });
    expect(sendMail.mock.calls[0][0].to).toBe("p@t.com");
  });

  it("falha de SMTP é registrada e devolvida", async () => {
    const { sendConfirmacaoTrocaSenhaEmail } = await importarServico();
    sendMail.mockRejectedValue(new Error("timeout"));

    await expect(sendConfirmacaoTrocaSenhaEmail(TROCA)).resolves.toEqual({
      success: false,
      error: "timeout",
    });
  });
});

describe("sendSolicitacaoVouchersEmail", () => {
  it("vai para a caixa comercial com replyTo no solicitante", async () => {
    const { sendSolicitacaoVouchersEmail } = await importarServico();

    await expect(sendSolicitacaoVouchersEmail(VOUCHERS)).resolves.toMatchObject({ success: true });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "comercial@sf.com",
        replyTo: "c@t.com",
        from: "Sustainable Finance <envio@sf.com>",
      }),
    );
  });

  it("sem EMAIL_TO cai no próprio remetente", async () => {
    delete process.env.EMAIL_TO;
    const { sendSolicitacaoVouchersEmail } = await importarServico();

    await sendSolicitacaoVouchersEmail(VOUCHERS);

    expect(sendMail.mock.calls[0][0].to).toBe("envio@sf.com");
  });

  it("falha de SMTP é registrada e devolvida", async () => {
    const { sendSolicitacaoVouchersEmail } = await importarServico();
    sendMail.mockRejectedValue(new Error("recusado"));

    await expect(sendSolicitacaoVouchersEmail(VOUCHERS)).resolves.toMatchObject({
      success: false,
      error: "recusado",
    });
  });
});

describe("sendLeadPlataformaEmail", () => {
  it("vai para a caixa comercial com replyTo em quem preencheu", async () => {
    const { sendLeadPlataformaEmail } = await importarServico();

    await expect(sendLeadPlataformaEmail(LEAD)).resolves.toMatchObject({ success: true });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "comercial@sf.com", replyTo: "p@t.com" }),
    );
  });

  it("o assunto identifica o tipo do lead", async () => {
    const { sendLeadPlataformaEmail } = await importarServico();

    await sendLeadPlataformaEmail(LEAD);
    await sendLeadPlataformaEmail({ ...LEAD, tipo: "patrocinador" });

    expect(sendMail.mock.calls[0][0].subject).not.toBe(sendMail.mock.calls[1][0].subject);
  });

  it("falha de SMTP é registrada e devolvida", async () => {
    const { sendLeadPlataformaEmail } = await importarServico();
    sendMail.mockRejectedValue(new Error("sem rota"));

    await expect(sendLeadPlataformaEmail(LEAD)).resolves.toMatchObject({
      success: false,
      error: "sem rota",
    });
  });
});
