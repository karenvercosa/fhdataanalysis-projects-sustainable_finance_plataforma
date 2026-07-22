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

/** Registro de participação do usuário na plataforma (palestras e downloads). */
export function ParticipationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = usePersistentState<Participation>("sf_participation", EMPTY);

  const value = useMemo<ParticipationState>(() => {
    // Cada item conta uma vez — assistir duas vezes não infla a métrica.
    const add = (key: keyof Participation) => (id: string) =>
      setData((prev) => (prev[key].includes(id) ? prev : { ...prev, [key]: [...prev[key], id] }));

    return {
      ...data,
      markWatched: add("watched"),
      markDownload: add("downloads"),
      hasWatched: (id) => data.watched.includes(id),
      reset: () => setData(EMPTY)
    };
  }, [data, setData]);

  return <ParticipationContext.Provider value={value}>{children}</ParticipationContext.Provider>;
}

export function useParticipation() {
  const ctx = useContext(ParticipationContext);
  if (!ctx) throw new Error("useParticipation deve ser usado dentro de <ParticipationProvider>");
  return ctx;
}
