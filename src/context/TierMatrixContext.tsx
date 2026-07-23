import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  DEFAULT_TIER_MATRIX,
  TIER_MATRIX_KEY,
  UNRESTRICTED,
  type TierFeatures,
  type TierMatrix
} from "@/data/tierMatrix";

interface TierMatrixState {
  matrix: TierMatrix;
  /** Grava a matriz inteira — usado pelo "Salvar alterações" do Admin. */
  save: (next: TierMatrix) => void;
  reset: () => void;
  /** Recursos liberados para uma cota. Sem cota → sem restrição. */
  featuresOf: (tier?: string) => TierFeatures;
}

const TierMatrixContext = createContext<TierMatrixState | null>(null);

export function TierMatrixProvider({ children }: { children: ReactNode }) {
  const [matrix, setMatrix] = usePersistentState<TierMatrix>(TIER_MATRIX_KEY, DEFAULT_TIER_MATRIX);

  const value = useMemo<TierMatrixState>(
    () => ({
      matrix,
      save: setMatrix,
      reset: () => setMatrix(DEFAULT_TIER_MATRIX),
      featuresOf: (tier) => matrix.find((t) => t.name === tier)?.features ?? UNRESTRICTED
    }),
    [matrix, setMatrix]
  );

  return <TierMatrixContext.Provider value={value}>{children}</TierMatrixContext.Provider>;
}

export function useTierMatrix() {
  const ctx = useContext(TierMatrixContext);
  if (!ctx) throw new Error("useTierMatrix deve ser usado dentro de <TierMatrixProvider>");
  return ctx;
}
