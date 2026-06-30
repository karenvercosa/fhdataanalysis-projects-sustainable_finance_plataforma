import { useEffect, useState } from "react";

/**
 * useState com persistência em localStorage.
 * Hidrata do storage na 1ª render e re-grava a cada mudança.
 * Tolerante a ambientes sem storage (private mode / SSR).
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage indisponível — ignora */
    }
  }, [key, state]);

  return [state, setState] as const;
}
