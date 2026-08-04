import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const api = { get: vi.fn(), patch: vi.fn(), put: vi.fn(), post: vi.fn(), remove: vi.fn() };
vi.mock("@/lib/admin-api", () => ({ api }));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Ana", email: "ana@x.com", role: "curator", ticketCode: undefined, tier: "Bronze" },
  }),
}));

vi.mock("@/components/SponsorAdBanner", () => ({ SponsorAdBanner: () => null }));
vi.mock("@/components/TierUpgradeCard", () => ({ TierUpgradeCard: () => null }));

const AdminDashboard = (await import("@/views/AdminDashboard")).default;
const CuratorDashboard = (await import("@/views/CuratorDashboard")).default;

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const METRICAS = {
  inscritos: 42,
  premium: 12,
  vouchersAtivos: 3,
  resgatesAprovados: 7,
  resgatesPendentes: 0,
  assinaturasAtivas: 9,
  topInteresses: [{ nome: "Energia", total: 5 }],
  curadores: [
    { id: "c1", nome: "Ana", email: "ana@x.com", empresa: "ACME", ativo: true, vouchers: 2, convitesUsados: 4 },
  ],
};

const VOUCHER = (over: object = {}) => ({
  id: "v1",
  codigo: "ACME2026",
  tipo: "gratuito",
  valor: null,
  usosMaximos: 10,
  usosFeitos: 3,
  empresaNome: "ACME",
  empresaCnpj: null,
  curadorId: "cur-1",
  ativo: true,
  ...over,
});

const RESGATE = (over: object = {}) => ({
  id: "r1",
  status: "pendente",
  criadoEm: "2026-03-01T12:00:00.000Z",
  voucherCodigo: "ACME2026",
  pessoaNome: "Bruno",
  pessoaEmail: "bruno@x.com",
  pessoaEmpresa: "ACME",
  pessoaCargo: "Analista",
  ...over,
});

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ metricas: METRICAS });
  api.patch.mockReset().mockResolvedValue({ ok: true });
});

