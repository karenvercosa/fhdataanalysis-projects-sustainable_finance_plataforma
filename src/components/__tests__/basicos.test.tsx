import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AbaEmConstrucao } from "@/components/AbaEmConstrucao";
import { BronzeMarquee } from "@/components/BronzeMarquee";
import { PaywallModal } from "@/components/PaywallModal";
import { PreviewLock } from "@/components/PreviewLock";
import { RoleGuard } from "@/components/RoleGuard";
import { SealAvatar, SealBadge, SealLegend } from "@/components/Seal";
import { ShareButton, sessionUrl } from "@/components/ShareButton";
import { CompanyMark, SponsorLogo } from "@/components/SponsorLogo";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { CardAutenticacao } from "@/components/auth/CardAutenticacao";
import { BRONZE_SPONSORS } from "@/data/sponsorAds";

const can = vi.fn(() => true);
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ can: can() }) }));

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => can.mockReturnValue(() => true));
afterEach(() => vi.restoreAllMocks());

describe("AbaEmConstrucao", () => {
  it("deixa claro que o vazio é intencional", () => {
    rota(<AbaEmConstrucao titulo="Networking" />);

    expect(screen.getByText("Networking")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aba em construção" })).toBeInTheDocument();
    expect(screen.getByText(/Estamos preparando esta área/)).toBeInTheDocument();
  });

  it("aceita uma descrição mais específica", () => {
    rota(<AbaEmConstrucao titulo="Mapa" descricao="Volta depois do credenciamento." />);

    expect(screen.getByText("Volta depois do credenciamento.")).toBeInTheDocument();
  });
});

describe("BronzeMarquee", () => {
  it("duplica a lista para o loop ficar contínuo", () => {
    render(<BronzeMarquee />);

    const primeiro = BRONZE_SPONSORS[0];
    expect(screen.getAllByText(primeiro)).toHaveLength(2);
  });

  it("é rotulada como a esteira de patrocinadores", () => {
    render(<BronzeMarquee />);
    expect(screen.getByRole("region", { name: "Patrocinadores" })).toBeInTheDocument();
  });
});

describe("RoleGuard", () => {
  const arvore = () => (
    <MemoryRouter initialEntries={["/protegida"]}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <RoleGuard capability="manage:platform">
              <p>Conteúdo restrito</p>
            </RoleGuard>
          }
        />
        <Route path="/conteudos" element={<p>Trava de conteúdo</p>} />
      </Routes>
    </MemoryRouter>
  );

  it("deixa passar quem tem a capacidade", () => {
    can.mockReturnValue(() => true);
    render(arvore());

    expect(screen.getByText("Conteúdo restrito")).toBeInTheDocument();
  });

  it("sem a capacidade, manda para a trava de conteúdo", () => {
    can.mockReturnValue(() => false);
    render(arvore());

    expect(screen.getByText("Trava de conteúdo")).toBeInTheDocument();
  });

  it("aceita outro destino de redirecionamento", () => {
    can.mockReturnValue(() => false);
    render(
      <MemoryRouter initialEntries={["/protegida"]}>
        <Routes>
          <Route
            path="/protegida"
            element={
              <RoleGuard capability="manage:platform" redirectTo="/inicio">
                <p>Restrito</p>
              </RoleGuard>
            }
          />
          <Route path="/inicio" element={<p>Início</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Início")).toBeInTheDocument();
  });
});

describe("Seal", () => {
  it("a tag mostra o papel", () => {
    render(<SealBadge seal="Palestrante" />);
    expect(screen.getByText("Palestrante")).toBeInTheDocument();
  });

  it("sem selo não renderiza tag nenhuma", () => {
    const { container } = render(<SealBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("a foto ganha o anel do selo", () => {
    const { container } = render(<SealAvatar name="Ana Paula" seal="Curador" />);

    expect(container.firstChild).toHaveClass("ring-2");
    expect(screen.getByText("AP")).toBeInTheDocument();
  });

  it("sem selo a foto cai no avatar comum", () => {
    const { container } = render(<SealAvatar name="Ana Paula" />);
    expect(container.firstChild).not.toHaveClass("ring-2");
  });

  it("a legenda lista cada selo informado", () => {
    render(<SealLegend seals={["Palestrante", "Patrocinador"]} />);

    expect(screen.getByText("Palestrante")).toBeInTheDocument();
    expect(screen.getByText("Patrocinador")).toBeInTheDocument();
  });
});

describe("ShareButton", () => {
  it("monta o link que reabre a pauta na programação", () => {
    expect(sessionUrl("s1")).toBe(`${window.location.origin}/programacao?pauta=s1`);
  });

  it("copia o link e confirma a cópia", async () => {
    const writeText = vi.fn();
    Object.assign(navigator.clipboard, { writeText });
    render(<ShareButton sessionId="s1" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(writeText).toHaveBeenCalledWith(sessionUrl("s1"));
    expect(screen.getByRole("button", { name: "Link copiado!" })).toBeInTheDocument();
  });

  it("na versão ícone, o clique não vaza para o card da pauta", async () => {
    const onCard = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div onClick={onCard}>
        <ShareButton sessionId="s1" variant="icon" />
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { name: /Compartilhar pauta/ }));

    expect(onCard).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Link copiado" })).toBeInTheDocument();
  });

  it("volta ao estado inicial depois do aviso", async () => {
    render(<ShareButton sessionId="s1" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

    // O aviso é temporário: passados os ~1,5s o botão volta a convidar à cópia.
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Compartilhar" })).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});

describe("SponsorLogo", () => {
  it("só aparece para empresa Ouro ou Prata", () => {
    const { container } = render(<SponsorLogo name="Empresa Sem Cota" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sem nome não renderiza nada", () => {
    const { container } = render(<SponsorLogo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("empresa patrocinadora aparece com a cota no rótulo acessível", () => {
    render(<SponsorLogo name="AgroVerde" size="md" />);

    expect(screen.getByLabelText("Patrocinador Ouro: AgroVerde")).toBeInTheDocument();
  });

  it("a marca da empresa aparece mesmo sem cota", () => {
    const { container } = render(<CompanyMark name="Empresa Qualquer" />);

    expect(container.firstChild).toHaveTextContent("EQ");
  });

  it("a marca é tingida quando a empresa tem cota", () => {
    const { container } = render(<CompanyMark name="AgroVerde" />);

    expect(container.firstChild).toHaveTextContent("AV");
  });
});

describe("PaywallModal", () => {
  it("fechado não aparece", () => {
    rota(<PaywallModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("nomeia o recurso que a pessoa tentou acessar", () => {
    rota(<PaywallModal open onClose={vi.fn()} recurso="Hub de Conhecimento" />);

    expect(screen.getByText("Hub de Conhecimento")).toBeInTheDocument();
  });

  it("sem recurso, mantém a mensagem genérica", () => {
    rota(<PaywallModal open onClose={vi.fn()} />);

    expect(screen.getByText(/Tenha acesso ilimitado ao Hub/)).toBeInTheDocument();
  });

  it("'Agora não' apenas fecha", async () => {
    const onClose = vi.fn();
    rota(<PaywallModal open onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("o CTA fecha e leva aos ingressos", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/conteudos"]}>
        <Routes>
          <Route path="/conteudos" element={<PaywallModal open onClose={onClose} />} />
          <Route path="/ingressos" element={<p>Ingressos</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Garantir acesso completo" }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText("Ingressos")).toBeInTheDocument();
  });
});

describe("PreviewLock", () => {
  it("mostra a amostra e o aviso de acesso limitado", () => {
    rota(
      <PreviewLock>
        <p>Conteúdo em amostra</p>
      </PreviewLock>,
    );

    expect(screen.getByText("Acesso limitado")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo em amostra")).toBeInTheDocument();
  });

  it("aceita uma mensagem própria", () => {
    rota(<PreviewLock message="Só membros baixam materiais.">x</PreviewLock>);

    expect(screen.getByText("Só membros baixam materiais.")).toBeInTheDocument();
  });

  it("qualquer clique na amostra puxa para o CTA", async () => {
    rota(
      <PreviewLock blur>
        <p>amostra</p>
      </PreviewLock>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Torne-se membro para acessar" }));

    expect(screen.getByRole("dialog", { name: "Torne-se membro" })).toBeInTheDocument();
  });

  it("o botão do topo abre o mesmo CTA e 'Agora não' fecha", async () => {
    rota(<PreviewLock>x</PreviewLock>);

    await userEvent.click(screen.getByRole("button", { name: /Torne-se membro$/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("o link do modal leva aos ingressos", async () => {
    rota(<PreviewLock>x</PreviewLock>);

    await userEvent.click(screen.getByRole("button", { name: /Torne-se membro$/ }));

    expect(screen.getByRole("link", { name: /Quero ser membro/ })).toHaveAttribute(
      "href",
      "/ingressos",
    );
  });
});

describe("CampoSenha", () => {
  function Campo(props: Partial<Parameters<typeof CampoSenha>[0]> = {}) {
    return <CampoSenha label="Senha" value="segredo" onChange={vi.fn()} {...props} />;
  }

  it("nasce oculto", () => {
    render(<Campo />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });

  it("o olho mostra e volta a ocultar, anunciando o estado", async () => {
    render(<Campo />);

    const olho = screen.getByRole("button", { name: "Mostrar senha" });
    await userEvent.click(olho);

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    const fechar = screen.getByRole("button", { name: "Ocultar senha" });
    expect(fechar).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(fechar);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });

  it("o botão fica fora da ordem do Tab", () => {
    render(<Campo />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "-1");
  });

  it("avisa cada tecla digitada", async () => {
    const onChange = vi.fn();
    render(<Campo value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Senha"), "ab");

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("mostra o texto de ajuda e respeita o id informado", () => {
    render(<Campo id="senha-nova" ajuda="Mínimo de 8 caracteres" autoComplete="new-password" />);

    expect(screen.getByText("Mínimo de 8 caracteres")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("id", "senha-nova");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
  });
});

describe("CardAutenticacao", () => {
  it("emoldura o formulário com título, logo e rodapé", () => {
    render(
      <CardAutenticacao titulo="Primeiro acesso" subtitulo="Crie sua senha" rodape={<p>Ajuda</p>}>
        <form aria-label="formulário" />
      </CardAutenticacao>,
    );

    expect(screen.getByRole("heading", { name: "Primeiro acesso" })).toBeInTheDocument();
    expect(screen.getByText("Crie sua senha")).toBeInTheDocument();
    expect(screen.getByAltText("Sustainable Finance")).toBeInTheDocument();
    expect(screen.getByText("Ajuda")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "formulário" })).toBeInTheDocument();
  });

  it("subtítulo e rodapé são opcionais", () => {
    render(<CardAutenticacao titulo="Entrar">x</CardAutenticacao>);

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });
});
