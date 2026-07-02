import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";

interface ConnectionFavoritesState {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
}

const ConnectionFavoritesContext = createContext<ConnectionFavoritesState | null>(null);

export function ConnectionFavoritesProvider({ children }: { children: ReactNode }) {
  // Perfis de networking (pessoas/empresas) favoritados — persistente.
  const [ids, setIds] = usePersistentState<string[]>("sf_connection_favorites", []);

  const value = useMemo<ConnectionFavoritesState>(() => {
    const set = new Set(ids);
    return {
      favorites: set,
      isFavorite: (id) => set.has(id),
      toggle: (id) =>
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
      count: ids.length
    };
  }, [ids, setIds]);

  return (
    <ConnectionFavoritesContext.Provider value={value}>{children}</ConnectionFavoritesContext.Provider>
  );
}

export function useConnectionFavorites() {
  const ctx = useContext(ConnectionFavoritesContext);
  if (!ctx) throw new Error("useConnectionFavorites deve ser usado dentro de <ConnectionFavoritesProvider>");
  return ctx;
}
