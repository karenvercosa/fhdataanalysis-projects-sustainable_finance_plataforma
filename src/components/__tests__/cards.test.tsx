import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const participacao = { watched: [] as string[], downloads: [] as string[] };
const favoritos = { count: 0 };
const sessoes = { sessions: [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }] };
vi.mock("@/context/ParticipationContext", () => ({ useParticipation: () => participacao }));
vi.mock("@/context/FavoritesContext", () => ({ useFavorites: () => favoritos }));
vi.mock("@/context/SessionsContext", () => ({ useSessions: () => sessoes }));

const auth = {
  user: { name: "Marina Costa", email: "marina@x.com" },
  deleteAccount: vi.fn(),
};
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

const agora = {
  phase: "live" as string,
  current: [] as any[],
  elapsed: 0,
  next: null as any,
  minutesToNext: 0,
};
vi.mock("@/hooks/useEventNow", async (real) => ({
  ...(await real<typeof import("@/hooks/useEventNow")>()),
  useEventNow: () => agora,
}));

const { ParticipationCard } = await import("@/components/ParticipationCard");
const { NowCard } = await import("@/components/NowCard");
const { DeleteAccount } = await import("@/components/DeleteAccount");
const { SponsorAdBanner } = await import("@/components/SponsorAdBanner");

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const PAUTA = {
  id: "s1",
  title: "Abertura",
  track: "Finanças",
  room: "Auditório",
  start: "09:00",
  end: "10:00",
};

beforeEach(() => {
  localStorage.clear();
  participacao.watched = [];
  participacao.downloads = [];
  favoritos.count = 0;
  Object.assign(agora, { phase: "live", current: [], elapsed: 0, next: null, minutesToNext: 0 });
  auth.deleteAccount.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("ParticipationCard", () => {
  it("convida a começar quando nada foi assistido", () => {
    render(<ParticipationCard />);

    expect(screen.getByText("0 de 4")).toBeInTheDocument();
    expect(screen.getByText(/Comece pelo Ao Vivo/)).toBeInTheDocument();
  });

  it("mostra o percentual da programação acompanhada", () => {
    participacao.watched = ["s1", "s2"];
    participacao.downloads = ["c1"];
    favoritos.count = 3;

    render(<ParticipationCard />);

    expect(screen.getByText("2 de 4")).toBeInTheDocument();
    expect(screen.getByText("Você já acompanhou 50% da programação.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("agenda sem sessão nenhuma não quebra a divisão", () => {
    const originais = sessoes.sessions;
    sessoes.sessions = [];

    render(<ParticipationCard />);

    expect(screen.getByText("0 de 0")).toBeInTheDocument();
    sessoes.sessions = originais;
  });
});

describe("NowCard", () => {
  it("durante a sessão mostra o que está no ar e onde", () => {
    Object.assign(agora, { phase: "live", current: [PAUTA], elapsed: 12 });

    rota(<NowCard />);

    expect(screen.getByText("Abertura")).toBeInTheDocument();
    expect(screen.getByText("Auditório")).toBeInTheDocument();
    expect(screen.getByText(/começou há 12 min/)).toBeInTheDocument();
  });

  it("avisa quantas sessões correm em paralelo", () => {
    Object.assign(agora, { phase: "live", current: [PAUTA, { ...PAUTA, id: "s2" }] });

    rota(<NowCard />);

    expect(screen.getByText("+1 sessão em paralelo")).toBeInTheDocument();
  });

  it("usa o plural quando há mais de uma em paralelo", () => {
    Object.assign(agora, {
      phase: "live",
      current: [PAUTA, { ...PAUTA, id: "s2" }, { ...PAUTA, id: "s3" }],
    });

    rota(<NowCard />);

    expect(screen.getByText("+2 sessões em paralelo")).toBeInTheDocument();
  });

  it("antes do evento cumprimenta pelo primeiro nome e faz a contagem", () => {
    Object.assign(agora, { phase: "before", current: [], minutesToNext: 90 });

    rota(<NowCard />);

    expect(screen.getByText(/Olá, Marina/)).toBeInTheDocument();
    expect(screen.getByText("Em breve")).toBeInTheDocument();
  });

  it("no intervalo explica que a programação retoma", () => {
    Object.assign(agora, { phase: "break", current: [] });

    rota(<NowCard />);

    expect(screen.getByText("Nenhuma sessão em andamento")).toBeInTheDocument();
  });

  it("encerrado avisa que os conteúdos seguem disponíveis", () => {
    Object.assign(agora, { phase: "after", current: [] });

    rota(<NowCard />);

    expect(screen.getByText("Programação encerrada por hoje")).toBeInTheDocument();
  });

  it("a próxima pauta leva à programação", () => {
    Object.assign(agora, { phase: "break", current: [], next: PAUTA, minutesToNext: 30 });

    rota(<NowCard />);

    expect(screen.getByText("Abertura")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver programação/ })).toHaveAttribute(
      "href",
      "/programacao",
    );
  });
});

describe("DeleteAccount", () => {
  const abrir = async () => {
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <Routes>
          <Route path="/perfil" element={<DeleteAccount />} />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Excluir minha conta/ }));
  };

  it("a confirmação mostra o e-mail da conta e o que se perde", async () => {
    await abrir();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("marina@x.com")).toBeInTheDocument();
    expect(screen.getByText("Seu perfil, foto e interesses")).toBeInTheDocument();
  });

  it("só habilita a exclusão depois da palavra digitada", async () => {
    await abrir();

    const botao = screen.getByRole("button", { name: "Excluir conta" });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Para confirmar/), " excluir ");

    expect(botao).toBeEnabled();
  });

  it("palavra errada mantém a exclusão travada", async () => {
    await abrir();

    await userEvent.type(screen.getByLabelText(/Para confirmar/), "apagar");

    expect(screen.getByRole("button", { name: "Excluir conta" })).toBeDisabled();
  });

  it("confirmada, exclui a conta e sai para o login", async () => {
    await abrir();

    await userEvent.type(screen.getByLabelText(/Para confirmar/), "EXCLUIR");
    await userEvent.click(screen.getByRole("button", { name: "Excluir conta" }));

    expect(auth.deleteAccount).toHaveBeenCalledOnce();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("cancelar fecha e limpa o que foi digitado", async () => {
    await abrir();

    await userEvent.type(screen.getByLabelText(/Para confirmar/), "EXCLUIR");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Excluir minha conta/ }));
    expect(screen.getByLabelText(/Para confirmar/)).toHaveValue("");
    expect(auth.deleteAccount).not.toHaveBeenCalled();
  });
});

