import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), remove: vi.fn() };
vi.mock("@/lib/admin-api", () => ({ api }));

const { PartnershipBanners } = await import("@/components/PartnershipBanners");
const { PreInscricaoPresencial } = await import("@/components/PreInscricaoPresencial");
const { SolicitarVouchers } = await import("@/components/SolicitarVouchers");
const { CompletarCadastro } = await import("@/components/CompletarCadastro");

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  api.post.mockReset().mockResolvedValue({});
  vi.stubGlobal("fetch", vi.fn());
});

/** Preenche empresa, cargo e telefone — os três campos obrigatórios dos leads. */
async function preencherLead() {
  await userEvent.type(screen.getByLabelText("Empresa"), "ACME");
  await userEvent.type(screen.getByLabelText("Cargo"), "Diretora");
  await userEvent.type(screen.getByLabelText("Telefone / WhatsApp"), "+5562999998888");
}

describe("PartnershipBanners", () => {
  const montar = () => rota(<PartnershipBanners nome="Marina Costa" />);

  it("convida para os dois papéis comerciais", () => {
    montar();

    expect(screen.getByRole("button", { name: /Quero ser Curador/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quero patrocinar/ })).toBeInTheDocument();
  });

  it("o envio fica travado até empresa, cargo e telefone", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Quero ser Curador/ }));
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    await preencherLead();

    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });

  it("manda o lead com o tipo do banner escolhido", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Quero patrocinar/ }));
    await preencherLead();
    await userEvent.type(screen.getByLabelText(/objetivo da sua marca/), " Marca no palco ");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/leads", {
        tipo: "patrocinador",
        empresa: "ACME",
        cargo: "Diretora",
        telefone: "+5562999998888",
        mensagem: "Marca no palco",
      }),
    );
  });

  it("depois do envio o banner passa a mostrar o interesse registrado", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Quero ser Curador/ }));
    await preencherLead();
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText(/Recebemos seu interesse, Marina/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Concluir" }));

    expect(screen.getByText(/Interesse registrado — entraremos em contato/)).toBeInTheDocument();
  });

  it("falha no envio vira alerta, sem marcar como enviado", async () => {
    api.post.mockRejectedValue(new Error("Caixa comercial indisponível."));
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Quero ser Curador/ }));
    await preencherLead();
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Caixa comercial indisponível.");
  });

  it("cancelar fecha sem enviar nada", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Quero ser Curador/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra o contato comercial no convite de patrocínio", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /Quero patrocinar/ }));

    expect(screen.getByRole("link", { name: /@/ })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });
});

describe("PreInscricaoPresencial", () => {
  const montar = (over = {}) =>
    rota(<PreInscricaoPresencial nome="Marina Costa" email="marina@x.com" {...over} />);

  it("explica o convite na versão de destaque", () => {
    montar({ destaque: true });

    expect(screen.getByText("Garanta sua vaga presencial")).toBeInTheDocument();
  });

  it("na versão discreta, a pergunta é curta", () => {
    montar();

    expect(screen.getByText(/Quer ir presencialmente e não tem voucher\?/)).toBeInTheDocument();
  });

  it("aproveita empresa e cargo já conhecidos do cadastro", async () => {
    montar({ empresaInicial: "ACME", cargoInicial: "Analista ESG" });

    await userEvent.click(screen.getByRole("button", { name: /Não tenho voucher/ }));

    expect(screen.getByLabelText("Empresa")).toHaveValue("ACME");
    expect(screen.getByLabelText("Cargo")).toHaveValue("Analista ESG");
  });

  it("envia o lead como presencial", async () => {
    montar({ empresaInicial: "ACME", cargoInicial: "Analista" });

    await userEvent.click(screen.getByRole("button", { name: /Não tenho voucher/ }));
    await userEvent.type(screen.getByLabelText("Telefone / WhatsApp"), "+5562999998888");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pré-inscrição" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/leads", {
        tipo: "presencial",
        empresa: "ACME",
        cargo: "Analista",
        telefone: "+5562999998888",
        mensagem: "",
      }),
    );
    expect(await screen.findByText(/Recebemos seu interesse, Marina/)).toBeInTheDocument();
  });

  it("registrada, o convite dá lugar à devolutiva", async () => {
    montar({ empresaInicial: "ACME", cargoInicial: "Analista" });

    await userEvent.click(screen.getByRole("button", { name: /Não tenho voucher/ }));
    await userEvent.type(screen.getByLabelText("Telefone / WhatsApp"), "+5562999998888");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pré-inscrição" }));
    await userEvent.click(await screen.findByRole("button", { name: "Concluir" }));

    expect(screen.getByText("Pré-inscrição registrada")).toBeInTheDocument();
  });

  it("falha no envio vira alerta", async () => {
    api.post.mockRejectedValue(new Error("Rede fora."));
    montar({ empresaInicial: "ACME", cargoInicial: "Analista" });

    await userEvent.click(screen.getByRole("button", { name: /Não tenho voucher/ }));
    await userEvent.type(screen.getByLabelText("Telefone / WhatsApp"), "+5562999998888");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pré-inscrição" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Rede fora.");
  });
});

