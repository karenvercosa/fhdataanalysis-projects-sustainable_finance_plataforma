import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { AdminCrud, type CrudConfig } from "@/views/admin/AdminCrud";
import { CRUD_CONFIGS, CRUD_VOUCHERS_LEGADO } from "@/views/admin/crudConfigs";

const CONFIG: CrudConfig = {
  title: "Divulgações",
  subtitle: "divulgações cadastradas",
  icon: Megaphone,
  storageKey: "sf_teste_crud",
  entity: "Divulgação",
  newLabel: "Nova divulgação",
  searchKeys: ["company", "headline"],
  fields: [
    { key: "company", label: "Empresa", required: true, unique: true, inTable: true },
    {
      key: "tier",
      label: "Cota",
      type: "select",
      inTable: true,
      filterable: true,
      tones: { Ouro: "warning", Prata: "info" },
      options: [
        { value: "Ouro", label: "Ouro" },
        { value: "Prata", label: "Prata" },
      ],
    },
    { key: "email", label: "E-mail", type: "email", inTable: true },
    { key: "headline", label: "Título", inTable: false },
    { key: "image", label: "Arquivo", type: "image", inTable: true, hint: "PNG ou JPG" },
  ],
  seed: [
    { id: "a1", company: "AgroVerde", tier: "Ouro", email: "a@x.com", headline: "Manchete", image: "" },
    { id: "a2", company: "BankCo", tier: "Prata", email: "b@x.com", headline: "Outra", image: "" },
  ],
};

const rota = (config = CONFIG) =>
  render(
    <MemoryRouter>
      <AdminCrud config={config} />
    </MemoryRouter>,
  );

const linhas = () => screen.getAllByRole("row").slice(1);

beforeEach(() => localStorage.clear());

describe("listagem", () => {
  it("mostra a semente com uma coluna por campo de tabela", () => {
    rota();

    expect(screen.getByText("2 divulgações cadastradas")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Empresa" })).toBeInTheDocument();
    // "Título" não está marcado para a tabela.
    expect(screen.queryByRole("columnheader", { name: "Título" })).not.toBeInTheDocument();
    expect(linhas()).toHaveLength(2);
  });

  it("campo com tons vira etiqueta colorida", () => {
    rota();

    expect(within(linhas()[0]).getByText("Ouro")).toBeInTheDocument();
  });

  it("imagem ausente aparece como travessão", () => {
    rota();

    expect(within(linhas()[0]).getByText("—")).toBeInTheDocument();
  });

  it("a busca cobre as chaves configuradas", async () => {
    rota();

    await userEvent.type(screen.getByPlaceholderText("Buscar…"), "bankco");

    expect(linhas()).toHaveLength(1);
    expect(screen.getByText("BankCo")).toBeInTheDocument();
  });

  it("busca sem resultado explica o vazio", async () => {
    rota();

    await userEvent.type(screen.getByPlaceholderText("Buscar…"), "inexistente");

    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
  });

  it("o filtro usa o campo marcado como filtrável", async () => {
    rota();

    await userEvent.selectOptions(screen.getByRole("combobox"), "Prata");

    expect(linhas()).toHaveLength(1);
    expect(screen.getByText("BankCo")).toBeInTheDocument();
  });
});

describe("criação", () => {
  const abrirNovo = async () => {
    rota();
    await userEvent.click(screen.getByRole("button", { name: /Nova divulgação/ }));
  };

  it("o formulário abre vazio, com o select no primeiro valor", async () => {
    await abrirNovo();

    expect(screen.getByLabelText("Empresa")).toHaveValue("");
    expect(screen.getByLabelText("Cota")).toHaveValue("Ouro");
  });

  it("campo obrigatório vazio barra o salvamento", async () => {
    await abrirNovo();

    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(screen.getByText("Campo obrigatório.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("e-mail malformado é recusado", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Empresa"), "Nova");
    await userEvent.type(screen.getByLabelText("E-mail"), "semarroba");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(screen.getByText("E-mail inválido.")).toBeInTheDocument();
  });

  it("valor único repetido é recusado, sem diferenciar maiúsculas", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Empresa"), "agroverde");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(screen.getByText("Valor já cadastrado.")).toBeInTheDocument();
  });

  it("registro novo entra no topo da lista", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Empresa"), "Nova Empresa");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(screen.getByText(/Divulgação criado/)).toBeInTheDocument();
    expect(within(linhas()[0]).getByText("Nova Empresa")).toBeInTheDocument();
  });

  it("cancelar não cria nada", async () => {
    await abrirNovo();

    await userEvent.type(screen.getByLabelText("Empresa"), "Nova");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(linhas()).toHaveLength(2);
  });
});

