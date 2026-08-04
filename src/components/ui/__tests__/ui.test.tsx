import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QRCode } from "@/components/ui/QRCode";
import { Radio } from "@/components/ui/Radio";
import { SuccessCard } from "@/components/ui/SuccessCard";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { campo } from "@/components/ui/campo";

/**
 * Componentes do Design System.
 *
 * A asserção é sempre sobre COMPORTAMENTO e acessibilidade — o que o usuário
 * consegue ver, focar e acionar. Classe de estilo só entra quando ela é a
 * própria regra (o `campo`, por exemplo).
 */

describe("Avatar", () => {
  it("mostra as iniciais quando não há foto", () => {
    render(<Avatar name="marina costa silva" />);
    // No máximo duas iniciais, em maiúsculas.
    expect(screen.getByText("MC")).toBeInTheDocument();
  });

  it("mostra a foto com o nome como texto alternativo", () => {
    render(<Avatar name="Marina" src="/foto.png" size="lg" />);

    const img = screen.getByAltText("Marina");
    expect(img).toHaveAttribute("src", "/foto.png");
  });

  it("aceita tamanho pequeno", () => {
    const { container } = render(<Avatar name="Ana" size="sm" className="extra" />);
    expect(container.firstChild).toHaveClass("extra");
  });
});

