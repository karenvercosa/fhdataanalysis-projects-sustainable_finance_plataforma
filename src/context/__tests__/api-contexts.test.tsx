import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";

const autenticado = vi.fn(() => true);
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: autenticado() }),
}));

const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), remove: vi.fn() };
vi.mock("@/lib/admin-api", () => ({ api }));

const { InterestsProvider, useInterests } = await import("@/context/InterestsContext");
const { TierMatrixProvider, useTierMatrix } = await import("@/context/TierMatrixContext");
const { DEFAULT_TIER_MATRIX, UNRESTRICTED } = await import("@/data/tierMatrix");

const CATALOGO = [
  { id: "i1", nome: "Energia", ativo: true },
  { id: "i2", nome: "Crédito de carbono", ativo: true },
];

const envolver =
  (Provider: (p: { children: ReactNode }) => JSX.Element) =>
  ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

beforeEach(() => {
  vi.resetModules();
  autenticado.mockReturnValue(true);
  api.get.mockReset().mockResolvedValue({ interesses: CATALOGO });
  api.post.mockReset();
  api.put.mockReset();
  api.remove.mockReset().mockResolvedValue({});
});

describe("InterestsContext", () => {
  const render = () =>
    renderHook(() => useInterests(), { wrapper: envolver(InterestsProvider) });

  it("carrega o catálogo ao entrar autenticado", async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(api.get).toHaveBeenCalledWith("/api/interesses");
    expect(result.current.interests).toEqual(["Energia", "Crédito de carbono"]);
  });

  it("não busca nada na tela de login", async () => {
    autenticado.mockReturnValue(false);

    render();

    await new Promise((r) => setTimeout(r, 0));
    expect(api.get).not.toHaveBeenCalled();
  });

  it("garantirCarregado busca para as telas públicas", async () => {
    autenticado.mockReturnValue(false);
    const { result } = render();

    await act(async () => {
      result.current.garantirCarregado();
    });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  });

  it("garantirCarregado não repete a busca depois de pronta", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.carregado).toBe(true));

    act(() => result.current.garantirCarregado());

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("rede fora deixa a nuvem vazia sem quebrar a tela", async () => {
    autenticado.mockReturnValue(false);
    api.get.mockRejectedValue(new Error("offline"));
    const { result } = render();

    await act(async () => {
      result.current.garantirCarregado();
    });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.interests).toEqual([]);
  });

  it("adicionar guarda o interesse criado pelo servidor", async () => {
    const novo = { id: "i3", nome: "Água", ativo: true };
    api.post.mockResolvedValue({ interesse: novo });
    const { result } = render();
    await waitFor(() => expect(result.current.carregado).toBe(true));

    await act(async () => {
      await result.current.add("  Água  ");
    });

    expect(api.post).toHaveBeenCalledWith("/api/interesses", { nome: "Água" });
    expect(result.current.interests).toContain("Água");
  });

  it("nome em branco não chega ao servidor", async () => {
    const { result } = render();

    await act(async () => {
      await result.current.add("   ");
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it("não duplica quando o servidor devolve um interesse já presente", async () => {
    api.post.mockResolvedValue({ interesse: CATALOGO[0] });
    const { result } = render();
    await waitFor(() => expect(result.current.carregado).toBe(true));

    await act(async () => {
      await result.current.add("Energia");
    });

    expect(result.current.catalogo).toHaveLength(2);
  });

  it("remover tira o item da nuvem", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.carregado).toBe(true));

    await act(async () => {
      await result.current.remove("i1");
    });

    expect(api.remove).toHaveBeenCalledWith("/api/interesses/i1");
    expect(result.current.interests).toEqual(["Crédito de carbono"]);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useInterests())).toThrow(/InterestsProvider/);
  });
});

describe("TierMatrixContext", () => {
  const MATRIZ = [
    {
      id: "c1",
      name: "Ouro",
      features: { ...UNRESTRICTED, topBanner: true },
    },
  ];

  const render = () =>
    renderHook(() => useTierMatrix(), { wrapper: envolver(TierMatrixProvider) });

  beforeEach(() => {
    api.get.mockResolvedValue({ matriz: MATRIZ });
    api.put.mockResolvedValue({ matriz: MATRIZ });
  });

  it("renderiza o padrão em código antes da resposta chegar", () => {
    const { result } = render();
    expect(result.current.matrix).toEqual(DEFAULT_TIER_MATRIX);
  });

  it("troca pelo que veio do banco", async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.carregada).toBe(true));
    expect(api.get).toHaveBeenCalledWith("/api/cotas");
    expect(result.current.matrix).toEqual(MATRIZ);
  });

  it("não chama /api/cotas sem sessão", async () => {
    autenticado.mockReturnValue(false);

    render();

    await new Promise((r) => setTimeout(r, 0));
    expect(api.get).not.toHaveBeenCalled();
  });

  it("matriz vazia do banco não apaga o padrão", async () => {
    api.get.mockResolvedValue({ matriz: [] });
    const { result } = render();

    await waitFor(() => expect(result.current.carregada).toBe(true));
    expect(result.current.matrix).toEqual(DEFAULT_TIER_MATRIX);
  });

  it("rede fora segue com o padrão em código", async () => {
    api.get.mockRejectedValue(new Error("offline"));
    const { result } = render();

    await waitFor(() => expect(result.current.carregada).toBe(true));
    expect(result.current.matrix).toEqual(DEFAULT_TIER_MATRIX);
  });

  it("salvar grava no servidor e assume a resposta dele", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.carregada).toBe(true));

    await act(async () => {
      await result.current.save(MATRIZ);
    });

    expect(api.put).toHaveBeenCalledWith("/api/cotas", { matriz: MATRIZ });
    expect(result.current.matrix).toEqual(MATRIZ);
  });

  it("reset repõe os recursos padrão preservando os ids das cotas", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.carregada).toBe(true));

    await act(async () => {
      await result.current.reset();
    });

    expect(api.put).toHaveBeenCalledWith("/api/cotas", {
      matriz: [{ ...MATRIZ[0], features: DEFAULT_TIER_MATRIX[0].features }],
    });
  });

  it("featuresOf devolve os recursos da cota", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.carregada).toBe(true));

    expect(result.current.featuresOf("Ouro")).toEqual(MATRIZ[0].features);
  });

  it("sem cota (ou cota desconhecida) não há restrição", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.carregada).toBe(true));

    expect(result.current.featuresOf()).toEqual(UNRESTRICTED);
    expect(result.current.featuresOf("Platina")).toEqual(UNRESTRICTED);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTierMatrix())).toThrow(/TierMatrixProvider/);
  });
});
