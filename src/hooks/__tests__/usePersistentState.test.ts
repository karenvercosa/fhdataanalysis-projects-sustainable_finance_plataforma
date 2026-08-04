import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistentState } from "@/hooks/usePersistentState";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("usePersistentState", () => {
  it("começa no valor inicial quando não há nada gravado", () => {
    const { result } = renderHook(() => usePersistentState("chave", { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it("hidrata do storage na primeira render", () => {
    localStorage.setItem("chave", JSON.stringify(["gravado"]));

    const { result } = renderHook(() => usePersistentState<string[]>("chave", []));

    expect(result.current[0]).toEqual(["gravado"]);
  });

  it("regrava a cada mudança", () => {
    const { result } = renderHook(() => usePersistentState("chave", 0));

    act(() => result.current[1](7));

    expect(result.current[0]).toBe(7);
    expect(localStorage.getItem("chave")).toBe("7");
  });

  it("aceita o atualizador em função, como o useState", () => {
    const { result } = renderHook(() => usePersistentState("chave", 1));

    act(() => result.current[1]((n) => n + 1));

    expect(result.current[0]).toBe(2);
  });

  it("valor corrompido no storage cai no inicial em vez de quebrar a tela", () => {
    localStorage.setItem("chave", "{json quebrado");

    const { result } = renderHook(() => usePersistentState("chave", "padrão"));

    expect(result.current[0]).toBe("padrão");
  });

  it("storage indisponível (modo privado) não derruba a leitura nem a escrita", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("sem storage");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("sem storage");
    });

    const { result } = renderHook(() => usePersistentState("chave", "padrão"));
    expect(result.current[0]).toBe("padrão");

    expect(() => act(() => result.current[1]("outro"))).not.toThrow();
    expect(result.current[0]).toBe("outro");
  });

  it("grava sob a chave informada e reage à troca de chave", () => {
    localStorage.setItem("b", JSON.stringify("de-b"));

    const { result, rerender } = renderHook(({ k }) => usePersistentState(k, "inicial"), {
      initialProps: { k: "a" },
    });

    expect(localStorage.getItem("a")).toBe('"inicial"');

    rerender({ k: "b" });

    // O estado não é reidratado na troca — o efeito apenas regrava sob a chave nova.
    expect(localStorage.getItem("b")).toBe('"inicial"');
  });
});
