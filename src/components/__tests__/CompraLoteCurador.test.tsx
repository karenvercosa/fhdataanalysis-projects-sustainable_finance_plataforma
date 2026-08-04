import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createBatch = vi.fn();
const vouchers = [
  { id: "v1", code: "VERDE2026", ownerType: "curator", ownerId: "cur_1", maxUses: 10 },
  { id: "v2", code: "OUTRO", ownerType: "curator", ownerId: "cur_9", maxUses: 5 },
];
vi.mock("@/context/VouchersContext", () => ({
  useVouchers: () => ({ createBatch, vouchers }),
}));

const { CompraLoteCurador } = await import("@/components/CompraLoteCurador");

beforeEach(() => {
  createBatch.mockReset().mockImplementation((_dono, qtd, codigo) => ({
    id: "novo",
    code: codigo?.trim() || "CUR-AAAA-BBBB",
    maxUses: qtd,
  }));
});

describe("CompraLoteCurador", () => {
  const quantidade = () => screen.getByRole("spinbutton");

  it("começa em 10 convites, com o total calculado", () => {
    render(<CompraLoteCurador />);

    expect(quantidade()).toHaveValue(10);
    expect(screen.getByRole("button", { name: /Comprar 10 convites/ })).toBeInTheDocument();
  });

  it("os botões + e − ajustam a quantidade sem passar de 1", async () => {
    render(<CompraLoteCurador />);

    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(quantidade()).toHaveValue(11);

    for (let i = 0; i < 15; i++) {
      await userEvent.click(screen.getByRole("button", { name: "−" }));
    }
    expect(quantidade()).toHaveValue(1);
  });

  it("os atalhos definem a quantidade de uma vez", async () => {
    render(<CompraLoteCurador />);

    await userEvent.click(screen.getByRole("button", { name: "25" }));

    expect(quantidade()).toHaveValue(25);
  });

  it("apagar o campo cai em 1, e não em zero convites", async () => {
    render(<CompraLoteCurador />);

    await userEvent.clear(quantidade());

    expect(quantidade()).toHaveValue(1);
  });

  it("só sugere os vouchers do próprio curador", () => {
    const { container } = render(<CompraLoteCurador />);

    const opcoes = [...container.querySelectorAll("datalist option")].map((o) =>
      o.getAttribute("value"),
    );
    expect(opcoes).toEqual(["VERDE2026"]);
  });

  it("avisa quando o código digitado reaproveita um voucher existente", async () => {
    render(<CompraLoteCurador />);

    await userEvent.type(screen.getByLabelText("Nome do voucher"), "verde2026");

    expect(screen.getByText(/Reutilizando um voucher existente/)).toBeInTheDocument();
  });

  it("avisa quando o código é novo", async () => {
    render(<CompraLoteCurador />);

    await userEvent.type(screen.getByLabelText("Nome do voucher"), "TIME2026");

    expect(screen.getByText(/Novo voucher será criado/)).toBeInTheDocument();
  });

  it("a compra cria o lote com a quantidade e o código escolhidos", async () => {
    render(<CompraLoteCurador />);

    await userEvent.type(screen.getByLabelText("Nome do voucher"), "TIME2026");
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    await userEvent.click(screen.getByRole("button", { name: /Comprar 5 convites/ }));

    expect(createBatch).toHaveBeenCalledWith("cur_1", 5, "TIME2026");
    expect(screen.getByText("Lote adquirido!")).toBeInTheDocument();
    expect(screen.getByText("TIME2026")).toBeInTheDocument();
  });

  it("copiar o código leva o voucher para a área de transferência", async () => {
    const writeText = vi.fn();
    Object.assign(navigator.clipboard, { writeText });
    render(<CompraLoteCurador />);

    await userEvent.click(screen.getByRole("button", { name: /Comprar 10 convites/ }));
    await userEvent.click(screen.getByRole("button", { name: /Copiar código/ }));

    expect(writeText).toHaveBeenCalledWith("CUR-AAAA-BBBB");
    expect(screen.getByRole("button", { name: /Copiado!/ })).toBeInTheDocument();
  });
});
