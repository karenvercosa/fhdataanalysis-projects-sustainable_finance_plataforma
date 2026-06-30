import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";

interface InterestsState {
  interests: string[];
  add: (name: string) => void;
  remove: (name: string) => void;
}

// Catálogo inicial de interesses (gerido pelo admin, exibido na nuvem do onboarding).
const SEED = [
  "ESG", "Crédito de carbono", "Green bonds", "Fintech", "Investimento de impacto",
  "Energia renovável", "Agronegócio sustentável", "Governança", "Regulação",
  "Net zero", "Biodiversidade", "Economia circular"
];

const InterestsContext = createContext<InterestsState | null>(null);

export function InterestsProvider({ children }: { children: ReactNode }) {
  const [interests, setInterests] = usePersistentState<string[]>("sf_interests", SEED);

  const value = useMemo<InterestsState>(
    () => ({
      interests,
      add: (name) => {
        const v = name.trim();
        if (!v) return;
        setInterests((prev) =>
          prev.some((i) => i.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]
        );
      },
      remove: (name) => setInterests((prev) => prev.filter((i) => i !== name))
    }),
    [interests, setInterests]
  );

  return <InterestsContext.Provider value={value}>{children}</InterestsContext.Provider>;
}

export function useInterests() {
  const ctx = useContext(InterestsContext);
  if (!ctx) throw new Error("useInterests deve ser usado dentro de <InterestsProvider>");
  return ctx;
}
