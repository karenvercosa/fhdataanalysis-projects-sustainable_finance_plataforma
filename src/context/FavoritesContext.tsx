import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { SESSIONS } from "@/data/mock";

interface FavoritesState {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
}

// Favoritos iniciais a partir do catálogo de sessões.
const INITIAL = SESSIONS.filter((s) => s.favorite).map((s) => s.id);

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = usePersistentState<string[]>("sf_favorites", INITIAL);

  const value = useMemo<FavoritesState>(() => {
    const set = new Set(ids);
    return {
      favorites: set,
      isFavorite: (id) => set.has(id),
      toggle: (id) =>
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
      count: ids.length
    };
  }, [ids, setIds]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites deve ser usado dentro de <FavoritesProvider>");
  return ctx;
}
