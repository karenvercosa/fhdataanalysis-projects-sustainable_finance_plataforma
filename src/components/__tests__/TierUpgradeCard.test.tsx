import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const usuario = { user: { email: "curadoria@x.com", tier: "Bronze" as string | undefined } };
vi.mock("@/context/AuthContext", () => ({ useAuth: () => usuario }));

const { DEFAULT_TIER_MATRIX, UNRESTRICTED } = await import("@/data/tierMatrix");

const matriz = {
  matrix: DEFAULT_TIER_MATRIX,
  featuresOf: (nome?: string) =>
    DEFAULT_TIER_MATRIX.find((t) => t.name === nome)?.features ?? UNRESTRICTED,
};
vi.mock("@/context/TierMatrixContext", () => ({ useTierMatrix: () => matriz }));

const { TierUpgradeCard } = await import("@/components/TierUpgradeCard");
const { TIER_UPGRADE_KEY, COMMERCIAL_CONTACT } = await import("@/data/sponsorTiers");

/** Nomes das cotas, da menor para a maior, na ordem que o Admin controla. */
const COTAS = DEFAULT_TIER_MATRIX.map((t) => t.name);
const MENOR = COTAS[0];
const MAIOR = COTAS[COTAS.length - 1];

beforeEach(() => {
  localStorage.clear();
  usuario.user = { email: "curadoria@x.com", tier: MENOR };
});

describe("estado inicial", () => {
  it("nasce recolhido, mostrando a cota atual", async () => {
    render(<TierUpgradeCard />);

    const cabecalho = screen.getByRole("button", { expanded: false });
    expect(cabecalho).toHaveTextContent("Upgrade de cota");
    expect(cabecalho).toHaveTextContent(MENOR);
  });

  it("o cabeçalho expande e recolhe o painel", async () => {
    render(<TierUpgradeCard />);

    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });

  it("oferece todas as cotas acima da atual — dá para pular níveis", async () => {
    render(<TierUpgradeCard />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    for (const cota of COTAS.slice(1)) {
      expect(screen.getByRole("button", { name: `Quero a cota ${cota}` })).toBeInTheDocument();
    }
  });

  it("na cota máxima, o convite passa a ser sobre renovação", async () => {
    usuario.user = { email: "curadoria@x.com", tier: MAIOR };
    render(<TierUpgradeCard />);

    const cabecalho = screen.getByRole("button", { expanded: false });
    expect(cabecalho).toHaveTextContent("Sua cota de patrocínio");
    expect(cabecalho).toHaveTextContent(/cota máxima/);

    await userEvent.click(cabecalho);
    expect(screen.getByRole("button", { name: /Falar com o comercial/ })).toBeInTheDocument();
  });

  it("sem cota no cadastro, assume a primeira da matriz", () => {
    usuario.user = { email: "curadoria@x.com", tier: undefined };

    render(<TierUpgradeCard />);

    expect(screen.getByRole("button", { expanded: false })).toHaveTextContent(MENOR);
  });
});

describe("solicitação de upgrade", () => {
  const abrirModal = async () => {
    render(<TierUpgradeCard />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    await userEvent.click(screen.getByRole("button", { name: `Quero a cota ${MAIOR}` }));
  };

  it("o modal já vem na cota clicada e mostra o comercial responsável", async () => {
    await abrirModal();

    expect(screen.getByRole("dialog", { name: `Upgrade para a cota ${MAIOR}` })).toBeInTheDocument();
    expect(screen.getByText(COMMERCIAL_CONTACT.name)).toBeInTheDocument();
  });

  it("dá para trocar a cota escolhida sem fechar o modal", async () => {
    await abrirModal();

    const seletor = screen.getByLabelText("Cota desejada");
    expect(seletor).toHaveValue(MAIOR);

    await userEvent.selectOptions(seletor, COTAS[1]);

    expect(screen.getByRole("dialog", { name: `Upgrade para a cota ${COTAS[1]}` })).toBeInTheDocument();
  });

  it("enviada, a devolutiva cita o e-mail do cadastro", async () => {
    await abrirModal();

    await userEvent.type(screen.getByLabelText(/Mensagem/), "Queremos o palco principal.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));

    expect(screen.getByText(`Recebemos o seu interesse na cota ${MAIOR}.`)).toBeInTheDocument();
    expect(screen.getByText(/curadoria@x.com/)).toBeInTheDocument();
  });

  it("a solicitação fica registrada no lugar da sugestão", async () => {
    await abrirModal();

    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    await userEvent.click(screen.getByRole("button", { name: "Concluir" }));

    expect(screen.getByText("Solicitação de upgrade enviada")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(TIER_UPGRADE_KEY)!)).toMatchObject({
      from: MENOR,
      to: MAIOR,
    });
  });

  it("dá para cancelar a solicitação e voltar a ver a oferta", async () => {
    await abrirModal();
    await userEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    await userEvent.click(screen.getByRole("button", { name: "Concluir" }));

    await userEvent.click(screen.getByRole("button", { name: "Cancelar solicitação" }));

    expect(screen.getByText("Upgrade de cota")).toBeInTheDocument();
    expect(screen.queryByText("Solicitação de upgrade enviada")).not.toBeInTheDocument();
  });

  it("cancelar o modal não registra nada", async () => {
    await abrirModal();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Upgrade de cota")).toBeInTheDocument();
    expect(screen.queryByText("Solicitação de upgrade enviada")).not.toBeInTheDocument();
  });

  it("na cota máxima o modal fala de renovação, sem seletor de cota", async () => {
    usuario.user = { email: "curadoria@x.com", tier: MAIOR };
    render(<TierUpgradeCard />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    await userEvent.click(screen.getByRole("button", { name: /Falar com o comercial/ }));

    expect(screen.getByRole("dialog", { name: "Falar com o comercial" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Cota desejada")).not.toBeInTheDocument();
  });
});
