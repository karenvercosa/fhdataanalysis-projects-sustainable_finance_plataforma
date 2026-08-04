import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EuVouCard, EuVouShare, CARD_EXPORT_SIZE } from "@/components/EuVouCard";

const PROPS = {
  nomeUsuario: "Marina Costa",
  cargoEmpresa: "CTO · ACME",
  tipoParticipante: "Premium" as const,
};

beforeEach(() => localStorage.clear());

describe("EuVouCard", () => {
  it("mostra nome, cargo e o tipo de participante", () => {
    render(<EuVouCard {...PROPS} />);

    expect(screen.getByText("Marina Costa")).toBeInTheDocument();
    expect(screen.getByText("CTO · ACME")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("sem foto, cai nas iniciais", () => {
    render(<EuVouCard {...PROPS} />);

    expect(screen.getByText("MC")).toBeInTheDocument();
  });

  it("com foto, usa a imagem do perfil", () => {
    render(<EuVouCard {...PROPS} urlFotoPerfil="/foto.png" />);

    expect(screen.getByAltText("Marina Costa")).toHaveAttribute("src", "/foto.png");
  });

  it("é quadrado e mede tudo em cqw, para exportar em qualquer tamanho", () => {
    const { container } = render(<EuVouCard {...PROPS} />);
    const raiz = container.firstChild as HTMLElement;

    expect(raiz.style.aspectRatio).toBe("1 / 1");
    expect(raiz.style.containerType).toBe("inline-size");
    expect(CARD_EXPORT_SIZE).toBe(1080);
  });

  it("cada tipo de participante tem o próprio anel", () => {
    for (const tipo of ["Premium", "Palestrante", "Patrocinador"] as const) {
      const { unmount } = render(<EuVouCard {...PROPS} tipoParticipante={tipo} />);
      expect(screen.getByText(tipo)).toBeInTheDocument();
      unmount();
    }
  });

  it("traz a marca e a data do evento no rodapé", () => {
    render(<EuVouCard {...PROPS} />);

    expect(screen.getByText("Sustainable Finance")).toBeInTheDocument();
    expect(screen.getByText("04/09 · Goiânia")).toBeInTheDocument();
  });
});

describe("EuVouShare", () => {
  it("oferece baixar a imagem e publicar no LinkedIn", () => {
    render(<EuVouShare {...PROPS} />);

    expect(screen.getByRole("button", { name: /Baixar imagem/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compartilhar no LinkedIn/ })).toBeInTheDocument();
  });

  it("a geração da imagem passa por 'gerando' e avisa que é protótipo", async () => {
    vi.useFakeTimers();
    try {
      render(<EuVouShare {...PROPS} />);

      fireEvent.click(screen.getByRole("button", { name: /Baixar imagem/ }));
      expect(screen.getByRole("button", { name: /Gerando/ })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      expect(screen.getByRole("button", { name: /Imagem gerada/ })).toBeInTheDocument();
      expect(screen.getByText(/geração do arquivo ainda não está conectada/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a janela do LinkedIn mostra o texto sugerido e a prévia do card", async () => {
    render(<EuVouShare {...PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: /Compartilhar no LinkedIn/ }));

    expect(screen.getByRole("dialog", { name: "Compartilhar no LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveDisplayValue(/#SustainableFinance2026/);
    expect(screen.getByText(/nada é publicado fora da plataforma/)).toBeInTheDocument();
  });

  it("publicar e cancelar apenas fecham a simulação", async () => {
    render(<EuVouShare {...PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: /Compartilhar no LinkedIn/ }));
    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Compartilhar no LinkedIn/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