describe("SolicitarVouchers", () => {
  const MOTIVO = "Quero convidar o time de sustentabilidade da holding.";

  it("explica que não é um checkout", () => {
    rota(<SolicitarVouchers />);

    expect(screen.getByText(/o time comercial avalia e responde por e-mail/)).toBeInTheDocument();
  });

  it("cobra uma justificativa mínima antes de liberar o envio", async () => {
    rota(<SolicitarVouchers />);

    expect(screen.getByRole("button", { name: /Enviar pedido/ })).toBeDisabled();
    expect(screen.getByText(/Escreva pelo menos 10 caracteres/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Por que você precisa/), MOTIVO);

    expect(screen.getByRole("button", { name: /Enviar pedido/ })).toBeEnabled();
  });

  it("envia quantidade e motivo já normalizados", async () => {
    rota(<SolicitarVouchers />);

    await userEvent.clear(screen.getByLabelText(/Quantos vouchers/));
    await userEvent.type(screen.getByLabelText(/Quantos vouchers/), "25");
    await userEvent.type(screen.getByLabelText(/Por que você precisa/), `  ${MOTIVO}  `);
    await userEvent.click(screen.getByRole("button", { name: /Enviar pedido/ }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/curador/solicitar-vouchers", {
        quantidade: 25,
        motivo: MOTIVO,
      }),
    );
  });

  it("confirma o pedido e permite fazer outro", async () => {
    rota(<SolicitarVouchers />);

    await userEvent.type(screen.getByLabelText(/Por que você precisa/), MOTIVO);
    await userEvent.click(screen.getByRole("button", { name: /Enviar pedido/ }));

    expect(await screen.findByText("Pedido enviado!")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fazer outro pedido" }));

    // O motivo é limpo para o próximo pedido não sair com a justificativa antiga.
    expect(screen.getByLabelText(/Por que você precisa/)).toHaveValue("");
  });

  it("a recusa do servidor aparece como alerta", async () => {
    api.post.mockRejectedValue(new Error("Fale com o time comercial."));
    rota(<SolicitarVouchers />);

    await userEvent.type(screen.getByLabelText(/Por que você precisa/), MOTIVO);
    await userEvent.click(screen.getByRole("button", { name: /Enviar pedido/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Fale com o time comercial.");
  });

  it("quantidade fora do inteiro positivo trava o envio", async () => {
    rota(<SolicitarVouchers />);

    await userEvent.type(screen.getByLabelText(/Por que você precisa/), MOTIVO);
    await userEvent.clear(screen.getByLabelText(/Quantos vouchers/));

    expect(screen.getByRole("button", { name: /Enviar pedido/ })).toBeDisabled();
  });
});

describe("CompletarCadastro", () => {
  const responde = (corpo: unknown, ok = true) =>
    vi.mocked(global.fetch).mockResolvedValue({ ok, json: async () => corpo } as Response);

  const preencher = async () => {
    await userEvent.type(screen.getByLabelText("labelCelular"), "62999998888");
    await userEvent.type(screen.getByLabelText("labelEmpresa"), "ACME");
    await userEvent.type(screen.getByLabelText("labelCargo"), "CTO");
  };

  it("só habilita a conclusão com celular válido, empresa e cargo", async () => {
    render(<CompletarCadastro onConcluido={vi.fn()} />);

    const botao = screen.getByRole("button", { name: /btnConcluirCadastro/ });
    expect(botao).toBeDisabled();

    await preencher();

    expect(botao).toBeEnabled();
  });

  it("avisa quando o celular digitado é inválido", async () => {
    render(<CompletarCadastro onConcluido={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("labelCelular"), "1");

    expect(screen.getByText("erroCelular")).toBeInTheDocument();
  });

  it("manda os dados corporativos e o voucher opcional", async () => {
    responde({ success: true, emailEnviado: true, email: "marina@x.com" });
    render(<CompletarCadastro onConcluido={vi.fn()} />);

    await preencher();
    await userEvent.type(screen.getByLabelText(/labelVoucher/), " VERDE2026 ");
    await userEvent.click(screen.getByRole("button", { name: /btnConcluirCadastro/ }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/cadastro/completar",
        expect.objectContaining({
          body: JSON.stringify({
            phone: "+5562999998888",
            empresa: "ACME",
            cargo: "CTO",
            voucher: "VERDE2026",
          }),
        }),
      ),
    );
  });

  it("conclui contando que a senha foi para o e-mail", async () => {
    responde({ success: true, emailEnviado: true, email: "marina@x.com" });
    const onConcluido = vi.fn();
    render(<CompletarCadastro onConcluido={onConcluido} />);

    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /btnConcluirCadastro/ }));

    await waitFor(() =>
      expect(onConcluido).toHaveBeenCalledWith(expect.stringContaining("sucessoSenhaDesc")),
    );
  });

  it("avisa quando o e-mail de acesso não saiu", async () => {
    responde({ success: true, emailEnviado: false });
    const onConcluido = vi.fn();
    render(<CompletarCadastro onConcluido={onConcluido} />);

    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /btnConcluirCadastro/ }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalledWith("sucessoEmailFalhou"));
  });

  it("quem já tinha senha conclui sem menção a e-mail", async () => {
    responde({ success: true });
    const onConcluido = vi.fn();
    render(<CompletarCadastro onConcluido={onConcluido} />);

    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /btnConcluirCadastro/ }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalledWith("sucessoDesc"));
  });

  it("mostra a mensagem de erro que o servidor devolveu", async () => {
    responde({ error: "Voucher inválido." }, false);
    render(<CompletarCadastro onConcluido={vi.fn()} />);

    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /btnConcluirCadastro/ }));

    expect(await screen.findByText("Voucher inválido.")).toBeInTheDocument();
  });

  it("rede fora vira mensagem genérica, sem quebrar a tela", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("offline"));
    render(<CompletarCadastro onConcluido={vi.fn()} />);

    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /btnConcluirCadastro/ }));

    expect(await screen.findByText("erroCadastro")).toBeInTheDocument();
  });
});
