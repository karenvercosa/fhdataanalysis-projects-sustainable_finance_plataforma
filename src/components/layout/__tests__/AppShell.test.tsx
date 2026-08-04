import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { type Role } from "@/lib/roles";

const auth = {
  user: {
    id: "u1",
    name: "Marina Costa",
    email: "marina@x.com",
    role: "attendee" as Role,
    isPaid: true,
    hasCredential: true as boolean | undefined,
    avatarUrl: undefined as string | undefined,
    sponsorKind: undefined as string | undefined,
  },
  roleServidor: "attendee" as Role,
  setRole: vi.fn(),
  can: vi.fn(() => false),
  logout: vi.fn(),
};
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

vi.mock("@/context/CookieConsentContext", () => ({
  useCookieConsent: () => ({ revisar: vi.fn() }),
}));

const { AppShell, PageHeader } = await import("@/components/layout/AppShell");
const { ROLE_LABEL, HOME_BY_ROLE } = await import("@/lib/roles");

function montar(rotaInicial = "/inicio") {
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <Routes>
        <Route
          path="*"
          element={
            <AppShell>
              <p>Conteúdo da página</p>
            </AppShell>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** Barra lateral do desktop — a de baixo repete os mesmos itens. */
const barraLateral = () => screen.getAllByRole("navigation")[0];

const itensDaBarra = () => barraLateral().textContent ?? "";

beforeEach(() => {
  auth.user = {
    id: "u1",
    name: "Marina Costa",
    email: "marina@x.com",
    role: "attendee",
    isPaid: true,
    hasCredential: true,
    avatarUrl: undefined,
    sponsorKind: undefined,
  };
  auth.roleServidor = "attendee";
  auth.setRole.mockReset();
  auth.logout.mockReset();
  auth.can.mockReset().mockReturnValue(false);
  document.body.className = "";
});

describe("moldura", () => {
  it("renderiza a página dentro da moldura", () => {
    montar();

    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
    expect(screen.getByText(/Olá,/)).toHaveTextContent("Marina");
  });

  it("mostra o nome e o papel de quem está logado", () => {
    montar();

    expect(screen.getAllByText("Marina Costa").length).toBeGreaterThan(0);
    expect(screen.getAllByText(ROLE_LABEL.attendee).length).toBeGreaterThan(0);
  });

  it("sair encerra a sessão", async () => {
    montar();

    await userEvent.click(screen.getAllByRole("button", { name: "Sair" })[0]);

    expect(auth.logout).toHaveBeenCalled();
  });
});

describe("navegação por perfil", () => {
  it("o Plano Gratuito vê Networking e Mapa bloqueados", () => {
    auth.user.role = "guest";
    auth.roleServidor = "guest";

    montar();

    const bloqueados = screen.getAllByTitle("Pré-visualização — adquira para liberar");
    expect(bloqueados.map((b) => b.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Networking")]),
    );
  });

  it("o item bloqueado abre a pré-visualização da página", async () => {
    auth.user.role = "guest";
    montar();

    const bloqueado = screen.getAllByTitle("Pré-visualização — adquira para liberar")[0];
    await userEvent.click(bloqueado);

    // Continua dentro da SPA: a moldura segue montada.
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });

  it("participante com ingresso Online não vê Credencial", () => {
    auth.user.hasCredential = false;

    montar();

    expect(itensDaBarra()).not.toContain("Credencial");
  });

  it("participante com ingresso Presencial vê Credencial", () => {
    auth.user.hasCredential = true;

    montar();

    expect(itensDaBarra()).toContain("Credencial");
  });

  it("palestrante ganha o perfil público", () => {
    auth.user.role = "speaker";

    montar();

    expect(itensDaBarra()).toContain("Meu Perfil Público");
  });

  it("curador tem painel próprio e aba de ingressos", () => {
    auth.user.role = "curator";

    montar();

    const barra = itensDaBarra();
    expect(barra).toContain("Painel");
    expect(barra).toContain("Ingressos");
  });

  it("operador só cuida do credenciamento", () => {
    auth.user.role = "operator";

    montar();

    const barra = itensDaBarra();
    expect(barra).toContain("Operação");
    expect(barra).not.toContain("Ao Vivo");
  });

  it("administrador enxerga as seções de plataforma e gestão", () => {
    auth.user.role = "admin";
    auth.roleServidor = "admin";

    montar();

    expect(within(barraLateral()).getByText("Plataforma")).toBeInTheDocument();
    expect(within(barraLateral()).getByText("Gestão")).toBeInTheDocument();
    expect(itensDaBarra()).toContain("Vouchers");
  });

  it("papel fora das árvores próprias cai no RBAC", () => {
    auth.user.role = "desconhecido" as Role;
    auth.user.isPaid = false;
    auth.can.mockImplementation((cap: string) => cap === "purchase:ticket");

    montar();

    // Só o CTA de aquisição, porque é a única capacidade concedida.
    expect(itensDaBarra()).toContain("Ingressos");
  });

  it("quem já adquiriu não vê mais o CTA de ingressos", () => {
    auth.user.role = "desconhecido" as Role;
    auth.user.isPaid = true;
    auth.can.mockImplementation((cap: string) => cap === "purchase:ticket");

    montar();

    expect(itensDaBarra()).not.toContain("Ingressos");
  });
});

describe("seletor de perfil do Admin", () => {
  it("só aparece para quem é admin de verdade no servidor", () => {
    montar();
    expect(screen.queryByLabelText(/Trocar perfil/)).not.toBeInTheDocument();
  });

  it("continua visível depois de o admin escolher outro papel", () => {
    auth.roleServidor = "admin";
    auth.user.role = "guest";

    montar();

    // A condição olha o papel REAL — senão o seletor sumiria sem volta.
    expect(screen.getByLabelText(/Trocar perfil/)).toBeInTheDocument();
  });

  it("trocar o papel leva para a home daquele perfil", async () => {
    auth.roleServidor = "admin";
    auth.user.role = "admin";
    montar();

    await userEvent.selectOptions(screen.getByLabelText(/Trocar perfil/), "curator");

    expect(auth.setRole).toHaveBeenCalledWith("curator");
    expect(HOME_BY_ROLE.curator).toBeTruthy();
  });
});

describe("menu do celular", () => {
  it("abre e fecha, travando a rolagem enquanto está aberto", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(document.body).toHaveClass("no-scroll");

    await userEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(document.body).not.toHaveClass("no-scroll");
  });

  it("navegar pelo menu fecha o painel", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    const painel = screen.getByRole("dialog", { name: "Menu" });
    await userEvent.click(within(painel).getAllByRole("link")[0]);

    expect(document.body).not.toHaveClass("no-scroll");
  });
});

describe("documentos legais", () => {
  it("o rodapé abre cada documento", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Termos de Uso" }));

    expect(screen.getByRole("dialog", { name: "Legal & Privacidade" })).toBeInTheDocument();
  });

  it("o atalho da barra lateral abre o mesmo leitor", async () => {
    montar();

    await userEvent.click(screen.getAllByRole("button", { name: /Legal & Privacidade/ })[0]);

    expect(screen.getByRole("dialog", { name: "Legal & Privacidade" })).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("mostra título e subtítulo", () => {
    render(<PageHeader title="Networking" subtitle="Conecte-se" />);

    expect(screen.getByRole("heading", { name: "Networking" })).toBeInTheDocument();
    expect(screen.getByText("Conecte-se")).toBeInTheDocument();
  });

  it("o subtítulo é opcional", () => {
    render(<PageHeader title="Mapa" />);

    expect(screen.getByRole("heading", { name: "Mapa" })).toBeInTheDocument();
  });
});
