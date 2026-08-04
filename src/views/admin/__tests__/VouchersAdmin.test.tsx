import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn() };
vi.mock("@/lib/admin-api", () => ({ api }));

const VouchersAdmin = (await import("@/views/admin/VouchersAdmin")).default;

const VOUCHER = (over: object = {}) => ({
  id: "v1",
  codigo: "VERDE2026",
  tipo: "gratuito",
  valor: null,
  usosMaximos: 100,
  usosFeitos: 0,
  empresaNome: "AgroVerde",
  empresaCnpj: null,
  curadorId: null,
  ativo: true,
  ...over,
});

const CURADOR = {
  id: "c1",
  nome: "Ana Curadora",
  email: "ana@x.com",
  role: "curator",
  selo: null,
  ativo: true,
  empresaNome: "AgroVerde",
  voucher: null,
};

const rota = () =>
  render(
    <MemoryRouter>
      <VouchersAdmin />
    </MemoryRouter>,
  );

/** As duas leituras que a tela faz ao abrir: vouchers e contas de curador. */
function respostas(vouchers: unknown[] = [VOUCHER()], usuarios: unknown[] = [CURADOR]) {
  api.get.mockImplementation(async (url: string) =>
    url === "/api/admin/vouchers" ? { vouchers } : { usuarios },
  );
}

const linhas = () => screen.getAllByRole("row").slice(1);

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset().mockResolvedValue({ voucher: VOUCHER({ id: "v2", codigo: "NOVO2026" }) });
  api.patch.mockReset().mockResolvedValue({ voucher: VOUCHER({ codigo: "VERDE2026" }) });
  api.remove.mockReset().mockResolvedValue({ ok: true });
  respostas();
});

describe("listagem", () => {
  it("busca vouchers e curadores ao abrir", async () => {
    rota();

    await screen.findByText("VERDE2026");
    expect(api.get).toHaveBeenCalledWith("/api/admin/vouchers");
    expect(api.get).toHaveBeenCalledWith("/api/admin/usuarios");
  });

  it("o gratuito não mostra valor", async () => {
    rota();

    const linha = (await screen.findByText("VERDE2026")).closest("tr")!;
    expect(within(linha).getByText("—")).toBeInTheDocument();
    expect(within(linha).getByText("0 / 100")).toBeInTheDocument();
  });

  it("desconto percentual e em reais aparecem formatados", async () => {
    respostas([
      VOUCHER({ id: "v1", codigo: "ESG50", tipo: "desconto_percentual", valor: 50 }),
      VOUCHER({ id: "v2", codigo: "BANK100", tipo: "desconto_valor", valor: 100 }),
    ]);

    rota();

    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?100,00/)).toBeInTheDocument();
  });

  it("mostra CNPJ e o curador dono do voucher", async () => {
    respostas([VOUCHER({ empresaCnpj: "12.ABC.345/01DE-35", curadorId: "c1" })]);

    rota();

    expect(await screen.findByText("12.ABC.345/01DE-35")).toBeInTheDocument();
    expect(screen.getByText("· Ana Curadora")).toBeInTheDocument();
  });

  it("curador desconhecido não quebra a linha", async () => {
    respostas([VOUCHER({ curadorId: "sumiu" })], []);

    rota();

    expect(await screen.findByText("· curador")).toBeInTheDocument();
  });

  it("busca por código ou empresa", async () => {
    respostas([VOUCHER(), VOUCHER({ id: "v2", codigo: "BANK100", empresaNome: "BankCo" })]);
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.type(screen.getByPlaceholderText(/Buscar por código/), "bankco");

    expect(linhas()).toHaveLength(1);
  });

  it("lista vazia explica o vazio", async () => {
    respostas([]);

    rota();

    expect(await screen.findByText("Nenhum voucher cadastrado.")).toBeInTheDocument();
  });

  it("falha na carga vira alerta", async () => {
    api.get.mockImplementation(async () => {
      throw new Error("Sem permissão.");
    });

    rota();

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão.");
  });
});

