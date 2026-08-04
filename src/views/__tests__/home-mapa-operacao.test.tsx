import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { type Role } from "@/lib/roles";

const auth = {
  user: {
    name: "Marina Costa",
    email: "marina@x.com",
    role: "attendee" as Role,
    hasCredential: true as boolean | undefined,
    ticketCode: "SF26-AAAA-BBBB" as string | undefined,
    cargo: "CTO" as string | null,
    empresaNome: "ACME" as string | null,
    avatarUrl: undefined as string | undefined,
    voucherPendente: null as { codigo: string; empresaNome: string } | null,
  },
  can: vi.fn(() => true),
};
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

const sessoes = { sessions: [] as any[] };
vi.mock("@/context/SessionsContext", () => ({ useSessions: () => sessoes }));

const checkin = {
  attendees: [] as any[],
  toggle: vi.fn(),
  stats: { total: 0, credentialed: 0, pending: 0, rate: 0 },
};
vi.mock("@/context/CheckinContext", () => ({ useCheckin: () => checkin }));

const api = { post: vi.fn(async () => ({})) };
vi.mock("@/lib/admin-api", () => ({ api }));

const HomePage = (await import("@/views/HomePage")).default;
const MapPage = (await import("@/views/MapPage")).default;
const OperatorPanel = (await import("@/views/OperatorPanel")).default;

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const PESSOA = (over: object = {}) => ({
  id: "a1",
  name: "Bruno Lima",
  company: "ACME",
  email: "bruno@x.com",
  cpf: "123.456.789-09",
  code: "SF26-0001",
  status: "Confirmado",
  ...over,
});

beforeEach(() => {
  auth.user = {
    name: "Marina Costa",
    email: "marina@x.com",
    role: "attendee",
    hasCredential: true,
    ticketCode: "SF26-AAAA-BBBB",
    cargo: "CTO",
    empresaNome: "ACME",
    avatarUrl: undefined,
    voucherPendente: null,
  };
  auth.can.mockReset().mockReturnValue(true);
  sessoes.sessions = [];
  checkin.attendees = [PESSOA()];
  checkin.toggle.mockReset();
  checkin.stats = { total: 1, credentialed: 0, pending: 1, rate: 0 };
  api.post.mockClear();
});

afterEach(() => vi.restoreAllMocks());

describe("HomePage", () => {
  it("cumprimenta e mostra a data do evento", () => {
    rota(<HomePage />);

    expect(screen.getByRole("heading", { name: "Olá, Marina" })).toBeInTheDocument();
    expect(screen.getByText(/04 de Setembro, 2026/)).toBeInTheDocument();
  });

  it("o voucher pendente é a primeira coisa da tela, e explica o motivo", () => {
    auth.user.voucherPendente = { codigo: "VERDE2026", empresaNome: "Patrocinadora" };

    rota(<HomePage />);

    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("Patrocinadora");
    expect(aviso).toHaveTextContent("VERDE2026");
  });

  it("o Plano Gratuito vê os atalhos premium bloqueados", () => {
    auth.user.role = "guest";

    rota(<HomePage />);

    expect(
      screen.getByRole("button", { name: "Conteúdos — exclusivo para membros" }),
    ).toBeInTheDocument();
    // O "ao vivo" segue liberado no gratuito.
    expect(screen.getByRole("link", { name: /Ao Vivo/ })).toBeInTheDocument();
  });

  it("clicar num atalho bloqueado abre o paywall nomeando o recurso", async () => {
    auth.user.role = "guest";
    rota(<HomePage />);

    await userEvent.click(screen.getByRole("button", { name: /Networking & Conexões — exclusivo/ }));

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Networking & Conexões")).toBeInTheDocument();
  });

  it("o gratuito recebe o convite de pré-inscrição presencial", () => {
    auth.user.role = "guest";

    rota(<HomePage />);

    expect(screen.getByText("Garanta sua vaga presencial")).toBeInTheDocument();
  });

  it("o gratuito também vê a captação comercial", () => {
    auth.user.role = "guest";

    rota(<HomePage />);

    expect(screen.getByRole("region", { name: "Seja parceiro do Summit" })).toBeInTheDocument();
  });

  it("quem já tem ingresso não vê a captação nem a pré-inscrição", () => {
    rota(<HomePage />);

    expect(screen.queryByRole("region", { name: "Seja parceiro do Summit" })).not.toBeInTheDocument();
    expect(screen.queryByText("Garanta sua vaga presencial")).not.toBeInTheDocument();
  });

  it("o card 'Eu vou' é de quem tem ingresso", () => {
    const { unmount } = rota(<HomePage />);
    expect(screen.getByText("Conte que você vai")).toBeInTheDocument();
    unmount();

    auth.user.role = "guest";
    rota(<HomePage />);
    expect(screen.queryByText("Conte que você vai")).not.toBeInTheDocument();
  });

  it("o tipo exibido no card acompanha o papel", () => {
    auth.user.role = "curator";
    const { unmount } = rota(<HomePage />);
    expect(screen.getByText("Conte que você vai")).toBeInTheDocument();
    unmount();

    auth.user.role = "speaker";
    rota(<HomePage />);
    expect(screen.getByText("Conte que você vai")).toBeInTheDocument();
  });

  it("o atalho da credencial só existe com ingresso presencial", () => {
    const { unmount } = rota(<HomePage />);
    expect(screen.getByLabelText("Abrir Minha credencial")).toBeInTheDocument();
    unmount();

    auth.user.hasCredential = false;
    rota(<HomePage />);
    expect(screen.queryByLabelText("Abrir Minha credencial")).not.toBeInTheDocument();
  });

  it("sem a capacidade de compra, some o CTA de ingresso", () => {
    auth.can.mockImplementation((cap: string) => cap !== "purchase:ticket");

    rota(<HomePage />);

    expect(screen.queryByRole("link", { name: /ingresso|Membro Premium/ })).not.toBeInTheDocument();
  });
});