describe("AdminDashboard", () => {
  it("mostra os KPIs contados no banco", async () => {
    rota(<AdminDashboard />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("lista os módulos de gestão com seus destinos", async () => {
    rota(<AdminDashboard />);

    expect(await screen.findByRole("link", { name: /Gestão de Usuários/ })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
    expect(screen.getByRole("link", { name: /Cotas de patrocínio/ })).toHaveAttribute(
      "href",
      "/admin/cotas",
    );
  });

  it("sem resgate pendente, o aviso não aparece", async () => {
    rota(<AdminDashboard />);

    await screen.findByText("42");
    expect(screen.queryByText(/aguarda a liberação/)).not.toBeInTheDocument();
  });

  it("um resgate pendente usa o singular", async () => {
    api.get.mockResolvedValue({ metricas: { ...METRICAS, resgatesPendentes: 1 } });

    rota(<AdminDashboard />);

    expect(await screen.findByText(/1 resgate de voucher aguarda/)).toBeInTheDocument();
  });

  it("vários pendentes usam o plural", async () => {
    api.get.mockResolvedValue({ metricas: { ...METRICAS, resgatesPendentes: 4 } });

    rota(<AdminDashboard />);

    expect(await screen.findByText(/4 resgates de voucher aguardam/)).toBeInTheDocument();
  });

  it("o gráfico de matchmaking usa os temas escolhidos", async () => {
    rota(<AdminDashboard />);

    expect(await screen.findByText("Energia")).toBeInTheDocument();
  });

  it("sem interesses escolhidos, explica o vazio", async () => {
    api.get.mockResolvedValue({ metricas: { ...METRICAS, topInteresses: [] } });

    rota(<AdminDashboard />);

    expect(await screen.findByText(/Ninguém escolheu interesses ainda/)).toBeInTheDocument();
  });

  it("lista os curadores com vouchers e convites usados", async () => {
    rota(<AdminDashboard />);

    const linha = (await screen.findByText("ana@x.com")).closest("tr")!;
    expect(within(linha).getByText("ACME")).toBeInTheDocument();
    expect(within(linha).getByText("Ativo")).toBeInTheDocument();
  });

  it("sem curador cadastrado, aponta onde criar um", async () => {
    api.get.mockResolvedValue({ metricas: { ...METRICAS, curadores: [] } });

    rota(<AdminDashboard />);

    expect(await screen.findByText(/Nenhum curador cadastrado/)).toBeInTheDocument();
  });

  it("falha na carga vira alerta", async () => {
    api.get.mockRejectedValue(new Error("Sem permissão."));

    rota(<AdminDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão.");
  });
});

describe("CuratorDashboard", () => {
  const painel = (over: object = {}) =>
    api.get.mockResolvedValue({ vouchers: [], resgates: [], ...over });

  // O corpo em bloco é proposital: devolver o mock faria o Vitest tratá-lo
  // como função de limpeza e chamá-lo ao fim de cada teste.
  beforeEach(() => {
    painel();
  });

  it("falha na carga do painel vira alerta", async () => {
    api.get.mockRejectedValue(new Error("Painel indisponível."));

    rota(<CuratorDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Painel indisponível.");
  });

  it("busca o painel recortado pelo curador da sessão", async () => {
    rota(<CuratorDashboard />);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/curador/painel"));
  });

  it("sem voucher, aponta a aba de Ingressos", async () => {
    rota(<CuratorDashboard />);

    expect(await screen.findByText(/Nenhum voucher atribuído ainda/)).toBeInTheDocument();
    expect(screen.getByText(/Ninguém resgatou seus vouchers ainda/)).toBeInTheDocument();
  });

  it("descreve o tipo de cada voucher", async () => {
    painel({
      vouchers: [
        VOUCHER(),
        VOUCHER({ id: "v2", codigo: "ESG50", tipo: "desconto_percentual", valor: 50 }),
        VOUCHER({ id: "v3", codigo: "BANK100", tipo: "desconto_valor", valor: 100 }),
      ],
    });

    rota(<CuratorDashboard />);

    expect(await screen.findByText(/Acesso gratuito · 3\/10/)).toBeInTheDocument();
    expect(screen.getByText(/50% de desconto/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 100 de desconto/)).toBeInTheDocument();
  });

  it("voucher desativado é sinalizado", async () => {
    painel({ vouchers: [VOUCHER({ ativo: false })] });

    rota(<CuratorDashboard />);

    expect(await screen.findByText("Inativo")).toBeInTheDocument();
  });

  it("mostra o uso da cota somando os vouchers", async () => {
    painel({ vouchers: [VOUCHER(), VOUCHER({ id: "v2", usosMaximos: 5, usosFeitos: 2 })] });

    rota(<CuratorDashboard />);

    expect(await screen.findByText("5/15")).toBeInTheDocument();
    expect(screen.getByText("10 convites restantes")).toBeInTheDocument();
  });

  it("copiar o código confirma a cópia", async () => {
    const writeText = vi.fn();
    Object.assign(navigator.clipboard, { writeText });
    painel({ vouchers: [VOUCHER()] });
    rota(<CuratorDashboard />);

    await userEvent.click(await screen.findByRole("button", { name: /Copiar código/ }));

    expect(writeText).toHaveBeenCalledWith("ACME2026");
    expect(screen.getByRole("button", { name: /Copiado!/ })).toBeInTheDocument();
  });

  it("avisa quantas pessoas aguardam a liberação", async () => {
    painel({ resgates: [RESGATE(), RESGATE({ id: "r2", pessoaNome: "Carla" })] });

    rota(<CuratorDashboard />);

    expect(await screen.findByText(/2 pessoas estão aguardando/)).toBeInTheDocument();
  });

  it("uma pessoa aguardando usa o singular", async () => {
    painel({ resgates: [RESGATE()] });

    rota(<CuratorDashboard />);

    expect(await screen.findByText(/1 pessoa está aguardando/)).toBeInTheDocument();
  });

  it("resgate pendente oferece permitir e negar", async () => {
    painel({ resgates: [RESGATE()] });

    rota(<CuratorDashboard />);

    expect(await screen.findByText("Aguardando você")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Permitir/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Negar/ })).toBeInTheDocument();
  });

  it("permitir grava a decisão e relê o painel", async () => {
    painel({ resgates: [RESGATE()] });
    rota(<CuratorDashboard />);

    await userEvent.click(await screen.findByRole("button", { name: /Permitir/ }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/api/curador/resgates/r1", { status: "aprovado" }),
    );
    // Recarrega porque a decisão mexe na contagem de convites do voucher.
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("resgate aprovado pode ser desativado, devolvendo o convite", async () => {
    painel({ resgates: [RESGATE({ status: "aprovado" })] });
    rota(<CuratorDashboard />);

    expect(await screen.findByText("Ativo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Desativar/ }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/api/curador/resgates/r1", { status: "negado" }),
    );
  });

  it("resgate negado pode ser reativado", async () => {
    painel({ resgates: [RESGATE({ status: "negado" })] });
    rota(<CuratorDashboard />);

    expect(await screen.findByText("Inativo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reativar/ }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/api/curador/resgates/r1", { status: "aprovado" }),
    );
  });

  it("recusa da decisão vira alerta", async () => {
    painel({ resgates: [RESGATE()] });
    api.patch.mockRejectedValue(new Error("O voucher não tem convites disponíveis."));
    rota(<CuratorDashboard />);

    await userEvent.click(await screen.findByRole("button", { name: /Permitir/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("não tem convites disponíveis");
  });

  it("lembra o dever de finalidade da LGPD sobre os contatos", async () => {
    rota(<CuratorDashboard />);

    expect(await screen.findByText(/conforme a LGPD/)).toBeInTheDocument();
  });
});
