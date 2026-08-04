import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart, Donut, type Segment } from "@/components/ui/Charts";

const SEGMENTOS: Segment[] = [
  { label: "Credenciados", value: 30, tone: "primary" },
  { label: "Pendentes", value: 10, tone: "warning" },
];

describe("Donut", () => {
  it("desenha um arco por segmento, além do trilho de fundo", () => {
    const { container } = render(<Donut segments={SEGMENTOS} />);

    // 1 trilho + 1 arco por segmento.
    expect(container.querySelectorAll("circle")).toHaveLength(SEGMENTOS.length + 1);
  });

  it("lista a legenda com rótulo e valor", () => {
    render(<Donut segments={SEGMENTOS} />);

    expect(screen.getByText("Credenciados")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
  });

  it("mostra o destaque central quando informado", () => {
    render(<Donut segments={SEGMENTOS} centerValue="75%" centerLabel="do público" />);

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("do público")).toBeInTheDocument();
  });

  it("sem dados não quebra a divisão pelo total", () => {
    const { container } = render(<Donut segments={[]} />);

    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  it("segmentos zerados não geram arco visível", () => {
    const { container } = render(
      <Donut segments={[{ label: "Nenhum", value: 0, tone: "neutral" }]} />,
    );

    const arco = container.querySelectorAll("circle")[1];
    expect(arco).toHaveAttribute("stroke-dasharray", expect.stringContaining("0 "));
  });

  it("respeita o tamanho pedido", () => {
    const { container } = render(<Donut segments={SEGMENTOS} size={100} thickness={10} />);

    expect(container.querySelector("svg")).toHaveAttribute("width", "100");
  });
});

describe("BarChart", () => {
  it("mostra uma barra por item, com rótulo e valor", () => {
    render(<BarChart data={SEGMENTOS} />);

    expect(screen.getByText("Credenciados")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("a maior barra ocupa a largura toda quando não há máximo informado", () => {
    const { container } = render(<BarChart data={SEGMENTOS} />);

    const barras = container.querySelectorAll<HTMLElement>("div[style*='width']");
    expect(barras[0].style.width).toBe("100%");
    expect(barras[1].style.width).toBe("33.33333333333333%");
  });

  it("máximo informado define a escala", () => {
    const { container } = render(<BarChart data={SEGMENTOS} max={60} />);

    const barras = container.querySelectorAll<HTMLElement>("div[style*='width']");
    expect(barras[0].style.width).toBe("50%");
  });

  it("lista vazia não quebra o cálculo do máximo", () => {
    const { container } = render(<BarChart data={[]} className="extra" />);

    expect(container.firstChild).toHaveClass("extra");
  });

  it("aceita todos os tons do catálogo", () => {
    const todos: Segment[] = (
      ["primary", "secondary", "success", "warning", "info", "error", "neutral"] as const
    ).map((tone, i) => ({ label: tone, value: i + 1, tone }));

    render(<BarChart data={todos} />);

    expect(screen.getByText("neutral")).toBeInTheDocument();
  });
});
