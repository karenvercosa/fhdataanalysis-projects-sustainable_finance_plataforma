import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const sessoes = vi.fn();
vi.mock("@/context/SessionsContext", () => ({ useSessions: () => ({ sessions: sessoes() }) }));

const { formatElapsed, formatCountdown, statusOf, useNowMinutes, useEventNow } = await import(
  "@/hooks/useEventNow"
);

/** Sessão mínima: o hook só olha horário. */
function sessao(id: string, start: string, end: string) {
  return { id, start, end } as never;
}

/** Fixa o relógio em HH:mm do dia. */
function relogioEm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const data = new Date(2026, 8, 4, h, m, 0);
  vi.setSystemTime(data);
}

beforeEach(() => {
  vi.useFakeTimers();
  sessoes.mockReturnValue([]);
});

afterEach(() => vi.useRealTimers());

describe("formatElapsed", () => {
  it("menos de um minuto é 'começou agora'", () => {
    expect(formatElapsed(0)).toBe("começou agora");
  });

  it("abaixo de uma hora conta em minutos", () => {
    expect(formatElapsed(12)).toBe("começou há 12 min");
    expect(formatElapsed(59)).toBe("começou há 59 min");
  });

  it("hora cheia não mostra os minutos", () => {
    expect(formatElapsed(60)).toBe("começou há 1h");
    expect(formatElapsed(120)).toBe("começou há 2h");
  });

  it("hora quebrada mostra os minutos com dois dígitos", () => {
    expect(formatElapsed(65)).toBe("começou há 1h05");
    expect(formatElapsed(135)).toBe("começou há 2h15");
  });
});

describe("formatCountdown", () => {
  it("menos de um minuto é 'começa agora'", () => {
    expect(formatCountdown(0)).toBe("começa agora");
  });

  it("abaixo de uma hora conta em minutos", () => {
    expect(formatCountdown(45)).toBe("em 45 min");
  });

  it("hora cheia e hora quebrada", () => {
    expect(formatCountdown(60)).toBe("em 1h");
    expect(formatCountdown(90)).toBe("em 1h30");
  });
});

describe("statusOf", () => {
  const pauta = { start: "10:00", end: "11:00" };

  it("antes do início", () => {
    expect(statusOf(pauta, 9 * 60)).toBe("before");
  });

  it("no intervalo, inclusive no minuto de abertura", () => {
    expect(statusOf(pauta, 10 * 60)).toBe("live");
    expect(statusOf(pauta, 10 * 60 + 30)).toBe("live");
  });

  it("o minuto de encerramento já é 'after'", () => {
    expect(statusOf(pauta, 11 * 60)).toBe("after");
    expect(statusOf(pauta, 12 * 60)).toBe("after");
  });
});

describe("useNowMinutes", () => {
  it("devolve o minuto atual do dia", () => {
    relogioEm("14:30");
    const { result } = renderHook(() => useNowMinutes());
    expect(result.current).toBe(870);
  });

  it("atualiza sozinho a cada 30s", () => {
    relogioEm("14:30");
    const { result } = renderHook(() => useNowMinutes());

    relogioEm("14:31");
    act(() => void vi.advanceTimersByTime(30_000));

    expect(result.current).toBe(871);
  });

  it("limpa o intervalo ao desmontar", () => {
    const limpar = vi.spyOn(window, "clearInterval");
    relogioEm("14:30");

    renderHook(() => useNowMinutes()).unmount();

    expect(limpar).toHaveBeenCalled();
    limpar.mockRestore();
  });
});

describe("useEventNow", () => {
  it("programação vazia é fase encerrada", () => {
    relogioEm("10:00");
    sessoes.mockReturnValue([]);

    expect(renderHook(() => useEventNow()).result.current).toEqual({
      phase: "after",
      current: [],
      elapsed: 0,
      next: null,
      minutesToNext: 0,
    });
  });

  it("antes da primeira sessão a fase é 'before' e há contagem regressiva", () => {
    relogioEm("08:00");
    sessoes.mockReturnValue([sessao("s1", "09:00", "10:00")]);

    const { result } = renderHook(() => useEventNow());

    expect(result.current.phase).toBe("before");
    expect(result.current.next?.id).toBe("s1");
    expect(result.current.minutesToNext).toBe(60);
    expect(result.current.current).toEqual([]);
  });

  it("durante uma sessão a fase é 'live' e conta o tempo decorrido", () => {
    relogioEm("09:20");
    sessoes.mockReturnValue([sessao("s1", "09:00", "10:00"), sessao("s2", "11:00", "12:00")]);

    const { result } = renderHook(() => useEventNow());

    expect(result.current.phase).toBe("live");
    expect(result.current.current.map((s: { id: string }) => s.id)).toEqual(["s1"]);
    expect(result.current.elapsed).toBe(20);
    expect(result.current.next?.id).toBe("s2");
  });

  it("trilhas paralelas aparecem juntas em 'acontecendo agora'", () => {
    relogioEm("10:15");
    sessoes.mockReturnValue([sessao("s1", "10:00", "11:00"), sessao("s2", "10:00", "11:00")]);

    const { result } = renderHook(() => useEventNow());

    expect(result.current.current).toHaveLength(2);
  });

  it("entre duas sessões a fase é 'break'", () => {
    relogioEm("10:30");
    sessoes.mockReturnValue([sessao("s1", "09:00", "10:00"), sessao("s2", "11:00", "12:00")]);

    const { result } = renderHook(() => useEventNow());

    expect(result.current.phase).toBe("break");
    expect(result.current.next?.id).toBe("s2");
    expect(result.current.minutesToNext).toBe(30);
  });

  it("depois da última sessão a fase é 'after' e não há próxima", () => {
    relogioEm("23:00");
    sessoes.mockReturnValue([sessao("s1", "09:00", "10:00")]);

    const { result } = renderHook(() => useEventNow());

    expect(result.current.phase).toBe("after");
    expect(result.current.next).toBeNull();
    expect(result.current.minutesToNext).toBe(0);
  });

  it("ordena a grade antes de decidir — a lista pode chegar fora de ordem", () => {
    relogioEm("08:00");
    sessoes.mockReturnValue([sessao("tarde", "16:00", "17:00"), sessao("cedo", "09:00", "10:00")]);

    const { result } = renderHook(() => useEventNow());

    expect(result.current.next?.id).toBe("cedo");
    expect(result.current.phase).toBe("before");
  });
});
