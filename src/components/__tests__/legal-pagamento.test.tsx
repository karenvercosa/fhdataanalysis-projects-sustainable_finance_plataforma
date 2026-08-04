import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const consentimento = {
  pendente: true,
  aceitarTodos: vi.fn(),
  salvar: vi.fn(),
  revisar: vi.fn(),
  painelAberto: false,
  abrirPainel: vi.fn(),
  fecharPainel: vi.fn(),
};
vi.mock("@/context/CookieConsentContext", () => ({ useCookieConsent: () => consentimento }));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Marina Costa", email: "marina@x.com" } }),
}));

const { CookieBanner } = await import("@/components/legal/CookieBanner");
const { LegalModal } = await import("@/components/legal/LegalModal");
const { SponsorShareNotice } = await import("@/components/legal/SponsorShareNotice");
const { BoletoStep } = await import("@/components/pagamento/BoletoStep");
const { CartaoStep } = await import("@/components/pagamento/CartaoStep");
const { PixStep } = await import("@/components/pagamento/PixStep");
const { Aguardando, PlanoCard, Wrapper, formatarCep } = await import(
  "@/components/pagamento/shared"
);
const { LEGAL_DOCS } = await import("@/data/legal");

beforeEach(() => {
  Object.assign(consentimento, { pendente: true, painelAberto: false });
  consentimento.aceitarTodos.mockReset();
  consentimento.salvar.mockReset();
  consentimento.revisar.mockReset();
  consentimento.abrirPainel.mockReset();
  consentimento.fecharPainel.mockReset();
});

