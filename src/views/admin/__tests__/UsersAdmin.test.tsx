import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn() };
vi.mock("@/lib/admin-api", () => ({ api }));

const UsersAdmin = (await import("@/views/admin/UsersAdmin")).default;
const { ROLE_LABEL } = await import("@/lib/roles");

const USUARIO = (over: object = {}) => ({
  id: "u1",
  nome: "Marina Costa",
  email: "marina@x.com",
  role: "attendee",
  selo: null,
  ativo: true,
  empresaNome: "ACME",
  voucher: null,
  ...over,
});

const rota = () =>
  render(
    <MemoryRouter>
      <UsersAdmin />
    </MemoryRouter>,
  );

const linhas = () => screen.getAllByRole("row").slice(1);

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ usuarios: [USUARIO()] });
  api.post.mockReset().mockResolvedValue({ usuario: USUARIO({ id: "u2", nome: "Nova" }), emailEnviado: true });
  api.patch.mockReset().mockResolvedValue({ usuario: USUARIO({ nome: "Marina Editada" }) });
  api.remove.mockReset().mockResolvedValue({ ok: true });
});

describe("listagem", () => {
  it("busca as contas ao abrir e conta no subtítulo", async () => {
    rota();

    expect(await screen.findByText("1 contas cadastradas")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/admin/usuarios");
  });

  it("mostra a empresa e o voucher que ligou a pessoa a ela", async () => {
    api.get.mockResolvedValue({ usuarios: [USUARIO({ voucher: "VERDE2026" })] });

    rota();

    expect(await screen.findByText("ACME")).toBeInTheDocument();
    expect(screen.getByText("via VERDE2026")).toBeInTheDocument();
  });

  it("o selo só aparece para curador e palestrante", async () => {
    api.get.mockResolvedValue({
      usuarios: [
        USUARIO({ id: "u1", role: "curator", selo: "Ouro" }),
        USUARIO({ id: "u2", role: "attendee", selo: "Ouro" }),
      ],
    });

    rota();

    await screen.findByText(ROLE_LABEL.curator);
    expect(within(linhas()[0]).getByText("Ouro")).toBeInTheDocument();
    expect(within(linhas()[1]).queryByText("Ouro")).not.toBeInTheDocument();
  });

  it("conta inativa é sinalizada", async () => {
    api.get.mockResolvedValue({ usuarios: [USUARIO({ ativo: false })] });

    rota();

    expect(await screen.findByText("Inativo")).toBeInTheDocument();
  });

  it("busca por nome ou e-mail", async () => {
    api.get.mockResolvedValue({
      usuarios: [USUARIO(), USUARIO({ id: "u2", nome: "Bruno", email: "bruno@x.com" })],
    });
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/), "bruno@");

    expect(linhas()).toHaveLength(1);
  });

  it("filtra por perfil", async () => {
    api.get.mockResolvedValue({
      usuarios: [USUARIO(), USUARIO({ id: "u2", nome: "Ana", role: "admin" })],
    });
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "admin");

    expect(linhas()).toHaveLength(1);
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("lista vazia explica o vazio", async () => {
    api.get.mockResolvedValue({ usuarios: [] });

    rota();

    expect(await screen.findByText("Nenhum usuário encontrado.")).toBeInTheDocument();
  });

  it("falha na carga vira alerta", async () => {
    api.get.mockRejectedValue(new Error("Sem permissão."));

    rota();

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão.");
  });
});

describe("criação", () => {
  const abrirNovo = async () => {
    rota();
    await screen.findByText("Marina Costa");
    await userEvent.click(screen.getByRole("button", { name: /Novo usuário/ }));
  };

  it("explica que a senha vai por e-mail, e não é definida ali", async () => {
    await abrirNovo();

    expect(screen.getByText(/senha provisória/)).toBeInTheDocument();
  });

  it("nome curto ou e-mail inválido mantêm o salvamento travado", async () => {
    await abrirNovo();

    expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nome completo"), "A");
    await userEvent.type(screen.getByLabelText("E-mail"), "semarroba");
    expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nome completo"), "na Silva");
    await userEvent.type(screen.getByLabelText("E-mail"), "@dominio.com");
    expect(screen.getByRole("button", { name: "Criar" })).toBeEnabled();
  });

  it("cria a conta e confirma o convite enviado", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Nome completo"), "Nova Pessoa");
    await userEvent.type(screen.getByLabelText("E-mail"), "nova@x.com");
    await userEvent.selectOptions(screen.getByLabelText("Perfil"), "curator");
    await userEvent.selectOptions(screen.getByLabelText("Selo / Cota"), "Ouro");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/admin/usuarios", {
        nome: "Nova Pessoa",
        email: "nova@x.com",
        role: "curator",
        selo: "Ouro",
        ativo: true,
      }),
    );
    expect(await screen.findByText(/convite de acesso foi enviado/)).toBeInTheDocument();
  });

  it("avisa quando a conta nasce mas o e-mail não sai", async () => {
    api.post.mockResolvedValue({ usuario: USUARIO({ id: "u2", nome: "Nova" }), emailEnviado: false });
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Nome completo"), "Nova Pessoa");
    await userEvent.type(screen.getByLabelText("E-mail"), "nova@x.com");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByText(/e-mail de acesso não pôde ser enviado/)).toBeInTheDocument();
  });

  it("selo em perfil que não o exibe rende um aviso", async () => {
    await abrirNovo();

    await userEvent.selectOptions(screen.getByLabelText("Selo / Cota"), "Ouro");

    expect(screen.getByText(/só aparece na lista para perfis/)).toBeInTheDocument();
  });

  it("recusa do servidor fica no formulário", async () => {
    api.post.mockRejectedValue(new Error("Já existe um usuário com este e-mail."));
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Nome completo"), "Nova Pessoa");
    await userEvent.type(screen.getByLabelText("E-mail"), "nova@x.com");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um usuário");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("edição e exclusão", () => {
  it("editar abre com os valores da conta e grava a alteração", async () => {
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.click(screen.getByRole("button", { name: "Editar Marina Costa" }));
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Marina Costa");

    await userEvent.selectOptions(screen.getByLabelText("Status"), "Inativo");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/api/admin/usuarios/u1",
        expect.objectContaining({ ativo: false }),
      ),
    );
    expect(await screen.findByText(/Marina Editada atualizado/)).toBeInTheDocument();
  });

  it("excluir pede confirmação e avisa o que se perde", async () => {
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Marina Costa" }));

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Marina Costa")).toBeInTheDocument();
    expect(within(modal).getByText(/não pode ser desfeita/)).toBeInTheDocument();
  });

  it("confirmada, a conta some da lista", async () => {
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Marina Costa" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("/api/admin/usuarios/u1"));
    expect(await screen.findByText(/Marina Costa removido/)).toBeInTheDocument();
  });

  it("recusa na exclusão é comunicada sem sumir com a linha", async () => {
    api.remove.mockRejectedValue(new Error("Você não pode excluir a sua própria conta por aqui."));
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Marina Costa" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(/própria conta/)).toBeInTheDocument();
  });

  it("cancelar a exclusão mantém tudo", async () => {
    rota();
    await screen.findByText("Marina Costa");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Marina Costa" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(api.remove).not.toHaveBeenCalled();
    expect(linhas()).toHaveLength(1);
  });
});