describe("edição e exclusão", () => {
  it("editar traz os valores atuais e grava a alteração", async () => {
    rota();

    await userEvent.click(screen.getByRole("button", { name: "Editar AgroVerde" }));
    expect(screen.getByLabelText("Empresa")).toHaveValue("AgroVerde");

    await userEvent.clear(screen.getByLabelText("Empresa"));
    await userEvent.type(screen.getByLabelText("Empresa"), "AgroVerde S.A.");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText(/Divulgação atualizado/)).toBeInTheDocument();
    expect(screen.getByText("AgroVerde S.A.")).toBeInTheDocument();
  });

  it("a checagem de unicidade ignora o próprio registro em edição", async () => {
    rota();

    await userEvent.click(screen.getByRole("button", { name: "Editar AgroVerde" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.queryByText("Valor já cadastrado.")).not.toBeInTheDocument();
  });

  it("excluir pede confirmação nomeando o registro", async () => {
    rota();

    await userEvent.click(screen.getByRole("button", { name: "Excluir BankCo" }));

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("BankCo")).toBeInTheDocument();
  });

  it("confirmada, a exclusão remove a linha", async () => {
    rota();

    await userEvent.click(screen.getByRole("button", { name: "Excluir BankCo" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByText(/Divulgação removido/)).toBeInTheDocument();
    expect(linhas()).toHaveLength(1);
  });

  it("cancelar a exclusão mantém a linha", async () => {
    rota();

    await userEvent.click(screen.getByRole("button", { name: "Excluir BankCo" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(linhas()).toHaveLength(2);
  });
});

describe("campo de imagem", () => {
  const abrirNovo = async () => {
    rota();
    await userEvent.click(screen.getByRole("button", { name: /Nova divulgação/ }));
  };

  const arquivo = (nome: string, tipo: string, tamanho = 10) => {
    const f = new File(["x".repeat(tamanho)], nome, { type: tipo });
    Object.defineProperty(f, "size", { value: tamanho });
    return f;
  };

  it("mostra a dica de formato quando não há erro", async () => {
    await abrirNovo();

    expect(screen.getByText("PNG ou JPG · até 1 MB")).toBeInTheDocument();
  });

  it("recusa arquivo que não é imagem", async () => {
    await abrirNovo();

    // `fireEvent` em vez de `upload`: o `accept="image/*"` faria o userEvent
    // descartar o arquivo antes de o handler rodar, e é justamente a recusa
    // dentro do componente que se quer verificar.
    const campo = screen.getByText("Enviar imagem").closest("label")!.querySelector("input")!;
    fireEvent.change(campo, { target: { files: [arquivo("doc.pdf", "application/pdf")] } });

    expect(await screen.findByText("Selecione um arquivo de imagem.")).toBeInTheDocument();
  });

  it("recusa imagem acima de 1 MB", async () => {
    await abrirNovo();

    await userEvent.upload(
      screen.getByText("Enviar imagem").closest("label")!.querySelector("input")!,
      arquivo("grande.png", "image/png", 1_000_001),
    );

    expect(await screen.findByText("Imagem muito grande (máx. 1 MB).")).toBeInTheDocument();
  });

  it("imagem aceita vira prévia, com opções de trocar e remover", async () => {
    await abrirNovo();

    await userEvent.upload(
      screen.getByText("Enviar imagem").closest("label")!.querySelector("input")!,
      arquivo("logo.png", "image/png"),
    );

    expect(await screen.findByAltText("Prévia")).toBeInTheDocument();
    expect(screen.getByText("Trocar")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Remover/ }));
    await waitFor(() => expect(screen.getByText("Enviar imagem")).toBeInTheDocument());
  });

  it("registro com imagem mostra a miniatura na tabela", () => {
    const { container } = rota({
      ...CONFIG,
      seed: [{ id: "a1", company: "AgroVerde", tier: "Ouro", email: "", headline: "", image: "data:image/png;base64,AA" }],
    });

    // A miniatura é decorativa (`alt=""`), então a busca é pelo elemento.
    expect(container.querySelector("td img")).toHaveAttribute("src", "data:image/png;base64,AA");
  });
});

describe("configurações de CRUD do Admin", () => {
  it("divulgações usa a mesma chave do banner rotativo", () => {
    expect(CRUD_CONFIGS.divulgacoes.storageKey).toBe("sf_sponsor_ads");
    expect(CRUD_CONFIGS.divulgacoes.searchKeys).toEqual(["company", "headline"]);
  });

  it("a configuração legada de vouchers segue como referência do formato", () => {
    expect(CRUD_VOUCHERS_LEGADO.fields.find((f) => f.key === "code")).toMatchObject({
      required: true,
      unique: true,
    });
  });
});
