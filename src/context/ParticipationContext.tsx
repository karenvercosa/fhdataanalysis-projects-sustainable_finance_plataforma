import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";

interface Participation {
  /** IDs das sessões que o participante assistiu (play no streaming). */
  watched: string[];
  /** IDs dos materiais baixados. */
  downloads: string[];
}

interface ParticipationState extends Participation {
  markWatched: (sessionId: string) => void;
  markDownload: (contentId: string) => void;
  hasWatched: (sessionId: string) => boolean;
  reset: () => void;
}

const EMPTY: Participation = { watched: [], downloads: [] };

const ParticipationContext = createContext<ParticipationState | null>(null);

/**
 * Registra o item na lista indicada, uma vez só — assistir duas vezes não infla
 * a métrica. Fica fora do componente porque, aninhada no `useMemo`, a closure
 * chegava a cinco níveis (SonarQube S2004).
 */
function registrar(prev: Participation, key: keyof Participation, id: string): Participation {
  if (prev[key].includes(id)) return prev;
  return { ...prev, [key]: [...prev[key], id] };
}

/** Registro de participação do usuário na plataforma (palestras e downloads). */
export function ParticipationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [data, setData] = usePersistentState<Participation>("sf_participation", EMPTY);

  const value = useMemo<ParticipationState>(
    () => ({
      ...data,
      markWatched: (id) => setData((prev) => registrar(prev, "watched", id)),
      markDownload: (id) => setData((prev) => registrar(prev, "downloads", id)),
      hasWatched: (id) => data.watched.includes(id),
      reset: () => setData(EMPTY)
    }),
    [data, setData]
  );

  return <ParticipationContext.Provider value={value}>{children}</ParticipationContext.Provider>;
}

export function useParticipation() {
  const ctx = useContext(ParticipationContext);
  if (!ctx) throw new Error("useParticipation deve ser usado dentro de <ParticipationProvider>");
  return ctx;
}
