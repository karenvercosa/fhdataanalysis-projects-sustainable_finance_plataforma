import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PhoneField, paisPadraoDoLocale } from "@/components/ui/PhoneField";

describe("paisPadraoDoLocale", () => {
  it("abre em +55 para quem navega em português", () => {
    expect(paisPadraoDoLocale("pt")).toBe("BR");
    expect(paisPadraoDoLocale("pt-BR")).toBe("BR");
  });

  it("abre nos EUA para quem navega em inglês", () => {
    expect(paisPadraoDoLocale("en")).toBe("US");
    expect(paisPadraoDoLocale("EN-us")).toBe("US");
  });

  it("qualquer outro idioma cai no padrão brasileiro", () => {
    expect(paisPadraoDoLocale("es")).toBe("BR");
  });
});

function Campo(props: Partial<Parameters<typeof PhoneField>[0]> = {}) {
  const [valor, setValor] = useState("");
  return (
    <PhoneField
      value={valor}
      onChange={setValor}
      inputClassName="campo"
      ariaLabel="Celular"
      {...props}
    />
  );
}

describe("PhoneField", () => {
  it("devolve o número em E.164, que é o formato que o cadastro espera", async () => {
    const onChange = vi.fn();
    render(<PhoneField value="" onChange={onChange} inputClassName="campo" ariaLabel="Celular" />);

    await userEvent.type(screen.getByLabelText("Celular"), "62999998888");

    expect(onChange).toHaveBeenLastCalledWith("+5562999998888");
  });

  it("mostra um exemplo real do país selecionado como placeholder", () => {
    render(<Campo />);

    // O exemplo brasileiro é um celular no formato nacional.
    expect(screen.getByLabelText("Celular")).toHaveAttribute(
      "placeholder",
      expect.stringMatching(/^\(\d{2}\)/),
    );
  });

  it("o seletor de país abre a lista própria, e não o select nativo", async () => {
    render(<Campo />);

    await userEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("escolher um país fecha a lista e troca o exemplo", async () => {
    render(<Campo />);

    await userEvent.click(screen.getByRole("button", { expanded: false }));
    const opcoes = screen.getAllByRole("button", { pressed: false });
    await userEvent.click(opcoes.find((b) => b.textContent?.includes("Portugal"))!);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("fecha no Esc", async () => {
    render(<Campo />);

    await userEvent.click(screen.getByRole("button", { expanded: false }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("fecha ao clicar fora", async () => {
    render(
      <div>
        <Campo />
        <button>fora</button>
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { expanded: false }));
    await userEvent.click(screen.getByRole("button", { name: "fora" }));

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("abre no país informado", () => {
    render(<Campo defaultCountry="US" />);

    // Exemplo dos EUA não começa com parêntese de DDD brasileiro de 2 dígitos.
    expect(screen.getByLabelText("Celular")).toHaveAttribute("placeholder");
  });

  it("apagar o número devolve string vazia, e não undefined", async () => {
    const onChange = vi.fn();
    render(
      <PhoneField
        value="+5562999998888"
        onChange={onChange}
        inputClassName="campo"
        ariaLabel="Celular"
      />,
    );

    await userEvent.clear(screen.getByLabelText("Celular"));

    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
