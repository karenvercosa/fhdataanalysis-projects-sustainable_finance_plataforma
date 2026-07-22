import { useEffect, useState } from "react";
import { useSessions } from "@/context/SessionsContext";
import { toMinutes, type Session } from "@/data/mock";

export type EventPhase = "before" | "live" | "break" | "after";

export interface EventNow {
  phase: EventPhase;
  /** Sessões em andamento (trilhas paralelas compartilham o horário). */
  current: Session[];
  /** Minutos desde o início da sessão em andamento. */
  elapsed: number;
  /** Próxima sessão da grade (null quando a programação acabou). */
  next: Session | null;
  /** Minutos até a próxima sessão começar. */
  minutesToNext: number;
}

/** "há 1 h 05" / "há 12 min" — usado no card de "acontecendo agora". */
export function formatElapsed(min: number): string {
  if (min < 1) return "começou agora";
  if (min < 60) return `começou há ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `começou há ${h}h` : `começou há ${h}h${String(m).padStart(2, "0")}`;
}

export function formatCountdown(min: number): string {
  if (min < 1) return "começa agora";
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `em ${h}h` : `em ${h}h${String(m).padStart(2, "0")}`;
}

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

/** Status de uma pauta em relação ao relógio. */
export type SessionStatus = "before" | "live" | "after";

/**
 * Minuto atual do dia, atualizado a cada 30s. Base de todo cálculo de "agora"
 * — assim os componentes não precisam ter seus próprios timers.
 */
export function useNowMinutes(): number {
  const [now, setNow] = useState(() => minutesOfDay(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setNow(minutesOfDay(new Date())), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

/** Onde a pauta está em relação ao horário: antes, acontecendo ou encerrada. */
export function statusOf(session: { start: string; end: string }, now: number): SessionStatus {
  if (now < toMinutes(session.start)) return "before";
  return now < toMinutes(session.end) ? "live" : "after";
}

/**
 * Estado da programação "agora". O evento é em 04/09/2026, então o protótipo
 * projeta a HORA do relógio sobre a grade do dia — assim o painel mostra
 * conteúdo real a qualquer momento, sem esperar a data do evento.
 *
 * Atualiza a cada 30s para o "há quanto tempo começou" não ficar velho.
 */
export function useEventNow(): EventNow {
  const { sessions } = useSessions();
  const now = useNowMinutes();

  const sorted = [...sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  if (sorted.length === 0) {
    return { phase: "after", current: [], elapsed: 0, next: null, minutesToNext: 0 };
  }

  const current = sorted.filter((s) => toMinutes(s.start) <= now && now < toMinutes(s.end));
  const next = sorted.find((s) => toMinutes(s.start) > now) ?? null;

  const phase: EventPhase = current.length
    ? "live"
    : now < toMinutes(sorted[0].start)
    ? "before"
    : next
    ? "break"
    : "after";

  return {
    phase,
    current,
    elapsed: current.length ? now - toMinutes(current[0].start) : 0,
    next,
    minutesToNext: next ? toMinutes(next.start) - now : 0
  };
}
