import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { ATTENDEES, type Attendee } from "@/data/mock";

interface CheckinState {
  attendees: Attendee[];
  credential: (id: string) => void;
  /** Alterna o check de "já bipou o QR" (feito fora da plataforma). */
  toggle: (id: string) => void;
  stats: { total: number; credentialed: number; pending: number; rate: number };
}

const CheckinContext = createContext<CheckinState | null>(null);

/**
 * Atualizadores puros no topo do módulo. Como arrows dentro do `useMemo` eles
 * empilhavam cinco níveis de closure (provider → useMemo → ação → setState →
 * map), o que o SonarQube S2004 sinaliza — e que de fato dificulta a leitura.
 */
function credenciar(prev: Attendee[], id: string): Attendee[] {
  return prev.map((a) => (a.id === id ? { ...a, status: "Credenciado" } : a));
}

function alternarCredenciamento(prev: Attendee[], id: string): Attendee[] {
  return prev.map((a) => {
    if (a.id !== id) return a;
    return { ...a, status: a.status === "Credenciado" ? "Confirmado" : "Credenciado" };
  });
}

export function CheckinProvider({ children }: Readonly<{ children: ReactNode }>) {
  // Credenciamento compartilhado: o que o Operador bipa aparece nos Relatórios.
  const [attendees, setAttendees] = usePersistentState<Attendee[]>("sf_checkin", ATTENDEES);

  const value = useMemo<CheckinState>(() => {
    const credentialed = attendees.filter((a) => a.status === "Credenciado").length;
    return {
      attendees,
      credential: (id) => setAttendees((prev) => credenciar(prev, id)),
      toggle: (id) => setAttendees((prev) => alternarCredenciamento(prev, id)),
      stats: {
        total: attendees.length,
        credentialed,
        pending: attendees.length - credentialed,
        rate: attendees.length ? Math.round((credentialed / attendees.length) * 100) : 0
      }
    };
  }, [attendees, setAttendees]);

  return <CheckinContext.Provider value={value}>{children}</CheckinContext.Provider>;
}

export function useCheckin() {
  const ctx = useContext(CheckinContext);
  if (!ctx) throw new Error("useCheckin deve ser usado dentro de <CheckinProvider>");
  return ctx;
}