describe("Badge", () => {
  it("renderiza o conteúdo", () => {
    render(<Badge>Confirmado</Badge>);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("aceita cada tom do DS", () => {
    for (const tone of ["success", "warning", "error", "info", "neutral", "primary", "secondary"] as const) {
      cleanup();
      render(<Badge tone={tone}>{tone}</Badge>);
      expect(screen.getByText(tone)).toBeInTheDocument();
    }
  });
});

describe("Button", () => {
  it("aciona o clique", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("carregando desabilita e troca o ícone pelo spinner", () => {
    render(
      <Button loading leftIcon={<span data-testid="icone" />}>
        Enviar
      </Button>,
    );

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.queryByTestId("icone")).not.toBeInTheDocument();
  });

  it("mostra o ícone à esquerda quando não está carregando", () => {
    render(<Button leftIcon={<span data-testid="icone" />}>Enviar</Button>);
    expect(screen.getByTestId("icone")).toBeInTheDocument();
  });

  it("desabilitado não dispara clique", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("aceita todas as variantes e tamanhos", () => {
    for (const variant of ["primary", "secondary", "outline", "ghost", "dark", "danger"] as const) {
      for (const size of ["sm", "md", "lg"] as const) {
        cleanup();
        render(
          <Button variant={variant} size={size} fullWidth>
            {variant}-{size}
          </Button>,
        );
        expect(screen.getByRole("button")).toBeEnabled();
      }
    }
  });
});

describe("Card", () => {
  it("renderiza cabeçalho e corpo", () => {
    render(
      <Card>
        <CardHeader>Título</CardHeader>
        <CardBody>Conteúdo</CardBody>
      </Card>,
    );

    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("troca a tag pela informada em `as`", () => {
    const { container } = render(<Card as="section">x</Card>);
    expect(container.querySelector("section")).toBeInTheDocument();
  });
});

describe("Checkbox", () => {
  it("marca e desmarca pelo rótulo", async () => {
    function Controlado() {
      const [on, setOn] = useState(false);
      return <Checkbox checked={on} onChange={setOn} label="Aceito os termos" />;
    }
    render(<Controlado />);

    const caixa = screen.getByLabelText("Aceito os termos");
    await userEvent.click(caixa);
    expect(caixa).toBeChecked();

    await userEvent.click(caixa);
    expect(caixa).not.toBeChecked();
  });

  it("mostra a dica de apoio", () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Rótulo" hint="Explicação" />);
    expect(screen.getByText("Explicação")).toBeInTheDocument();
  });

  it("desabilitado não alterna", async () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Rótulo" disabled />);

    await userEvent.click(screen.getByLabelText("Rótulo"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("respeita o id informado", () => {
    render(<Checkbox id="meu-id" checked onChange={vi.fn()} label="Rótulo" />);
    expect(screen.getByLabelText("Rótulo")).toHaveAttribute("id", "meu-id");
  });
});

describe("Input", () => {
  it("liga rótulo e campo", async () => {
    render(<Input label="E-mail" />);

    await userEvent.type(screen.getByLabelText("E-mail"), "a@x.com");

    expect(screen.getByLabelText("E-mail")).toHaveValue("a@x.com");
  });

  it("erro marca o campo como inválido e é anunciado", () => {
    render(<Input label="E-mail" error="Informe um e-mail válido." hint="ignorada" />);

    const campoInput = screen.getByLabelText("E-mail");
    expect(campoInput).toHaveAttribute("aria-invalid", "true");
    expect(campoInput).toHaveAccessibleDescription("Informe um e-mail válido.");
    // Com erro, a dica dá lugar à mensagem.
    expect(screen.queryByText("ignorada")).not.toBeInTheDocument();
  });

  it("dica é associada ao campo quando não há erro", () => {
    render(<Input label="Senha" hint="Mínimo de 8 caracteres" />);

    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription("Mínimo de 8 caracteres");
  });

  it("estado de sucesso e conteúdo à direita", () => {
    render(<Input label="CNPJ" success rightSlot={<span data-testid="ok" />} />);

    expect(screen.getByTestId("ok")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).toHaveAttribute("aria-invalid", "false");
  });

  it("funciona sem rótulo", () => {
    render(<Input placeholder="Buscar" />);
    expect(screen.getByPlaceholderText("Buscar")).toBeInTheDocument();
  });
});

describe("Loader", () => {
  it("anuncia o carregamento para leitores de tela", () => {
    render(<Loader />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("aceita rótulo próprio", () => {
    render(<Loader label="Buscando vouchers" />);
    expect(screen.getByText("Buscando vouchers")).toBeInTheDocument();
  });
});

describe("Modal", () => {
  it("fechado não renderiza nada", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Confirmar">
        corpo
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aberto expõe um diálogo rotulado", () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirmar" footer={<button>OK</button>}>
        corpo
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByText("corpo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("fecha no botão, no clique fora e no Esc", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open onClose={onClose} title="Confirmar">
        corpo
      </Modal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await userEvent.click(container.querySelector(".bg-black\\/40")!);
    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("trava a rolagem do fundo enquanto está aberto", () => {
    const { unmount } = render(
      <Modal open onClose={vi.fn()} title="Confirmar">
        corpo
      </Modal>,
    );

    expect(document.body).toHaveClass("no-scroll");

    unmount();
    expect(document.body).not.toHaveClass("no-scroll");
  });

  it("outra tecla não fecha", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Confirmar">
        corpo
      </Modal>,
    );

    await userEvent.keyboard("{Enter}");

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ProgressBar", () => {
  it("expõe o percentual para a tecnologia assistiva", () => {
    render(<ProgressBar value={25} max={50} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("não passa de 100%", () => {
    render(<ProgressBar value={200} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("aceita o tom de alerta", () => {
    render(<ProgressBar value={10} tone="warning" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});

describe("QRCode", () => {
  it("descreve o ingresso na imagem", () => {
    render(<QRCode value="SF26-AAAA-BBBB" />);
    expect(screen.getByRole("img", { name: /SF26-AAAA-BBBB/ })).toBeInTheDocument();
  });

  it("o mesmo código gera sempre o mesmo desenho", () => {
    const { container: a } = render(<QRCode value="SF26-AAAA-BBBB" />);
    const { container: b } = render(<QRCode value="SF26-AAAA-BBBB" />);

    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it("códigos diferentes geram desenhos diferentes", () => {
    const { container: a } = render(<QRCode value="SF26-AAAA-BBBB" />);
    const { container: b } = render(<QRCode value="SF26-CCCC-DDDD" />);

    expect(a.innerHTML).not.toBe(b.innerHTML);
  });

  it("respeita o tamanho pedido", () => {
    const { container } = render(<QRCode value="x" size={120} />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "120");
  });
});

describe("Radio", () => {
  it("escolhe a opção e devolve o valor", async () => {
    const onChange = vi.fn();
    render(
      <Radio checked={false} onChange={onChange} label="Online" name="produto" value="online" />,
    );

    await userEvent.click(screen.getByLabelText("Online"));

    expect(onChange).toHaveBeenCalledWith("online");
  });

  it("desabilitado não escolhe", async () => {
    const onChange = vi.fn();
    render(
      <Radio
        checked={false}
        onChange={onChange}
        label="Online"
        name="produto"
        value="online"
        disabled
      />,
    );

    await userEvent.click(screen.getByLabelText("Online"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("mostra a dica", () => {
    render(
      <Radio
        checked
        onChange={vi.fn()}
        label="Presencial"
        hint="Inclui credencial"
        name="produto"
        value="presencial"
        id="p"
      />,
    );

    expect(screen.getByText("Inclui credencial")).toBeInTheDocument();
    expect(screen.getByRole("radio")).toBeChecked();
  });
});

describe("SuccessCard", () => {
  it("mostra a confirmação e leva ao destino", () => {
    render(
      <MemoryRouter>
        <SuccessCard title="Tudo certo" desc="Confira seu e-mail" btnText="Entrar" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Tudo certo" })).toBeInTheDocument();
    expect(screen.getByText("Confira seu e-mail")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });

  it("aceita outro destino", () => {
    render(
      <MemoryRouter>
        <SuccessCard title="t" desc="d" btnText="Ir" to="/inicio" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Ir" })).toHaveAttribute("href", "/inicio");
  });
});

describe("Switch", () => {
  it("alterna e expõe o estado", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Analytics" />);

    const botao = screen.getByRole("switch", { name: "Analytics" });
    expect(botao).toHaveAttribute("aria-checked", "false");

    await userEvent.click(botao);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("ligado devolve false ao clicar", async () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} label="Analytics" />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("desabilitado não alterna", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Analytics" disabled />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Tooltip", () => {
  it("envolve o filho e descreve a ação", () => {
    render(
      <Tooltip label="Copiar código">
        <button>Copiar</button>
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Copiar código");
  });

  it("aceita o balão abaixo do elemento", () => {
    render(
      <Tooltip label="Abaixo" side="bottom">
        <button>x</button>
      </Tooltip>,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent("Abaixo");
  });
});

describe("campo", () => {
  it("é a classe compartilhada dos inputs sobre o card escuro", () => {
    expect(campo).toContain("rounded-md");
    expect(campo).toContain("focus:ring-primary-100");
  });
});