describe("criação", () => {
  const abrirNovo = async () => {
    rota();
    await screen.findByText("VERDE2026");
    await userEvent.click(screen.getByRole("button", { name: /Novo voucher/ }));
  };

  it("o código é normalizado para maiúsculas enquanto se digita", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Código"), "novo2026");

    expect(screen.getByLabelText("Código")).toHaveValue("NOVO2026");
  });

  it("o gratuito não pede valor", async () => {
    await abrirNovo();

    expect(screen.getByLabelText(/Desconto \(R\$\)/)).toBeDisabled();
  });

  it("desconto sem valor mantém o salvamento travado", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Código"), "ESG50");
    await userEvent.type(screen.getByLabelText("Empresa dona do voucher"), "AgroVerde");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "desconto_percentual");

    expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Desconto \(%\)/), "50");
    expect(screen.getByRole("button", { name: "Criar" })).toBeEnabled();
  });

  it("CNPJ pela metade é recusado", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Código"), "NOVO");
    await userEvent.type(screen.getByLabelText("Empresa dona do voucher"), "AgroVerde");
    await userEvent.type(screen.getByLabelText("CNPJ da empresa"), "12345");

    expect(screen.getByText("CNPJ incompleto — são 14 posições.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();
  });

  it("explica o efeito de atribuir um curador", async () => {
    await abrirNovo();

    expect(screen.getByText(/Sem curador, o resgate é liberado na hora/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Curador / patrocinador"), "c1");

    expect(screen.getByText(/cada resgate espera a liberação dele/)).toBeInTheDocument();
  });

  it("cria o voucher com o corpo esperado pela API", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Código"), "novo2026");
    await userEvent.type(screen.getByLabelText("Empresa dona do voucher"), "AgroVerde");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/admin/vouchers", {
        codigo: "NOVO2026",
        tipo: "gratuito",
        valor: null,
        usosMaximos: 100,
        empresaNome: "AgroVerde",
        empresaCnpj: "",
        curadorId: "",
        ativo: true,
      }),
    );
    expect(await screen.findByText(/NOVO2026 criado para AgroVerde/)).toBeInTheDocument();
  });

  it("recusa do servidor fica no formulário", async () => {
    api.post.mockRejectedValue(new Error("Já existe um voucher com este código."));
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Código"), "VERDE2026");
    await userEvent.type(screen.getByLabelText("Empresa dona do voucher"), "AgroVerde");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um voucher");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("edição e exclusão", () => {
  it("editar lembra quantas vezes o voucher já foi resgatado", async () => {
    respostas([VOUCHER({ usosFeitos: 5 })]);
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.click(screen.getByRole("button", { name: "Editar VERDE2026" }));

    expect(screen.getByText(/Já resgatado 5 vez\(es\)/)).toBeInTheDocument();
  });

  it("salvar manda o PATCH da conta certa", async () => {
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.click(screen.getByRole("button", { name: "Editar VERDE2026" }));
    await userEvent.selectOptions(screen.getByLabelText("Status"), "Inativo");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/api/admin/vouchers/v1",
        expect.objectContaining({ ativo: false }),
      ),
    );
  });

  it("excluir um voucher já usado explica a consequência e sugere desativar", async () => {
    respostas([VOUCHER({ usosFeitos: 3 })]);
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.click(screen.getByRole("button", { name: "Excluir VERDE2026" }));

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/3 vez\(es\)/)).toBeInTheDocument();
    expect(within(modal).getByText("Inativo")).toBeInTheDocument();
  });

  it("voucher nunca usado não recebe o aviso extra", async () => {
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.click(screen.getByRole("button", { name: "Excluir VERDE2026" }));

    expect(within(screen.getByRole("dialog")).queryByText(/vez\(es\)/)).not.toBeInTheDocument();
  });

  it("confirmada, a exclusão tira o voucher da lista", async () => {
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.click(screen.getByRole("button", { name: "Excluir VERDE2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("/api/admin/vouchers/v1"));
    expect(await screen.findByText(/VERDE2026 removido/)).toBeInTheDocument();
  });

  it("recusa na exclusão é comunicada", async () => {
    api.remove.mockRejectedValue(new Error("Voucher não encontrado."));
    rota();
    await screen.findByText("VERDE2026");

    await userEvent.click(screen.getByRole("button", { name: "Excluir VERDE2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(/Voucher não encontrado/)).toBeInTheDocument();
  });
});
