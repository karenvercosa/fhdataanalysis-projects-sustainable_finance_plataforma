import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { SESSIONS, type Session } from "@/data/mock";

export type SessionInput = Omit<Session, "id" | "favorite">;

interface SessionsState {
  sessions: Session[];
  add: (data: SessionInput) => void;
  update: (id: string, data: SessionInput) => void;
  remove: (id: string) => void;
}

const SessionsContext = createContext<SessionsState | null>(null);

// Atualizadores puros fora do componente: como arrows aninhadas no `useMemo`
// chegavam a cinco níveis de closure (SonarQube S2004).
function atualizarSessao(prev: Session[], id: string, data: SessionInput): Session[] {
  return prev.map((s) => (s.id === id ? { ...s, ...data } : s));
}

function removerSessao(prev: Session[], id: string): Session[] {
  return prev.filter((s) => s.id !== id);
}

export function SessionsProvider({ children }: Readonly<{ children: ReactNode }>) {
  // Agenda compartilhada e persistente: o que o Admin edita reflete no app.
  // Chave versionada: o modelo ganhou empresa relacionada e link ao vivo.
  const [sessions, setSessions] = usePersistentState<Session[]>("sf_sessions_v6", SESSIONS);

  const value = useMemo<SessionsState>(
    () => ({
      sessions,
      add: (data) => setSessions((prev) => [...prev, { id: crypto.randomUUID(), favorite: false, ...data }]),
      update: (id, data) => setSessions((prev) => atualizarSessao(prev, id, data)),
      remove: (id) => setSessions((prev) => removerSessao(prev, id))
    }),
    [sessions, setSessions]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions deve ser usado dentro de <SessionsProvider>");
  return ctx;
}
