import "@testing-library/jest-dom";
import { vi } from "vitest";

/**
 * Infraestrutura compartilhada dos testes.
 *
 * Duas coisas que quase todo teste desta base precisa e que o jsdom não dá:
 *
 *  1. `next-intl` — as telas chamam `useTranslations`. O mock devolve a própria
 *     chave, então as asserções ficam sobre a CHAVE (estável) e não sobre o
 *     texto traduzido, que muda a cada revisão de copy.
 *  2. APIs de navegador ausentes no jsdom: `matchMedia`, observers, `scrollTo`
 *     e `clipboard`.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave}:${JSON.stringify(valores)}` : chave;
    t.rich = (chave: string) => chave;
    return t;
  },
  useLocale: () => "pt",
}));

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

class ObserverFalso {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
vi.stubGlobal("IntersectionObserver", ObserverFalso);
vi.stubGlobal("ResizeObserver", ObserverFalso);

if (!window.scrollTo) {
  Object.defineProperty(window, "scrollTo", { writable: true, value: vi.fn() });
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    // `configurable` é obrigatório: o `userEvent.setup()` instala a própria
    // área de transferência por cima desta, e uma propriedade fixa faria a
    // chamada estourar com "Cannot redefine property".
    configurable: true,
    value: { writeText: vi.fn(async () => undefined), readText: vi.fn(async () => "") },
  });
}
