import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  },
  can: vi.fn(() => true),
};
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

const favoritos = {
  isFavorite: vi.fn(() => false),
  toggle: vi.fn(),
  count: 0,
};
vi.mock("@/context/ConnectionFavoritesContext", () => ({
  useConnectionFavorites: () => favoritos,
}));

const participacao = { markWatched: vi.fn(), hasWatched: vi.fn(() => false) };
vi.mock("@/context/ParticipationContext", () => ({ useParticipation: () => participacao }));

const sessoes = { sessions: [] as any[] };
vi.mock("@/context/SessionsContext", () => ({ useSessions: () => sessoes }));

const ParticipantDashboard = (await import("@/views/ParticipantDashboard")).default;
const CredentialPage = (await import("@/views/CredentialPage")).default;
const CertificatePage = (await import("@/views/CertificatePage")).default;
const StreamingPage = (await import("@/views/StreamingPage")).default;
const Networking = (await import("@/views/Networking")).default;
const { CONNECTIONS } = await import("@/data/networking");

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const PAUTA = (over: object = {}) => ({
  id: "s1",
  title: "Abertura",
  speaker: "Fulana",
  track: "Finanças",
  room: "Auditório",
  start: "09:00",
  end: "10:00",
  ...over,
});

beforeEach(() => {
  auth.user = {
    name: "Marina Costa",
    email: "marina@x.com",
    role: "attendee",
    hasCredential: true,
    ticketCode: "SF26-AAAA-BBBB",
  };
  auth.can.mockReset().mockReturnValue(true);
  favoritos.isFavorite.mockReset().mockReturnValue(false);
  favoritos.toggle.mockReset();
  favoritos.count = 0;
  participacao.markWatched.mockReset();
  participacao.hasWatched.mockReset().mockReturnValue(false);
  sessoes.sessions = [];
});

afterEach(() => vi.useRealTimers());

describe("ParticipantDashboard", () => {
  it("cumprimenta pelo primeiro nome", () => {
    rota(<ParticipantDashboard />);

    expect(screen.getByRole("heading", { name: "Olá, Marina" })).toBeInTheDocument();
  });

  it("mostra o atalho da credencial de quem tem ingresso presencial", () => {
    rota(<ParticipantDashboard />);

    expect(screen.getByLabelText("Abrir QR Code de credenciamento")).toBeInTheDocument();
    expect(screen.getByText(/SF26-AAAA-BBBB/)).toBeInTheDocument();
  });

  it("ingresso Online não tem atalho de credencial", () => {
    auth.user.hasCredential = false;

    rota(<ParticipantDashboard />);

    expect(screen.queryByLabelText("Abrir QR Code de credenciamento")).not.toBeInTheDocument();
  });

  it("sem programação publicada, o vazio é a informação", () => {
    rota(<ParticipantDashboard />);

    expect(screen.getByText("A programação ainda não foi publicada")).toBeInTheDocument();
  });

  it("sem ingresso, a tela vira amostra limitada", () => {
    auth.can.mockReturnValue(false);

    rota(<ParticipantDashboard />);

    expect(screen.getByText("Acesso limitado")).toBeInTheDocument();
  });

  it("sem código de ingresso, mostra o travessão", () => {
    auth.user.ticketCode = undefined;

    rota(<ParticipantDashboard />);

    expect(screen.getByText("Código —")).toBeInTheDocument();
  });
});