describe("SponsorAdBanner", () => {
  const anuncio = (id: string, tier: "Ouro" | "Prata", extra: object = {}) => ({
    id,
    company: `Empresa ${id}`,
    tier,
    headline: `Manchete ${id}`,
    subtext: `Apoio ${id}`,
    ...extra,
  });

  const comAnuncios = (ads: unknown[]) =>
    localStorage.setItem("sf_sponsor_ads", JSON.stringify(ads));

  it("não renderiza banner sem divulgação nenhuma", () => {
    comAnuncios([]);

    const { container } = render(<SponsorAdBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a divulgação sem revelar a cota do patrocinador", () => {
    comAnuncios([anuncio("a", "Ouro")]);

    render(<SponsorAdBanner />);

    expect(screen.getByText("Manchete a")).toBeInTheDocument();
    expect(screen.getByText("Publicidade")).toBeInTheDocument();
    expect(screen.queryByText(/Ouro/)).not.toBeInTheDocument();
  });

  it("sem imagem enviada, cai no monograma da empresa", () => {
    comAnuncios([anuncio("a", "Ouro")]);

    render(<SponsorAdBanner />);

    // "Empresa a" tem uma única maiúscula, então o monograma vem das 2 primeiras letras.
    expect(screen.getByText("EM")).toBeInTheDocument();
  });

  it("usa a imagem enviada no Admin quando existe", () => {
    comAnuncios([anuncio("a", "Ouro", { image: "data:image/png;base64,AA" })]);

    render(<SponsorAdBanner />);

    expect(screen.getByAltText("Empresa a")).toHaveAttribute("src", "data:image/png;base64,AA");
  });

  it("só Prata: a playlist é toda dela", () => {
    comAnuncios([anuncio("p1", "Prata"), anuncio("p2", "Prata")]);

    render(<SponsorAdBanner />);

    expect(screen.getAllByRole("button", { name: /Ir para divulgação/ })).toHaveLength(2);
  });

  it("monta a proporção 2:1 entre Ouro e Prata", () => {
    comAnuncios([anuncio("o1", "Ouro"), anuncio("o2", "Ouro"), anuncio("p1", "Prata")]);

    render(<SponsorAdBanner />);

    // 3 × max(2 Ouro, 1 Prata) = 6 posições na esteira.
    expect(screen.getAllByRole("button", { name: /Ir para divulgação/ })).toHaveLength(6);
  });

  it("os indicadores trocam a divulgação exibida", async () => {
    comAnuncios([anuncio("o1", "Ouro"), anuncio("o2", "Ouro"), anuncio("p1", "Prata")]);
    render(<SponsorAdBanner />);

    await userEvent.click(screen.getByRole("button", { name: "Ir para divulgação 3" }));

    expect(screen.getByText("Manchete p1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir para divulgação 3" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("gira sozinho de tempos em tempos", async () => {
    vi.useFakeTimers();
    try {
      comAnuncios([anuncio("o1", "Ouro"), anuncio("o2", "Ouro"), anuncio("p1", "Prata")]);
      render(<SponsorAdBanner />);

      expect(screen.getByText("Manchete o1")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });

      expect(screen.getByText("Manchete o2")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("o ponteiro sobre o banner segura a rotação", async () => {
    vi.useFakeTimers();
    try {
      comAnuncios([anuncio("o1", "Ouro"), anuncio("o2", "Ouro"), anuncio("p1", "Prata")]);
      render(<SponsorAdBanner />);

      fireEvent.mouseEnter(screen.getByRole("region", { name: "Divulgação de patrocinadores" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000);
      });

      expect(screen.getByText("Manchete o1")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tirar o ponteiro retoma a rotação", async () => {
    vi.useFakeTimers();
    try {
      comAnuncios([anuncio("o1", "Ouro"), anuncio("o2", "Ouro"), anuncio("p1", "Prata")]);
      render(<SponsorAdBanner />);
      const banner = screen.getByRole("region", { name: "Divulgação de patrocinadores" });

      fireEvent.mouseEnter(banner);
      fireEvent.mouseLeave(banner);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });

      expect(screen.getByText("Manchete o2")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
