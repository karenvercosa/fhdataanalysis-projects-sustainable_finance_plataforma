import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { CheckinProvider, useCheckin } from "@/context/CheckinContext";
import {
  ConnectionFavoritesProvider,
  useConnectionFavorites,
} from "@/context/ConnectionFavoritesContext";
import { CookieConsentProvider, useCookieConsent } from "@/context/CookieConsentContext";
import { FavoritesProvider, useFavorites } from "@/context/FavoritesContext";
import { ParticipationProvider, useParticipation } from "@/context/ParticipationContext";
import { PermissionsProvider, usePermissions } from "@/context/PermissionsContext";
import { SessionsProvider, useSessions } from "@/context/SessionsContext";
import { VouchersProvider, useVouchers } from "@/context/VouchersContext";
import { DEFAULT_MATRIX } from "@/lib/roles";

/**
 * Contextos que guardam estado no `localStorage`.
 *
 * O que interessa aqui é a REGRA de cada um — favoritar alterna, participação
 * não conta duas vezes, o lote de vouchers soma no código existente — e não a
 * persistência, que já tem teste próprio em `usePersistentState`.
 */

const envolver =
  (Provider: (p: { children: ReactNode }) => JSX.Element) =>
  ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("CheckinContext", () => {
  const render = () => renderHook(() => useCheckin(), { wrapper: envolver(CheckinProvider) });

  it("credencia quem o operador bipou", () => {
    const { result } = render();
    const alvo = result.current.attendees.find((a) => a.status !== "Credenciado")!;

    act(() => result.current.credential(alvo.id));

    expect(result.current.attendees.find((a) => a.id === alvo.id)!.status).toBe("Credenciado");
  });

  it("alterna o check para desfazer um bip errado", () => {
    const { result } = render();
    const alvo = result.current.attendees[0];

    act(() => result.current.credential(alvo.id));
    act(() => result.current.toggle(alvo.id));

    expect(result.current.attendees.find((a) => a.id === alvo.id)!.status).toBe("Confirmado");
  });

  it("as estatísticas fecham com a lista", () => {
    const { result } = render();
    const { total, credentialed, pending, rate } = result.current.stats;

    expect(total).toBe(result.current.attendees.length);
    expect(credentialed + pending).toBe(total);
    expect(rate).toBe(Math.round((credentialed / total) * 100));
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCheckin())).toThrow(/CheckinProvider/);
  });
});

describe("FavoritesContext", () => {
  const render = () => renderHook(() => useFavorites(), { wrapper: envolver(FavoritesProvider) });

  it("favoritar e desfavoritar é o mesmo botão", () => {
    const { result } = render();

    act(() => result.current.toggle("nova"));
    expect(result.current.isFavorite("nova")).toBe(true);

    act(() => result.current.toggle("nova"));
    expect(result.current.isFavorite("nova")).toBe(false);
  });

  it("o contador acompanha o conjunto", () => {
    const { result } = render();
    const antes = result.current.count;

    act(() => result.current.toggle("nova"));

    expect(result.current.count).toBe(antes + 1);
    expect(result.current.favorites.has("nova")).toBe(true);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useFavorites())).toThrow(/FavoritesProvider/);
  });
});

describe("ConnectionFavoritesContext", () => {
  const render = () =>
    renderHook(() => useConnectionFavorites(), { wrapper: envolver(ConnectionFavoritesProvider) });

  it("começa vazio e alterna por id", () => {
    const { result } = render();
    expect(result.current.count).toBe(0);

    act(() => result.current.toggle("p1"));
    expect(result.current.isFavorite("p1")).toBe(true);

    act(() => result.current.toggle("p1"));
    expect(result.current.count).toBe(0);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useConnectionFavorites())).toThrow(
      /ConnectionFavoritesProvider/,
    );
  });
});

describe("CookieConsentContext", () => {
  const render = () =>
    renderHook(() => useCookieConsent(), { wrapper: envolver(CookieConsentProvider) });

  it("nasce pendente — o banner precisa aparecer", () => {
    const { result } = render();

    expect(result.current.pendente).toBe(true);
    expect(result.current.prefs).toBeNull();
  });

  it("aceitar todos liga analytics e marketing e grava a data", () => {
    const { result } = render();

    act(() => result.current.aceitarTodos());

    expect(result.current.prefs).toMatchObject({
      necessarios: true,
      analytics: true,
      marketing: true,
    });
    expect(Date.parse(result.current.prefs!.decididoEm)).not.toBeNaN();
    expect(result.current.pendente).toBe(false);
  });

  it("salvar respeita a escolha parcial", () => {
    const { result } = render();

    act(() => result.current.salvar({ analytics: true, marketing: false }));

    expect(result.current.prefs).toMatchObject({ analytics: true, marketing: false });
  });

  it("revisar devolve à decisão pendente", () => {
    const { result } = render();

    act(() => result.current.aceitarTodos());
    act(() => result.current.revisar());

    expect(result.current.pendente).toBe(true);
  });

  it("abre e fecha o painel de preferências", () => {
    const { result } = render();

    act(() => result.current.abrirPainel());
    expect(result.current.painelAberto).toBe(true);

    act(() => result.current.fecharPainel());
    expect(result.current.painelAberto).toBe(false);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCookieConsent())).toThrow(/CookieConsentProvider/);
  });
});