describe("CookieBanner", () => {
  it("some depois da primeira decisão", () => {
    consentimento.pendente = false;

    const { container } = render(<CookieBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("aparece fixado no rodapé sem bloquear a navegação", () => {
    render(<CookieBanner />);

    expect(screen.getByRole("region", { name: "Aviso de cookies" })).toBeInTheDocument();
  });

  it("'Aceitar todos' registra o consentimento completo", async () => {
    render(<CookieBanner />);

    await userEvent.click(screen.getByRole("button", { name: "Aceitar todos" }));

    expect(consentimento.aceitarTodos).toHaveBeenCalledOnce();
  });

  it("'Configurar cookies' abre o painel de categorias", async () => {
    render(<CookieBanner />);

    await userEvent.click(screen.getByRole("button", { name: "Configurar cookies" }));

    expect(consentimento.abrirPainel).toHaveBeenCalledOnce();
  });

  it("os necessários não podem ser desligados", () => {
    consentimento.painelAberto = true;

    render(<CookieBanner />);

    expect(screen.getByRole("switch", { name: "Cookies de Necessários" })).toBeDisabled();
    expect(screen.getByText("Sempre ativo")).toBeInTheDocument();
  });

  it("salva só as categorias que ficaram ligadas", async () => {
    consentimento.painelAberto = true;
    render(<CookieBanner />);

    await userEvent.click(screen.getByRole("switch", { name: "Cookies de Marketing" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));

    expect(consentimento.salvar).toHaveBeenCalledWith({ analytics: true, marketing: false });
    expect(consentimento.fecharPainel).toHaveBeenCalled();
  });

  it("cancelar fecha o painel sem gravar nada", async () => {
    consentimento.painelAberto = true;
    render(<CookieBanner />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(consentimento.salvar).not.toHaveBeenCalled();
    expect(consentimento.fecharPainel).toHaveBeenCalled();
  });

  it("os links do texto abrem o documento correspondente", async () => {
    render(<CookieBanner />);

    await userEvent.click(screen.getByRole("button", { name: "Política de Cookies" }));

    expect(screen.getByRole("dialog", { name: "Legal & Privacidade" })).toBeInTheDocument();
  });
});

describe("LegalModal", () => {
  it("fechado não aparece", () => {
    render(<LegalModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre nos termos por padrão", () => {
    render(<LegalModal open onClose={vi.fn()} />);

    expect(screen.getByText(LEGAL_DOCS.termos.sections[0].heading)).toBeInTheDocument();
  });

  it("respeita o documento inicial pedido", () => {
    render(<LegalModal open onClose={vi.fn()} docInicial="privacidade" />);

    expect(screen.getByText(LEGAL_DOCS.privacidade.sections[0].heading)).toBeInTheDocument();
  });

  it("troca de documento sem fechar o modal", async () => {
    render(<LegalModal open onClose={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(LEGAL_DOCS.cookies.title) }),
    );

    expect(screen.getByText(LEGAL_DOCS.cookies.sections[0].heading)).toBeInTheDocument();
  });

  it("reabre sempre no documento pedido, e não no da montagem anterior", async () => {
    const { rerender } = render(<LegalModal open onClose={vi.fn()} docInicial="termos" />);

    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(LEGAL_DOCS.cookies.title) }),
    );
    rerender(<LegalModal open={false} onClose={vi.fn()} docInicial="privacidade" />);
    rerender(<LegalModal open onClose={vi.fn()} docInicial="privacidade" />);

    expect(screen.getByText(LEGAL_DOCS.privacidade.sections[0].heading)).toBeInTheDocument();
  });

  it("'Preferências de cookies' reabre a decisão e fecha o leitor", async () => {
    const onClose = vi.fn();
    render(<LegalModal open onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Preferências de cookies" }));

    expect(consentimento.revisar).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("SponsorShareNotice", () => {
  const props = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    patrocinador: "AgroVerde",
  };

  it("diz quem recebe os dados e quais são", () => {
    render(<SponsorShareNotice {...props} material="Relatório ESG" />);

    expect(screen.getByText("AgroVerde")).toBeInTheDocument();
    expect(screen.getByText("Relatório ESG")).toBeInTheDocument();
    expect(screen.getByText(/Marina Costa · marina@x.com/)).toBeInTheDocument();
  });

  it("sem nome do material, usa o texto genérico", () => {
    render(<SponsorShareNotice {...props} />);

    expect(screen.getByText(/este material/)).toBeInTheDocument();
  });

  it("dá a chance de desistir antes de baixar", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<SponsorShareNotice {...props} onClose={onClose} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Concordar e baixar/ }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe("peças compartilhadas do pagamento", () => {
  it("formatarCep guarda só dígitos e aplica a máscara", () => {
    expect(formatarCep("74000000")).toBe("74000-000");
    expect(formatarCep("74a00")).toBe("7400");
    expect(formatarCep("740000009999")).toBe("74000-000");
    expect(formatarCep("")).toBe("");
  });

  it("o Wrapper só mostra o popup quando pedido", () => {
    const { rerender } = render(
      <Wrapper showPopup={false} popupText="Pagamento confirmado!">
        <p>etapa</p>
      </Wrapper>,
    );

    expect(screen.queryByText("Pagamento confirmado!")).not.toBeInTheDocument();

    rerender(
      <Wrapper showPopup popupText="Pagamento confirmado!">
        <p>etapa</p>
      </Wrapper>,
    );

    expect(screen.getByText("Pagamento confirmado!")).toBeInTheDocument();
  });

  it("o PlanoCard resume o produto escolhido", () => {
    render(<PlanoCard nome="Online" desc="Acesso digital" valor="R$ 199" periodo="ano" />);

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("/ano")).toBeInTheDocument();
  });

  it("Aguardando mostra o texto da espera", () => {
    render(<Aguardando texto="Aguardando confirmação" />);

    expect(screen.getByText("Aguardando confirmação")).toBeInTheDocument();
  });
});

describe("PixStep", () => {
  it("mostra o copia-e-cola e o QR quando o Asaas responde", () => {
    render(
      <PixStep
        pix={{ payload: "00020126", encodedImage: "QUJD" }}
        copied={false}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("00020126")).toBeInTheDocument();
    expect(screen.getByAltText("QR Code PIX")).toHaveAttribute(
      "src",
      "data:image/png;base64,QUJD",
    );
  });

  it("sem dados ainda, o campo fica vazio e sem QR", () => {
    render(<PixStep pix={null} copied={false} onCopy={vi.fn()} />);

    expect(screen.queryByAltText("QR Code PIX")).not.toBeInTheDocument();
  });

  it("copiar avisa que copiou", async () => {
    const onCopy = vi.fn();
    const { rerender } = render(
      <PixStep pix={{ payload: "x", encodedImage: "" }} copied={false} onCopy={onCopy} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /btnCopiar/ }));
    expect(onCopy).toHaveBeenCalledOnce();

    rerender(<PixStep pix={{ payload: "x", encodedImage: "" }} copied onCopy={onCopy} />);
    expect(screen.getByRole("button", { name: /copiado/ })).toBeInTheDocument();
  });
});

describe("BoletoStep", () => {
  it("mostra a linha digitável e o link do PDF", () => {
    render(
      <BoletoStep
        boleto={{ identificationField: "34191.79001", bankSlipUrl: "https://asaas/boleto.pdf" }}
      />,
    );

    expect(screen.getByDisplayValue("34191.79001")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://asaas/boleto.pdf");
    // Abre em outra aba sem dar acesso à janela de origem.
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("sem boleto ainda, só a espera aparece", () => {
    render(<BoletoStep boleto={null} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("boletoAguardando")).toBeInTheDocument();
  });
});

describe("CartaoStep", () => {
  const CARTAO = {
    holderName: "MARINA COSTA",
    number: "4111111111111111",
    expiryMonth: "12",
    expiryYear: "2030",
    ccv: "123",
  };
  const TITULAR = { postalCode: "74000000", addressNumber: "123" };

  const montar = (over: Partial<Parameters<typeof CartaoStep>[0]> = {}) => {
    const onCardChange = vi.fn(() => vi.fn());
    const onTitularChange = vi.fn(() => vi.fn());
    const onPagar = vi.fn();
    render(
      <CartaoStep
        card={CARTAO}
        onCardChange={onCardChange}
        titular={TITULAR}
        onTitularChange={onTitularChange}
        submitting={false}
        errorMsg={null}
        onPagar={onPagar}
        {...over}
      />,
    );
    return { onPagar };
  };

  it("preenche os campos com o cartão informado", () => {
    montar();

    expect(screen.getByDisplayValue("MARINA COSTA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4111111111111111")).toBeInTheDocument();
  });

  it("o CEP aparece com máscara", () => {
    montar();

    expect(screen.getByDisplayValue("74000-000")).toBeInTheDocument();
  });

  it("a recusa do gateway é anunciada como alerta", () => {
    montar({ errorMsg: "Cartão recusado pelo emissor." });

    expect(screen.getByRole("alert")).toHaveTextContent("Cartão recusado pelo emissor.");
  });

  it("paga ao confirmar", async () => {
    const { onPagar } = montar();

    await userEvent.click(screen.getByRole("button", { name: /btnRealizarPagamento/ }));

    expect(onPagar).toHaveBeenCalledOnce();
  });

  it("enquanto processa, o botão fica travado", () => {
    montar({ submitting: true });

    expect(screen.getByRole("button", { name: /processando/ })).toBeDisabled();
  });
});
