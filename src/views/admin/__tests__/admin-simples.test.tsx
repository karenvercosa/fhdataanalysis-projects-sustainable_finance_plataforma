import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const permissoes = {
  matrix: {} as Record<string, string[]>,
  toggle: vi.fn(),
  reset: vi.fn(),
};
vi.mock("@/context/PermissionsContext", () => ({ usePermissions: () => permissoes }));

const interesses = {
  catalogo: [] as { id: string; nome: string }[],
  carregado: true,
  add: vi.fn(),
  remove: vi.fn(),
};
vi.mock("@/context/InterestsContext", () => ({ useInterests: () => interesses }));

const cotas = {
  matrix: [] as any[],
  carregada: true,
  save: vi.fn(),
  reset: vi.fn(),
};
vi.mock("@/context/TierMatrixContext", () => ({ useTierMatrix: () => cotas }));

const api = { get: vi.fn() };
vi.mock("@/lib/admin-api", () => ({ api }));

const PermissionsAdmin = (await import("@/views/admin/PermissionsAdmin")).default;
const InterestsAdmin = (await import("@/views/admin/InterestsAdmin")).default;
const ReportsAdmin = (await import("@/views/admin/ReportsAdmin")).default;
const TierMatrixAdmin = (await import("@/views/admin/TierMatrixAdmin")).default;
const { DEFAULT_MATRIX, ROLE_LABEL, CAPABILITY_LABEL } = await import("@/lib/roles");
const { DEFAULT_TIER_MATRIX, TIER_FEATURE_ROWS } = await import("@/data/tierMatrix");

const rota = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const METRICAS = {
  inscritos: 42,
  premium: 12,
  vouchersAtivos: 3,
  resgatesAprovados: 7,
  resgatesPendentes: 1,
  assinaturasAtivas: 9,
  topInteresses: [{ nome: "Energia", total: 5 }],
  curadores: [
    { id: "c1", nome: "Ana", email: "a@x.com", empresa: "ACME", ativo: true, vouchers: 2, convitesUsados: 4 },
    { id: "c2", nome: "Bruno", email: "b@x.com", empresa: null, ativo: true, vouchers: 1, convitesUsados: 0 },
  ],
};

beforeEach(() => {
  permissoes.matrix = structuredClone(DEFAULT_MATRIX);
  permissoes.toggle.mockReset();
  permissoes.reset.mockReset();
  interesses.catalogo = [];
  interesses.carregado = true;
  interesses.add.mockReset().mockResolvedValue(undefined);
  interesses.remove.mockReset().mockResolvedValue(undefined);
  cotas.matrix = structuredClone(DEFAULT_TIER_MATRIX);
  cotas.carregada = true;
  cotas.save.mockReset().mockResolvedValue(undefined);
  cotas.reset.mockReset().mockResolvedValue(undefined);
  api.get.mockReset().mockResolvedValue({ metricas: METRICAS });
});

describe("PermissionsAdmin", () => {
  it("monta a matriz com uma coluna por perfil", () => {
    rota(<PermissionsAdmin />);

    for (const rotulo of Object.values(ROLE_LABEL)) {
      expect(screen.getByRole("columnheader", { name: rotulo })).toBeInTheDocument();
    }
  });

  it("marcar e desmarcar aciona a matriz", async () => {
    rota(<PermissionsAdmin />);
    const cap = CAPABILITY_LABEL["view:networking"];

    await userEvent.click(
      screen.getByLabelText(`${ROLE_LABEL.guest} — ${cap}`),
    );

    expect(permissoes.toggle).toHaveBeenCalledWith("guest", "view:networking");
  });

  it("a gestão do Admin não pode ser removida — trava contra lockout", () => {
    rota(<PermissionsAdmin />);

    expect(
      screen.getByLabelText(`${ROLE_LABEL.admin} — ${CAPABILITY_LABEL["manage:platform"]}`),
    ).toBeDisabled();
  });

  it("restaurar padrão volta a matriz original", async () => {
    rota(<PermissionsAdmin />);

    await userEvent.click(screen.getByRole("button", { name: /Restaurar padrão/ }));

    expect(permissoes.reset).toHaveBeenCalledOnce();
  });

  it("avisa que a mudança vale na hora para todo mundo", () => {
    rota(<PermissionsAdmin />);

    expect(screen.getByText(/afetam imediatamente rotas, menus e ações/)).toBeInTheDocument();
  });
});