describe("ParticipationContext", () => {
  const render = () =>
    renderHook(() => useParticipation(), { wrapper: envolver(ParticipationProvider) });

  it("assistir duas vezes não infla a métrica", () => {
    const { result } = render();

    act(() => result.current.markWatched("s1"));
    act(() => result.current.markWatched("s1"));

    expect(result.current.watched).toEqual(["s1"]);
    expect(result.current.hasWatched("s1")).toBe(true);
  });

  it("registra downloads separadamente", () => {
    const { result } = render();

    act(() => result.current.markDownload("c1"));

    expect(result.current.downloads).toEqual(["c1"]);
    expect(result.current.watched).toEqual([]);
  });

  it("reset limpa os dois registros", () => {
    const { result } = render();

    act(() => result.current.markWatched("s1"));
    act(() => result.current.markDownload("c1"));
    act(() => result.current.reset());

    expect(result.current.watched).toEqual([]);
    expect(result.current.downloads).toEqual([]);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useParticipation())).toThrow(/ParticipationProvider/);
  });
});

describe("PermissionsContext", () => {
  const render = () =>
    renderHook(() => usePermissions(), { wrapper: envolver(PermissionsProvider) });

  it("começa na matriz padrão", () => {
    const { result } = render();
    expect(result.current.matrix).toEqual(DEFAULT_MATRIX);
  });

  it("alternar concede e revoga a capacidade", () => {
    const { result } = render();
    const cap = DEFAULT_MATRIX.admin[0];

    act(() => result.current.toggle("admin", cap));
    expect(result.current.can("admin", cap)).toBe(false);

    act(() => result.current.toggle("admin", cap));
    expect(result.current.can("admin", cap)).toBe(true);
  });

  it("papel desconhecido não concede nada", () => {
    const { result } = render();
    expect(result.current.can("inexistente" as never, DEFAULT_MATRIX.admin[0])).toBe(false);
  });

  it("reset volta ao padrão", () => {
    const { result } = render();
    const cap = DEFAULT_MATRIX.admin[0];

    act(() => result.current.toggle("admin", cap));
    act(() => result.current.reset());

    expect(result.current.matrix).toEqual(DEFAULT_MATRIX);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => usePermissions())).toThrow(/PermissionsProvider/);
  });
});

describe("SessionsContext", () => {
  const render = () => renderHook(() => useSessions(), { wrapper: envolver(SessionsProvider) });

  const NOVA = {
    title: "Painel de teste",
    speaker: "Fulana",
    start: "10:00",
    end: "11:00",
    track: "Trilha",
    room: "Sala 1",
    day: "04/09",
  } as never;

  it("adiciona com id gerado e sem favorito", () => {
    const { result } = render();
    const antes = result.current.sessions.length;

    act(() => result.current.add(NOVA));

    const criada = result.current.sessions.at(-1)!;
    expect(result.current.sessions).toHaveLength(antes + 1);
    expect(criada.id).toBeTruthy();
    expect(criada.favorite).toBe(false);
  });

  it("atualiza pelo id", () => {
    const { result } = render();
    const alvo = result.current.sessions[0];

    act(() => result.current.update(alvo.id, { ...NOVA, title: "Renomeada" } as never));

    expect(result.current.sessions[0].title).toBe("Renomeada");
  });

  it("remove pelo id", () => {
    const { result } = render();
    const alvo = result.current.sessions[0];

    act(() => result.current.remove(alvo.id));

    expect(result.current.sessions.some((s) => s.id === alvo.id)).toBe(false);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSessions())).toThrow(/SessionsProvider/);
  });
});

describe("VouchersContext", () => {
  const render = () => renderHook(() => useVouchers(), { wrapper: envolver(VouchersProvider) });

  it("busca por código ignora caixa e espaços, e só acha voucher ativo", () => {
    const { result } = render();
    const ativo = result.current.vouchers.find((v) => v.active)!;

    expect(result.current.getByCode(`  ${ativo.code.toLowerCase()} `)?.id).toBe(ativo.id);

    act(() => result.current.toggleActive(ativo.id));
    expect(result.current.getByCode(ativo.code)).toBeUndefined();
  });

  it("resgatar consome um uso e respeita o limite", () => {
    const { result } = render();
    const alvo = result.current.vouchers[0];
    const restantes = result.current.remaining(alvo);

    act(() => result.current.redeem(alvo.id));

    expect(result.current.remaining(result.current.vouchers[0])).toBe(restantes - 1);
  });

  it("não resgata além do máximo", () => {
    const { result } = render();
    const alvo = result.current.vouchers[0];

    for (let i = 0; i < alvo.maxUses + 3; i++) act(() => result.current.redeem(alvo.id));

    expect(result.current.vouchers[0].usedCount).toBe(alvo.maxUses);
  });

  it("lote novo nasce gratuito, ativo e do curador", () => {
    const { result } = render();

    let criado: ReturnType<typeof result.current.createBatch>;
    act(() => {
      criado = result.current.createBatch("cur-1", 5, "TIME2026");
    });

    expect(criado!).toMatchObject({
      code: "TIME2026",
      kind: "free",
      maxUses: 5,
      usedCount: 0,
      ownerType: "curator",
      ownerId: "cur-1",
      active: true,
    });
  });

  it("código em branco gera um automático", () => {
    const { result } = render();

    let criado: ReturnType<typeof result.current.createBatch>;
    act(() => {
      criado = result.current.createBatch("cur-1", 2);
    });

    expect(criado!.code).toMatch(/^CUR-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("mesmo código do mesmo curador soma convites em vez de duplicar", () => {
    const { result } = render();

    act(() => {
      result.current.createBatch("cur-1", 5, "TIME2026");
    });
    const antes = result.current.vouchers.length;

    let somado: ReturnType<typeof result.current.createBatch>;
    act(() => {
      somado = result.current.createBatch("cur-1", 3, " time2026 ");
    });

    expect(somado!.maxUses).toBe(8);
    expect(result.current.vouchers).toHaveLength(antes);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useVouchers())).toThrow(/VouchersProvider/);
  });
});
