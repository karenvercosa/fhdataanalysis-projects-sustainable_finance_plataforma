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

export function SessionsProvider({ children }: { children: ReactNode }) {
  // Agenda compartilhada e persistente: o que o Admin edita reflete no app.
  // Chave versionada: o modelo ganhou sobre/mediador/materiais.
  const [sessions, setSessions] = usePersistentState<Session[]>("sf_sessions_v4", SESSIONS);

  const value = useMemo<SessionsState>(
    () => ({
      sessions,
      add: (data) => setSessions((prev) => [...prev, { id: crypto.randomUUID(), favorite: false, ...data }]),
      update: (id, data) => setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s))),
      remove: (id) => setSessions((prev) => prev.filter((s) => s.id !== id))
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