describe("InterestsAdmin", () => {
  it("conta os temas da nuvem no subtítulo", () => {
    interesses.catalogo = [{ id: "i1", nome: "Energia" }];

    rota(<InterestsAdmin />);

    expect(screen.getByText("1 temas na nuvem")).toBeInTheDocument();
  });

  it("catálogo vazio diz isso", () => {
    rota(<InterestsAdmin />);

    expect(screen.getByText("Nenhum tema cadastrado ainda.")).toBeInTheDocument();
  });

  it("enquanto carrega, mostra o indicador", () => {
    interesses.carregado = false;

    rota(<InterestsAdmin />);

    expect(screen.getByText("Carregando temas…")).toBeInTheDocument();
  });

  it("adiciona o tema digitado e limpa o campo", async () => {
    rota(<InterestsAdmin />);

    await userEvent.type(screen.getByPlaceholderText(/Taxonomia verde/), "Água");
    await userEvent.click(screen.getByRole("button", { name: /Adicionar/ }));

    await waitFor(() => expect(interesses.add).toHaveBeenCalledWith("Água"));
    expect(screen.getByPlaceholderText(/Taxonomia verde/)).toHaveValue("");
  });

  it("Enter no campo também adiciona", async () => {
    rota(<InterestsAdmin />);

    await userEvent.type(screen.getByPlaceholderText(/Taxonomia verde/), "Água{Enter}");

    await waitFor(() => expect(interesses.add).toHaveBeenCalledWith("Água"));
  });

  it("campo vazio mantém o botão travado", () => {
    rota(<InterestsAdmin />);

    expect(screen.getByRole("button", { name: /Adicionar/ })).toBeDisabled();
  });

  it("falha ao adicionar vira alerta", async () => {
    interesses.add.mockRejectedValue(new Error("Tema já existe."));
    rota(<InterestsAdmin />);

    await userEvent.type(screen.getByPlaceholderText(/Taxonomia verde/), "Energia");
    await userEvent.click(screen.getByRole("button", { name: /Adicionar/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Tema já existe.");
  });

  it("remover pede a desativação do tema", async () => {
    interesses.catalogo = [{ id: "i1", nome: "Energia" }];
    rota(<InterestsAdmin />);

    await userEvent.click(screen.getByRole("button", { name: "Remover Energia" }));

    await waitFor(() => expect(interesses.remove).toHaveBeenCalledWith("i1"));
  });

  it("falha ao remover vira alerta", async () => {
    interesses.catalogo = [{ id: "i1", nome: "Energia" }];
    interesses.remove.mockRejectedValue(new Error("Tema em uso."));
    rota(<InterestsAdmin />);

    await userEvent.click(screen.getByRole("button", { name: "Remover Energia" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Tema em uso.");
  });
});

describe("ReportsAdmin", () => {
  it("mostra os KPIs vindos do banco", async () => {
    rota(<ReportsAdmin />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("gráfico de interesses usa os temas escolhidos", async () => {
    rota(<ReportsAdmin />);

    expect(await screen.findByText("Energia")).toBeInTheDocument();
  });

  it("só entram no gráfico curadores com convite usado", async () => {
    rota(<ReportsAdmin />);

    expect(await screen.findByText("ACME")).toBeInTheDocument();
    expect(screen.queryByText("Bruno")).not.toBeInTheDocument();
  });

  it("sem dados, cada gráfico explica o vazio", async () => {
    api.get.mockResolvedValue({
      metricas: { ...METRICAS, topInteresses: [], curadores: [] },
    });

    rota(<ReportsAdmin />);

    expect(await screen.findByText("Ninguém escolheu interesses ainda.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum convite resgatado ainda.")).toBeInTheDocument();
  });

  it("falha na carga vira alerta, sem quebrar a tela", async () => {
    api.get.mockRejectedValue(new Error("Sem permissão."));

    rota(<ReportsAdmin />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão.");
  });
});

describe("TierMatrixAdmin", () => {
  const primeiraCota = () => DEFAULT_TIER_MATRIX[0];
  const primeiroRecurso = () => TIER_FEATURE_ROWS[0];

  const interruptor = () =>
    screen.getByRole("switch", {
      name: `${primeiroRecurso().label} — cota ${primeiraCota().name}`,
    });

  it("nada muda até salvar", () => {
    rota(<TierMatrixAdmin />);

    expect(screen.getByText("Todas as alterações estão salvas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar alterações/ })).toBeDisabled();
  });

  it("mexer num recurso marca alterações pendentes", async () => {
    rota(<TierMatrixAdmin />);

    await userEvent.click(interruptor());

    expect(screen.getByText("Você tem alterações não salvas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar alterações/ })).toBeEnabled();
  });

  it("descartar volta ao que veio do servidor", async () => {
    rota(<TierMatrixAdmin />);

    await userEvent.click(interruptor());
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(screen.getByText("Todas as alterações estão salvas.")).toBeInTheDocument();
  });

  it("salvar manda a matriz inteira e confirma", async () => {
    rota(<TierMatrixAdmin />);

    await userEvent.click(interruptor());
    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    await waitFor(() => expect(cotas.save).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent(/Matriz de cotas salva/);
  });

  it("falha ao salvar aparece na confirmação", async () => {
    cotas.save.mockRejectedValue(new Error("Sem permissão."));
    rota(<TierMatrixAdmin />);

    await userEvent.click(interruptor());
    await userEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));

    expect(await screen.findByRole("status")).toHaveTextContent("Sem permissão.");
  });

  it("restaurar padrão fala com o servidor", async () => {
    rota(<TierMatrixAdmin />);

    await userEvent.click(screen.getByRole("button", { name: /Restaurar padrão/ }));

    await waitFor(() => expect(cotas.reset).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent(/restaurada/);
  });

  it("falha ao restaurar também é comunicada", async () => {
    cotas.reset.mockRejectedValue(new Error("Banco fora."));
    rota(<TierMatrixAdmin />);

    await userEvent.click(screen.getByRole("button", { name: /Restaurar padrão/ }));

    expect(await screen.findByRole("status")).toHaveTextContent("Banco fora.");
  });

  it("renomear a cota entra no rascunho", async () => {
    rota(<TierMatrixAdmin />);

    const campo = screen.getByLabelText(`Nome da cota ${primeiraCota().name}`);
    await userEvent.type(campo, "X");

    expect(screen.getByText("Você tem alterações não salvas.")).toBeInTheDocument();
  });

  it("o estado de cada recurso é legível em texto, não só pela cor", () => {
    rota(<TierMatrixAdmin />);

    expect(screen.getAllByText(/Habilitado|Desabilitado/).length).toBeGreaterThan(0);
  });

  it("deixa claro que a regra vale por cota, sem exceção por empresa", () => {
    rota(<TierMatrixAdmin />);

    expect(screen.getByText(/Não há exceção por empresa/)).toBeInTheDocument();
  });
});