describe("CredentialPage", () => {
  it("ingresso Online explica que a credencial é do presencial", () => {
    auth.user.hasCredential = false;

    rota(<CredentialPage />);

    expect(screen.getByText("Seu ingresso é Online")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("com ingresso presencial, mostra o QR e o código", () => {
    rota(<CredentialPage />);

    expect(screen.getByRole("img", { name: /QR Code do ingresso/ })).toBeInTheDocument();
    expect(screen.getByText("SF26-AAAA-BBBB")).toBeInTheDocument();
    expect(screen.getByText("marina@x.com")).toBeInTheDocument();
  });

  it("sem ingresso, o QR fica escondido atrás da trava", () => {
    auth.can.mockReturnValue(false);

    rota(<CredentialPage />);

    expect(screen.getByText("QR disponível após adquirir")).toBeInTheDocument();
    expect(screen.getByText("•••• •••• ••••")).toBeInTheDocument();
    expect(screen.getByText("Acesso limitado")).toBeInTheDocument();
  });

  it("baixar a credencial usa a impressão do navegador", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    rota(<CredentialPage />);

    await userEvent.click(screen.getByRole("button", { name: /Baixar credencial/ }));

    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

describe("CertificatePage", () => {
  it("antes do evento, o certificado fica travado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4));

    rota(<CertificatePage />);

    expect(screen.getByText(/liberado a partir de/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Disponível após o evento/ })).toBeDisabled();
  });

  it("a partir do dia do evento, libera o download", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4));
    const print = vi.fn();
    vi.stubGlobal("print", print);

    rota(<CertificatePage />);

    expect(screen.getByText(/está disponível/)).toBeInTheDocument();
    const botao = screen.getByRole("button", { name: /Baixar certificado/ });
    expect(botao).toBeEnabled();

    botao.click();
    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("emite em nome de quem está logado", () => {
    rota(<CertificatePage />);

    expect(screen.getByText("Marina Costa")).toBeInTheDocument();
  });
});

describe("StreamingPage", () => {
  it("sem sessões, avisa que não há transmissão", () => {
    rota(<StreamingPage />);

    expect(screen.getByText("Nenhuma transmissão no momento.")).toBeInTheDocument();
  });

  it("escolhe como 'ao vivo' o horário com mais trilhas simultâneas", () => {
    sessoes.sessions = [
      PAUTA({ id: "s1", start: "09:00", title: "Sozinha" }),
      PAUTA({ id: "s2", start: "10:00", title: "Trilha A" }),
      PAUTA({ id: "s3", start: "10:00", title: "Trilha B" }),
    ];

    rota(<StreamingPage />);

    expect(screen.getByRole("heading", { name: "Trilha A" })).toBeInTheDocument();
    expect(screen.getByText("Acontecendo agora (2 trilhas)")).toBeInTheDocument();
  });

  it("as demais sessões entram em 'A seguir'", () => {
    sessoes.sessions = [
      PAUTA({ id: "s1", start: "09:00", title: "Sozinha" }),
      PAUTA({ id: "s2", start: "10:00", title: "Trilha A" }),
      PAUTA({ id: "s3", start: "10:00", title: "Trilha B" }),
    ];

    rota(<StreamingPage />);

    expect(screen.getByRole("heading", { name: "A seguir" })).toBeInTheDocument();
    expect(screen.getByText("Sozinha")).toBeInTheDocument();
  });

  it("dar play registra a palestra como assistida", async () => {
    sessoes.sessions = [PAUTA()];
    rota(<StreamingPage />);

    await userEvent.click(screen.getByRole("button", { name: "Assistir palestra" }));

    expect(participacao.markWatched).toHaveBeenCalledWith("s1");
  });

  it("palestra já assistida ganha o selo", () => {
    sessoes.sessions = [PAUTA()];
    participacao.hasWatched.mockReturnValue(true);

    rota(<StreamingPage />);

    expect(screen.getByText("Assistida")).toBeInTheDocument();
  });

  it("dá para trocar a trilha em exibição", async () => {
    sessoes.sessions = [
      PAUTA({ id: "s1", start: "10:00", title: "Trilha A" }),
      PAUTA({ id: "s2", start: "10:00", title: "Trilha B" }),
    ];
    rota(<StreamingPage />);

    await userEvent.click(screen.getByText("Trilha B"));

    expect(screen.getByRole("heading", { name: "Trilha B" })).toBeInTheDocument();
  });
});

describe("Networking", () => {
  it("lista no máximo 6 conexões antes do 'ver mais'", () => {
    rota(<Networking />);

    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("button", { name: /Ver mais/ })).toBeInTheDocument();
  });

  it("'ver mais' abre a lista inteira e volta a recolher", async () => {
    rota(<Networking />);

    await userEvent.click(screen.getByRole("button", { name: /Ver mais/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(CONNECTIONS.length);

    await userEvent.click(screen.getByRole("button", { name: /Ver menos/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("a busca filtra por nome", async () => {
    const alvo = CONNECTIONS[0];
    rota(<Networking />);

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/), alvo.name);

    expect(screen.getByText(alvo.name)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeLessThan(CONNECTIONS.length);
  });

  it("o filtro de empresas deixa só empresas", async () => {
    rota(<Networking />);

    await userEvent.click(screen.getByRole("button", { name: "Empresas" }));

    const empresas = CONNECTIONS.filter((c) => c.kind === "company");
    expect(screen.getAllByRole("listitem")).toHaveLength(Math.min(6, empresas.length));
  });

  it("o filtro de favoritos usa o que foi marcado", async () => {
    favoritos.isFavorite.mockImplementation((id: string) => id === CONNECTIONS[0].id);
    favoritos.count = 1;
    rota(<Networking />);

    await userEvent.click(screen.getByRole("button", { name: "Favoritos (1)" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("favoritar não navega para o perfil", async () => {
    rota(<Networking />);

    await userEvent.click(screen.getAllByRole("button", { name: "Favoritar" })[0]);

    expect(favoritos.toggle).toHaveBeenCalledWith(CONNECTIONS[0].id);
  });

  it("a cota de patrocínio só aparece para admin e curador", () => {
    const { unmount } = rota(<Networking />);
    expect(screen.queryByText(/Ouro|Prata|Bronze/)).not.toBeInTheDocument();
    unmount();

    auth.user.role = "curator";
    rota(<Networking />);
    expect(screen.getAllByText(/Ouro|Prata|Bronze/).length).toBeGreaterThan(0);
  });

  it("sem a capacidade, a lista vira amostra", () => {
    auth.can.mockReturnValue(false);

    rota(<Networking />);

    expect(screen.getByText("Acesso limitado")).toBeInTheDocument();
  });
});
