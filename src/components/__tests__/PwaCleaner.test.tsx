import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import PwaCleaner from "@/components/PwaCleaner";

const CHAVE = "sf_pwa_legacy_cleaned_v1";

const reload = vi.fn();
const getRegistrations = vi.fn();
const cachesKeys = vi.fn();
const cachesDelete = vi.fn();

/** Registro de Service Worker que responde ao `unregister`. */
const registro = (removido = true) => ({ unregister: vi.fn(async () => removido) });

beforeEach(() => {
  localStorage.clear();
  reload.mockReset();
  getRegistrations.mockReset().mockResolvedValue([]);
  cachesKeys.mockReset().mockResolvedValue([]);
  cachesDelete.mockReset().mockResolvedValue(true);

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistrations },
  });
  vi.stubGlobal("caches", { keys: cachesKeys, delete: cachesDelete });
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PwaCleaner", () => {
  it("não desenha nada na tela", () => {
    const { container } = render(<PwaCleaner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("navegador já migrado não é tocado de novo", async () => {
    localStorage.setItem(CHAVE, "1");

    render(<PwaCleaner />);

    await new Promise((r) => setTimeout(r, 0));
    expect(getRegistrations).not.toHaveBeenCalled();
  });

  it("navegador limpo é marcado, mas não recarrega à toa", async () => {
    render(<PwaCleaner />);

    await waitFor(() => expect(localStorage.getItem(CHAVE)).toBe("1"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("Service Worker legado é desregistrado e a página recarrega uma vez", async () => {
    const legado = registro();
    getRegistrations.mockResolvedValue([legado]);

    render(<PwaCleaner />);

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(legado.unregister).toHaveBeenCalled();
    expect(localStorage.getItem(CHAVE)).toBe("1");
  });

  it("caches antigos do Workbox são apagados", async () => {
    cachesKeys.mockResolvedValue(["workbox-precache-v1", "sf-runtime"]);

    render(<PwaCleaner />);

    await waitFor(() => expect(cachesDelete).toHaveBeenCalledTimes(2));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("registro que não sai não conta como resíduo removido", async () => {
    getRegistrations.mockResolvedValue([registro(false)]);

    render(<PwaCleaner />);

    await waitFor(() => expect(localStorage.getItem(CHAVE)).toBe("1"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("falha na limpeza ainda marca o navegador, para não virar laço", async () => {
    getRegistrations.mockRejectedValue(new Error("sem permissão"));

    render(<PwaCleaner />);

    await waitFor(() => expect(localStorage.getItem(CHAVE)).toBe("1"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("storage bloqueado interrompe a limpeza sem quebrar a aplicação", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage bloqueado");
    });

    render(<PwaCleaner />);

    await new Promise((r) => setTimeout(r, 0));
    expect(getRegistrations).not.toHaveBeenCalled();
  });

  it("navegador sem Service Worker é ignorado", async () => {
    // @ts-expect-error — remoção proposital para simular o navegador sem suporte.
    delete navigator.serviceWorker;

    render(<PwaCleaner />);

    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem(CHAVE)).toBeNull();
  });
});