describe("MapPage", () => {
  it("mostra a planta e a legenda dos tipos de local", () => {
    rota(<MapPage />);

    expect(screen.getByAltText("Planta do evento")).toBeInTheDocument();
    expect(screen.getByText("Palco")).toBeInTheDocument();
    expect(screen.getByText("Serviços")).toBeInTheDocument();
  });

  it("convida a tocar num pin antes de qualquer escolha", () => {
    rota(<MapPage />);

    expect(screen.getByText(/Toque em um/)).toBeInTheDocument();
  });

  it("o zoom vai de 100% a 300% e volta ao início", async () => {
    rota(<MapPage />);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByLabelText("Afastar")).toBeDisabled();

    await userEvent.click(screen.getByLabelText("Aproximar"));
    expect(screen.getByText("150%")).toBeInTheDocument();

    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByLabelText("Aproximar"));
    expect(screen.getByText("300%")).toBeInTheDocument();
    expect(screen.getByLabelText("Aproximar")).toBeDisabled();

    await userEvent.click(screen.getByLabelText("Redefinir zoom"));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("local de serviço mostra a descrição", async () => {
    rota(<MapPage />);

    await userEvent.click(screen.getByLabelText("Credenciamento"));

    expect(screen.getByText(/retirada de credencial/)).toBeInTheDocument();
  });

  it("sala sem sessão programada diz isso", async () => {
    rota(<MapPage />);

    await userEvent.click(screen.getByLabelText("Sala A"));

    expect(screen.getByText("Nenhuma sessão programada para este local.")).toBeInTheDocument();
  });

  it("sala com sessões lista os horários em ordem", async () => {
    sessoes.sessions = [
      {
        id: "s2",
        title: "Segunda",
        room: "Sala A",
        start: "14:00",
        end: "15:00",
        track: "Finanças",
        speaker: "Fulana",
        capacity: 80,
      },
      {
        id: "s1",
        title: "Primeira",
        room: "Sala A",
        start: "09:00",
        end: "10:00",
        track: "Finanças",
        speaker: "Beltrana",
        capacity: 50,
      },
    ];
    rota(<MapPage />);

    await userEvent.click(screen.getByLabelText("Sala A"));

    const itens = screen.getAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("Primeira");
    expect(itens[1]).toHaveTextContent("Segunda");
    expect(itens[0]).toHaveTextContent("50 vagas");
  });

  it("dá para fechar o detalhe do ponto", async () => {
    rota(<MapPage />);

    await userEvent.click(screen.getByLabelText("Sala A"));
    await userEvent.click(screen.getByLabelText("Fechar detalhe"));

    expect(screen.getByText(/Toque em um/)).toBeInTheDocument();
  });

  it("sem a capacidade, o mapa vira amostra desfocada", () => {
    auth.can.mockReturnValue(false);

    rota(<MapPage />);

    expect(screen.getByText("Acesso limitado")).toBeInTheDocument();
  });
});

describe("OperatorPanel", () => {
  beforeEach(() => {
    // O download real cria um Blob e um link — em jsdom, basta não estourar.
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:x"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("mostra os números do credenciamento", () => {
    checkin.stats = { total: 10, credentialed: 4, pending: 6, rate: 40 };

    rota(<OperatorPanel />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("busca por nome, e-mail, CPF ou código", async () => {
    checkin.attendees = [PESSOA(), PESSOA({ id: "a2", name: "Carla", code: "SF26-0002" })];
    rota(<OperatorPanel />);

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/), "SF26-0002");

    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument();
  });

  it("busca sem resultado explica o que não achou", async () => {
    rota(<OperatorPanel />);

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/), "ninguém");

    expect(screen.getByText(/Nenhum participante encontrado/)).toBeInTheDocument();
  });

  it("confirmar a bipagem avisa na tela", async () => {
    rota(<OperatorPanel />);

    await userEvent.click(screen.getByLabelText("Confirmar bipagem de Bruno Lima"));

    expect(checkin.toggle).toHaveBeenCalledWith("a1");
    expect(screen.getByText(/Bruno Lima marcado\(a\) como bipado\(a\)/)).toBeInTheDocument();
  });

  it("desfazer o check também é avisado", async () => {
    checkin.attendees = [PESSOA({ status: "Credenciado" })];
    rota(<OperatorPanel />);

    await userEvent.click(screen.getByLabelText("Confirmar bipagem de Bruno Lima"));

    expect(screen.getByText(/Check de Bruno Lima removido/)).toBeInTheDocument();
  });

  it("baixa a credencial de um participante", async () => {
    rota(<OperatorPanel />);

    await userEvent.click(screen.getByLabelText("Baixar credencial de Bruno Lima"));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByText(/Credencial de Bruno Lima baixada/)).toBeInTheDocument();
  });

  it("exporta a lista completa em CSV", async () => {
    rota(<OperatorPanel />);

    await userEvent.click(screen.getByRole("button", { name: /Relatório CSV/ }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByText(/Relatório CSV baixado/)).toBeInTheDocument();
  });
});
